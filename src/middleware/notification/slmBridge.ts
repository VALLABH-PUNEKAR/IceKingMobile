import { loadModel, nlp, tensor, wrapAsync } from 'react-native-executorch';
import type { Model } from 'react-native-executorch';
import { Asset } from 'expo-asset';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useEffect, useSyncExternalStore } from 'react';
import { GenerationOptions } from './types';

/**
 * Bridge to the on-device SLM, built on the react-native-executorch core API
 * (loadModel + tensor + nlp.loadTokenizer) with our own generation loop.
 *
 * Why not the LLM runner: the exported model has a single `token_ids` input,
 * no KV cache and returns logits for every position, which the built-in LLM
 * runner rejects (code=16 NotSupported). Here every step feeds the full token
 * sequence to forward() and samples the next token from the last position.
 *
 * Module-level singleton: the model is loaded ONCE (call preloadSLM() at
 * startup) and never deleted.
 */

// Paths are relative to this file: notification -> middleware -> src -> project root.
const MODEL_SOURCE = () => require('../../../assets/slm/model6.pte');
const TOKENIZER_SOURCE = () => require('../../../assets/slm/tokenizer.json');

const DEFAULT_GENERATION = { temperature: 0.7, topP: 0.9 };
const DEFAULT_MAX_NEW_TOKENS = 64;
const PAD_ID = 0;
const DEFAULT_TIMEOUT_MS = 120000;
// Must match get_max_seq_len / the dynamic sequence bound of the exported .pte.
const MAX_CONTEXT = 512;
// <|pad|>, <|bos|>, <|unk|> are never valid output tokens.
const BANNED_TOKEN_IDS = new Set<number>([0, 1, 3]);
const DEFAULT_EOS_ID = 2;

type SLMGenerationOptions = GenerationOptions & { maxNewTokens?: number };
type BridgeState = { isReady: boolean; isGenerating: boolean; error: string | null };
type Tokenizer = ReturnType<typeof nlp.loadTokenizer>;
type Engine = { model: Model; tokenizer: Tokenizer; eosId: number; vocabSize: number };

const EXECUTORCH_RUNTIME_ERRORS: Record<number, string> = {
  1: 'Internal',
  2: 'InvalidState',
  3: 'EndOfMethod',
  4: 'AlreadyLoaded',
  16: 'NotSupported',
  17: 'NotImplemented',
  18: 'InvalidArgument',
  19: 'InvalidType',
  20: 'OperatorMissing',
  32: 'NotFound',
  33: 'MemoryAllocationFailed',
  34: 'AccessFailed',
  35: 'InvalidProgram',
  36: 'InvalidExternalData',
  37: 'OutOfResources',
};

