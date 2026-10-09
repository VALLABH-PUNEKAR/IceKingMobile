export interface NotificationContext {
  scenario?: string;
  product?: string;
  category?: string;
  customer_type?: string;
  user_activity?: string;
  time_of_day?: string;
  day_type?: string;
  season?: string;
  weather?: string;
  discount?: string;
  urgency?: string;
  tone?: string;
  emoji?: string;
}

// Order matters - must match the exact field order tokenizer.py used when
// building "Context: k=v, k=v, ..." strings during training.
export const CONTEXT_KEYS: (keyof NotificationContext)[] = [
  'scenario',
  'product',
  'category',
  'customer_type',
  'user_activity',
  'time_of_day',
  'day_type',
  'season',
  'weather',
  'discount',
  'urgency',
  'tone',
  'emoji',
];

/**
 * Sampling options the ExecuTorch runtime actually exposes. There is no
 * maxNewTokens / topK: generation stops at <|eos|> (or max_seq_len), so
 * timeoutMs is the safety net against a runaway generation.
 */
export interface GenerationOptions {
  temperature?: number;
  topP?: number;
  timeoutMs?: number;
}

export interface GenerationResult {
  notification: string;
  rawOutput: string;
  prompt: string;
  durationMs: number;
  /** Only set by generateAndNotify: whether a device notification was shown. */
  dispatched?: boolean;
}
