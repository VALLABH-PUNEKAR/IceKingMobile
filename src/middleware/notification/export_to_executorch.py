"""
export_to_executorch.py

Exports the custom SLM (config.py / model.py) to an ExecuTorch .pte file
for on-device deployment (e.g. via react-native-executorch).

Usage:
    python -m V3.model.export_to_executorch \
        --checkpoint V3/checkpoints/checkpoint_latest.pt \
        --out model.pte \
        --seq_len 128 \
        --quantize

Notes:
- seq_len is only the example length used to trace the graph. It's marked
  as a dynamic dimension (see export_pte), so actual prompts of any length
  up to cfg.max_seq_len will work at inference time.
- The default export uses ExecuTorch portable operators. This avoids baking
  an XNNPACK-only partition into the .pte when the Android runtime does not
  support one of the lowered operators. Use --backend xnnpack only after
  validating that the target runtime supports the exported partition.
- This model has no KV cache (see generate.py docstring), so every
  generation step recomputes the full forward pass over the sequence so
  far. Fine for short outputs; if you add a KV cache later, this script's
  export call will need updating to also trace the cache tensors as
  inputs/outputs.
"""

import argparse
import torch

from .config import SLMConfig
from .model import SLM


def load_model(checkpoint_path, device="cpu"):
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    cfg = SLMConfig(**ckpt["config"])
    model = SLM(cfg).to(device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    return model, cfg


def quantize_model(model):
    """Optional: int8 dynamic activation + int4 weight quantization via TorchAO.
    Shrinks the model and speeds up inference; skip if you want full-precision
    output first to confirm correctness, then add this once accuracy is verified.
    """
    from torchao.quantization.quant_api import (
        quantize_,
        Int8DynamicActivationInt4WeightConfig,
    )
    quantize_(model, Int8DynamicActivationInt4WeightConfig())
    return model


def build_metadata(cfg, tokenizer_path):
    """
    Constant methods the ExecuTorch LLM runner reads from the .pte at load
    time. Without them the runner fails with errors like
    "Model did not provide any EOS token IDs via 'get_eos_ids'".

    use_kv_cache MUST be False here: the runner defaults it to True when the
    method is missing, and would then pass an extra input_pos argument that
    this no-cache export does not accept.
    """
    from tokenizers import Tokenizer

    tok = Tokenizer.from_file(tokenizer_path)
    eos_id = tok.token_to_id("<|eos|>")
    bos_id = tok.token_to_id("<|bos|>")
    if eos_id is None or bos_id is None:
        raise ValueError(f"<|eos|> / <|bos|> not found in {tokenizer_path}")

    metadata = {
        "get_bos_id": bos_id,
        "get_eos_ids": [eos_id],
        "get_max_seq_len": cfg.max_seq_len,
        "get_max_context_len": cfg.max_seq_len,
        "get_n_layers": cfg.num_layers,
        "get_vocab_size": cfg.vocab_size,
        "use_kv_cache": False,
        "use_sdpa_with_kv_cache": False,
        "enable_dynamic_shape": True,
    }
    print(f"Embedding metadata into .pte: {metadata}")
    return metadata


def export_pte(model, cfg, seq_len, out_path, tokenizer_path, backend="portable"):
    from executorch.exir import to_edge_transform_and_lower

    if not 1 <= seq_len <= cfg.max_seq_len:
        raise ValueError(
            f"--seq_len must be between 1 and cfg.max_seq_len ({cfg.max_seq_len}), "
            f"got {seq_len}"
        )

    example_tokens = torch.randint(0, cfg.vocab_size, (1, seq_len), dtype=torch.long)

    # seq_len varies at inference (prompt + generated tokens so far, up to
    # cfg.max_seq_len) so it must be dynamic, not fixed at the traced value.
    seq_len_dim = torch.export.Dim("seq_len", min=1, max=cfg.max_seq_len)
    dynamic_shapes = {"token_ids": {1: seq_len_dim}}

    exported_program = torch.export.export(
        model,
        (example_tokens,),
        dynamic_shapes=dynamic_shapes,
    )

    lower_kwargs = {
        "constant_methods": build_metadata(cfg, tokenizer_path),
    }
    if backend == "xnnpack":
        from executorch.backends.xnnpack.partition.xnnpack_partitioner import (
            XnnpackPartitioner,
        )

        lower_kwargs["partitioner"] = [XnnpackPartitioner()]

    edge_program = to_edge_transform_and_lower(exported_program, **lower_kwargs)

    executorch_program = edge_program.to_executorch()

    with open(out_path, "wb") as f:
        f.write(executorch_program.buffer)

    print(f"Wrote {out_path} ({len(executorch_program.buffer) / 1e6:.2f} MB)")


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--checkpoint", required=True,
                   help="Path to a checkpoint_step*.pt or checkpoint_latest.pt file")
    p.add_argument("--out", default="model.pte")
    p.add_argument("--seq_len", type=int, default=128,
                   help="Example prompt length used to trace the graph")
    p.add_argument("--tokenizer", required=True,
                   help="Path to tokenizer.json (used to read <|eos|>/<|bos|> ids)")
    p.add_argument(
        "--backend",
        choices=("portable", "xnnpack"),
        default="portable",
        help="Lowering backend. portable is the compatibility-first default.",
    )
    p.add_argument("--quantize", action="store_true",
                   help="Apply int8 activation / int4 weight quantization before export")
    return p.parse_args()


def main():
    args = parse_args()
    model, cfg = load_model(args.checkpoint)

    if args.quantize:
        print("Quantizing model (int8 dynamic activation, int4 weight)...")
        model = quantize_model(model)

    export_pte(model, cfg, args.seq_len, args.out, args.tokenizer, args.backend)


if __name__ == "__main__":
    main()
