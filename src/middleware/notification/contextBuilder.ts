import { NotificationContext, CONTEXT_KEYS } from './types';
import { normalizeContext } from './contextNormalizer';

/**
 * Builds a prompt string identical in format to what tokenizer.py /
 * build_prompt.py used during training:
 *
 *   "Context: k=v, k=v, ... -> Notification:"
 *
 * The model continues generating from right after "Notification:" —
 * this function hands back everything up to and including that marker.
 */
export function buildPrompt(rawContext: Partial<NotificationContext>): string {
  const ctx = normalizeContext(rawContext);
  const ctxStr = CONTEXT_KEYS.map((k) => `${k}=${ctx[k]}`).join(', ');
  return `Context: ${ctxStr} -> Notification:`;
}
