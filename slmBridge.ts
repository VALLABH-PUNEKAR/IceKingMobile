import { LLMModule } from 'react-native-executorch/legacy';
import { useEffect, useSyncExternalStore } from 'react';
import { GenerationOptions } from './types';

/**
 * Bridge to the on-device SLM, built on the legacy LLMModule + forward().
 *
 * Why legacy + forward(): forward(input) resets the runner and generates from
 * the raw string - no chat template - which is what a base model trained on
 * "Context: ... -> Notification:" needs. The current useLLMChatSession API
 * applies chat formatting. LLMModule is @deprecated in react-native-executorch
 * 0.10.x, so revisit this file if a future upgrade removes the /legacy subpath.
 *
 * Why a module-level singleton: the model is loaded ONCE for the whole app
 * (call preloadSLM() at startup) instead of once per screen that mounts the
 * hook. Every screen shares the same instance, and it is never deleted.
 */

// Paths are relative to this file: notification -> middleware -> src -> project root.
const MODEL_SOURCE = () => require('../../../assets/slm/model5.pte');
const TOKENIZER_SOURCE = () => require('../../../assets/slm/tokenizer.json');
const TOKENIZER_CONFIG_SOURCE = () => require('../../../assets/slm/tokenizer_config.json');

// No repetitionPenalty on purpose: the notification should repeat the product
// name and discount from the prompt, and a penalty would fight that.
const DEFAULT_GENERATION = { temperature: 0.7, topP: 0.9 };
// The bundled model has no KV cache, so each generated token recomputes the
// complete sequence. On mobile this can take longer than a short UI timeout.
const DEFAULT_TIMEOUT_MS = 120000;

type BridgeState = { isReady: boolean; isGenerating: boolean; error: string | null };

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

function getRuntimeErrorGuidance(code: number): string | undefined {
  if (code === 16) {
    return 'The .pte model requested an operation or backend that this native runtime does not support. Re-export the model with operators/backend supported by react-native-executorch@0.10.5.';
  }
  return undefined;
}

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

let model: LLMModule | null = null;
let modelPromise: Promise<LLMModule> | null = null;

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
      const guidance = getRuntimeErrorGuidance(code);
      if (guidance) {
        parts.push(guidance);
      }
    }
    if (errorRecord.cause !== undefined) {
      parts.push(`Cause: ${formatSLMError(errorRecord.cause)}`);
    }

    return parts.join('\n');
  }

  if (typeof err === 'object' && err !== null) {
    const errorRecord = err as Record<string, unknown>;
    const message = errorRecord.message ?? errorRecord.error ?? errorRecord.reason;
    const code = errorRecord.code;
    let details = message === undefined ? String(err) : String(message);

    if (message === undefined) {
      try {
        details = JSON.stringify(err) || details;
      } catch {
        // Keep the native object's string representation if it cannot be serialized.
      }
    }

    if (code === undefined) {
      return details;
    }

    const numericCode = Number(code);
    const runtimeName = Number.isInteger(numericCode)
      ? EXECUTORCH_RUNTIME_ERRORS[numericCode]
      : undefined;
    if (!runtimeName) {
      return `${details} (code=${String(code)})`;
    }

    const guidance = getRuntimeErrorGuidance(numericCode);
    return `${details}\nExecuTorch runtime error: ${runtimeName} (code=${numericCode}, hex=0x${numericCode.toString(
      16
    )})${guidance ? `\n${guidance}` : ''}`;
  }

  return String(err);
}

function loadModel(): Promise<LLMModule> {
  if (!modelPromise) {
    // LLMModule's constructor is private - fromCustomModel is the factory.
    modelPromise = LLMModule.fromCustomModel(
      MODEL_SOURCE(),
      TOKENIZER_SOURCE(),
      TOKENIZER_CONFIG_SOURCE()
    )
      .then((instance) => {
        instance.configure({ generationConfig: DEFAULT_GENERATION });
        model = instance;
        setState({ isReady: true, error: null });
        return instance;
      })
      .catch((err: unknown) => {
        modelPromise = null; // allow a later retry
        setState({ isReady: false, error: formatSLMError(err) });
        throw err;
      });
  }
  return modelPromise;
}

/** Call once at app startup (after initExecutorch) so the model is warm before first use. */
export function preloadSLM(): void {
  loadModel().catch((err) => console.warn('[SLM] preload failed:', err));
}

export function interruptSLM(): void {
  try {
    model?.interrupt();
  } catch {
    // not generating / not loaded - nothing to interrupt
  }
}

let busy = false;

/**
 * Runs one generation. forward() throws if called while another generation is
 * running, so a second concurrent call is rejected up front instead.
 */
export async function generateWithSLM(prompt: string, options: GenerationOptions = {}): Promise<string> {
  if (busy) {
    throw new Error('SLM is already generating - try again when it finishes');
  }
  busy = true;
  setState({ isGenerating: true });

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const llm = await loadModel(); // waits for the load instead of failing if still loading

    if (options.temperature !== undefined || options.topP !== undefined) {
      llm.configure({
        generationConfig: {
          ...DEFAULT_GENERATION,
          ...(options.temperature !== undefined && { temperature: options.temperature }),
          ...(options.topP !== undefined && { topP: options.topP }),
        },
      });
    }

    // Safety net against a runaway generation that never emits <|eos|>.
    timer = setTimeout(interruptSLM, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    try {
      const result = await llm.forward(prompt); // raw string in, no chat template
      setState({ error: null });
      return result.trim();
    } catch (err: unknown) {
      const details =
        `${formatSLMError(err)}\nPrompt tokens: ${llm.getPromptTokensCount()}, generated tokens: ${llm.getGeneratedTokenCount()}${
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
