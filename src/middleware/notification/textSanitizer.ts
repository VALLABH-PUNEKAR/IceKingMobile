const EOS_TOKEN = '<|eos|>';

// Emoji outside the BMP are encoded as UTF-16 surrogate pairs.
const SURROGATE_PAIR = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;
// Incomplete emoji bytes decode to U+FFFD; lone surrogates are broken halves.
const BROKEN_CHARS = /\uFFFD+|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

// Mentions of a zero discount, e.g. "0% off", "0% discount", "discount of 0%", "no discount".
const ZERO_DISCOUNT_MENTION =
  /\b0(?:\.0+)?\s*%\s*(?:off|discount)|\b(?:discount|off)\s*(?:of|:)?\s*0(?:\.0+)?\s*%|\bno\s+discount\b/i;
// The prompt says there is no discount: "discount=0%", "discount=0", "discount=none".
const PROMPT_HAS_NO_DISCOUNT = /discount=\s*(?:0(?:\.0+)?\s*%?|none|no)\s*(?:,|\s->|$)/i;

/** Removes any mention of a zero discount when the prompt has no discount. */
function dropZeroDiscount(text: string, prompt: string): string {
  if (!PROMPT_HAS_NO_DISCOUNT.test(prompt) || !ZERO_DISCOUNT_MENTION.test(text)) {
    return text;
  }

  // Prefer dropping whole sentences that mention it, as long as something remains.
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const kept = sentences.filter((s) => !ZERO_DISCOUNT_MENTION.test(s));
  if (kept.length > 0) {
    return kept.join('').trim();
  }

  // Otherwise cut just the phrase.
  return text
    .replace(new RegExp(ZERO_DISCOUNT_MENTION.source, 'gi'), '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .trim();
}

/** Pulls the "emoji=..." value out of the prompt, if there is one. */
function extractPromptEmoji(prompt: string): string | undefined {
  const match = /emoji=([^,]*?)(?:,|\s->|$)/.exec(prompt);
  const value = match?.[1]?.trim();
  return value && SURROGATE_PAIR.test(value) ? value : undefined;
}

/**
 * Cleans raw model output into a single plain-text notification body.
 *
 * Plain-text cleanup, not JSON parsing - the model was trained to continue
 * free text after "Notification:", not to emit structured output.
 *
 * Emoji are kept. Broken emoji fragments are removed, and if the model
 * produced no emoji at all, the one from the prompt's "emoji=" field is
 * appended so the notification always has it.
 */
export function sanitizeOutput(rawOutput: string, prompt: string): string {
  let text = rawOutput;

  // Some runtimes echo the prompt back with the completion.
  if (text.startsWith(prompt)) {
    text = text.slice(prompt.length);
  }

  // Cut at the first sign the model finished or started a new example:
  // the EOS marker, a newline, or a fresh "Context:" block.
  const cutPoints = [EOS_TOKEN, '\n', 'Context:']
    .map((marker) => text.indexOf(marker))
    .filter((i) => i !== -1);
  if (cutPoints.length > 0) {
    text = text.slice(0, Math.min(...cutPoints));
  }

  const cleaned = dropZeroDiscount(
    text
      .replace(BROKEN_CHARS, '')
      .replace(/^\s*Notification:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim(),
    prompt
  );

  if (!cleaned || SURROGATE_PAIR.test(cleaned)) {
    return cleaned;
  }

  const promptEmoji = extractPromptEmoji(prompt);
  return promptEmoji ? `${cleaned} ${promptEmoji}` : cleaned;
}