let state: BridgeState = { isReady: false, isGenerating: false, error: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<BridgeState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const getSnapshot = () => state;

export function formatSLMError(err: unknown): string {
  if (err instanceof Error) {
    const errorRecord = err as Error & { code?: unknown; cause?: unknown };
    const parts = [`${err.name}: ${err.message}`];

    if (errorRecord.code !== undefined) {
      const code = Number(errorRecord.code);
      const runtimeName = Number.isInteger(code) ? EXECUTORCH_RUNTIME_ERRORS[code] : undefined;
      parts.push(
        runtimeName
          ? `ExecuTorch runtime error: ${runtimeName} (code=${code}, hex=0x${code.toString(16)})`
          : `code=${String(errorRecord.code)}`
      );
    }
    if (errorRecord.cause !== undefined) {
      parts.push(`Cause: ${formatSLMError(errorRecord.cause)}`);
    }
    return parts.join('\n');
  }

  if (typeof err === 'object' && err !== null) {
    const errorRecord = err as Record<string, unknown>;
    const message = errorRecord.message ?? errorRecord.error ?? errorRecord.reason;
    let details = message === undefined ? String(err) : String(message);
    if (message === undefined) {
      try {
        details = JSON.stringify(err) || details;
      } catch {
        // keep String(err)
      }
    }
    return errorRecord.code === undefined ? details : `${details} (code=${String(errorRecord.code)})`;
  }

  return String(err);
}

function stripFileScheme(uri: string): string {
  const path = uri.replace(/^file:\/\//, '');
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/** Turns a require()'d asset (number), a JSON module (object) or a path (string) into a local file path. */
async function toLocalPath(source: unknown, fileName: string): Promise<string> {
  if (typeof source === 'string') {
    return stripFileScheme(source);
  }
  if (typeof source === 'number') {
    const asset = Asset.fromModule(source);
    if (!asset.localUri) {
      await asset.downloadAsync();
    }
    const uri = asset.localUri ?? asset.uri;
    if (!uri) throw new Error(`Could not resolve asset ${fileName}`);
    return stripFileScheme(uri);
  }
  if (source !== null && typeof source === 'object') {
    const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;
    await ReactNativeBlobUtil.fs.writeFile(path, JSON.stringify(source), 'utf8');
    return path;
  }
  throw new Error(`Unsupported asset source for ${fileName}`);
}

let engine: Engine | null = null;
let enginePromise: Promise<Engine> | null = null;
let cancelled = false;

function loadEngine(): Promise<Engine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const [modelPath, tokenizerPath] = await Promise.all([
        toLocalPath(MODEL_SOURCE(), 'slm_model.pte'),
        toLocalPath(TOKENIZER_SOURCE(), 'slm_tokenizer.json'),
      ]);

      const tokenizer = nlp.loadTokenizer(tokenizerPath);
      let model: Model;
      try {
        model = await wrapAsync(loadModel)(modelPath);
      } catch (err) {
        tokenizer.dispose();
        throw err;
      }

      let eosId = DEFAULT_EOS_ID;
      try {
        const id = tokenizer.tokenToId('<|eos|>');
        if (typeof id === 'number' && id >= 0) eosId = id;
      } catch {
        // keep default
      }

      return { model, tokenizer, eosId, vocabSize: tokenizer.getVocabSize() };
    })()
      .then((instance) => {
        engine = instance;
        setState({ isReady: true, error: null });
        return instance;
      })
      .catch((err: unknown) => {
        enginePromise = null; // allow a later retry
        setState({ isReady: false, error: formatSLMError(err) });
        throw err;
      });
  }
  return enginePromise;
}

/** Call once at app startup (after initExecutorch) so the model is warm before first use. */
export function preloadSLM(): void {
  loadEngine().catch((err) => console.warn('[SLM] preload failed:', err));
}

export function interruptSLM(): void {
  cancelled = true;
}

function sampleToken(logits: Float32Array, temperature: number, topP: number): number {
  const size = logits.length;

  if (temperature <= 0) {
    let best = -1;
    let bestValue = -Infinity;
    for (let i = 0; i < size; i++) {
      if (BANNED_TOKEN_IDS.has(i)) continue;
      if (logits[i] > bestValue) {
        bestValue = logits[i];
        best = i;
      }
    }
    return best;
  }

  let max = -Infinity;
  for (let i = 0; i < size; i++) {
    if (!BANNED_TOKEN_IDS.has(i) && logits[i] > max) max = logits[i];
  }

  const probs = new Float64Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    if (BANNED_TOKEN_IDS.has(i)) continue;
    const p = Math.exp((logits[i] - max) / temperature);
    probs[i] = p;
    sum += p;
  }

  const order: number[] = [];
  for (let i = 0; i < size; i++) {
    if (probs[i] > 0) order.push(i);
  }
  order.sort((a, b) => probs[b] - probs[a]);

  const keep: number[] = [];
  let cumulative = 0;
  let keptSum = 0;
  for (const i of order) {
    keep.push(i);
    keptSum += probs[i];
    cumulative += probs[i] / sum;
    if (cumulative >= topP) break;
  }

  let r = Math.random() * keptSum;
  for (const i of keep) {
    r -= probs[i];
    if (r <= 0) return i;
  }
  return keep[keep.length - 1];
}

const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function runGeneration(
  eng: Engine,
  prompt: string,
  temperature: number,
  topP: number,
  maxNewTokens: number
): Promise<{ text: string; promptTokens: number; generatedTokens: number }> {
  const { model, tokenizer, eosId, vocabSize } = eng;

  const ids: number[] = Array.from(tokenizer.encode(prompt));
  // The prompt must not end in <|eos|>, or the model would stop immediately.
  while (ids.length > 0 && ids[ids.length - 1] === eosId) ids.pop();

  const promptTokens = ids.length;
  if (promptTokens === 0) throw new Error('Prompt produced no tokens');
  if (promptTokens >= MAX_CONTEXT) {
    throw new Error(`Prompt too long: ${promptTokens} tokens (max ${MAX_CONTEXT - 1})`);
  }

  const maxTotal = Math.min(MAX_CONTEXT, promptTokens + maxNewTokens);

  // The .pte schema fixes the input at [1, MAX_CONTEXT]. The model is causal, so
  // right-padding with <|pad|> does not change the logits at earlier positions.
  const input = new BigInt64Array(MAX_CONTEXT);
  input.fill(BigInt(PAD_ID));
  for (let i = 0; i < promptTokens; i++) input[i] = BigInt(ids[i]);
  const logitsBuffer = new Float32Array(MAX_CONTEXT * vocabSize);

  const tIn = tensor('int64', [1, MAX_CONTEXT], input);
  const tOut = tensor('float32', [1, MAX_CONTEXT, vocabSize]);

  try {
    while (ids.length < maxTotal) {
      if (cancelled) break;

      const n = ids.length;
      tIn.setData(input);
      model.execute('forward', [tIn], [tOut]);
      tOut.getData(logitsBuffer);
      const lastLogits = logitsBuffer.subarray((n - 1) * vocabSize, n * vocabSize);

      const next = sampleToken(lastLogits, temperature, topP);
      if (next < 0 || next === eosId) break;
      ids.push(next);
      input[n] = BigInt(next);

      await yieldToEventLoop();
    }
  } finally {
    tIn.dispose();
    tOut.dispose();
  }

  const generated = ids.slice(promptTokens);
  const text = generated.length > 0 ? tokenizer.decode(Int32Array.from(generated), true) : '';
  return { text, promptTokens, generatedTokens: generated.length };
}

let busy = false;

/**
 * Runs one generation. A second concurrent call is rejected up front.
 */
export async function generateWithSLM(
  prompt: string,
  options: SLMGenerationOptions = {}
): Promise<string> {
  if (busy) {
    throw new Error('SLM is already generating - try again when it finishes');
  }
  busy = true;
  cancelled = false;
  setState({ isGenerating: true });

  let timer: ReturnType<typeof setTimeout> | undefined;
  let promptTokens = 0;
  let generatedTokens = 0;
  try {
    const eng = await loadEngine(); // waits for the load instead of failing if still loading

    const temperature = options.temperature ?? DEFAULT_GENERATION.temperature;
    const topP = options.topP ?? DEFAULT_GENERATION.topP;
    const maxNewTokens = options.maxNewTokens ?? DEFAULT_MAX_NEW_TOKENS;

    // Safety net against a runaway generation that never emits <|eos|>.
    timer = setTimeout(interruptSLM, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    try {
      const result = await runGeneration(eng, prompt, temperature, topP, maxNewTokens);
      promptTokens = result.promptTokens;
      generatedTokens = result.generatedTokens;
      setState({ error: null });
      return result.text.trim();
    } catch (err: unknown) {
      const details = `${formatSLMError(err)}\nPrompt tokens: ${promptTokens}, generated tokens: ${generatedTokens}${
        err instanceof Error && err.stack ? `\n${err.stack}` : ''
      }`;
      setState({ error: formatSLMError(err) });
      console.error(
        `[SLM] generation failed (promptChars=${prompt.length}, promptPreview=${JSON.stringify(
          prompt.slice(0, 120)
        )})\n${details}`
      );
      throw err;
    }
  } finally {
    if (timer) clearTimeout(timer);
    busy = false;
    setState({ isGenerating: false });
  }
}

export function useSLMBridge() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    preloadSLM(); // no-op if already loading/loaded
  }, []);

  return {
    generate: generateWithSLM,
    isReady: snapshot.isReady,
    isGenerating: snapshot.isGenerating,
    error: snapshot.error,
    interrupt: interruptSLM,
  };
}
