const EOS_TOKEN = '<|eos|>';

/**
 * Cleans raw model output: strips the echoed prompt if the runtime
 * returns prompt+completion together, cuts everything from the EOS
 * marker onward, trims whitespace, and collapses stray double spaces.
 *
 * This is plain-text cleanup, not JSON parsing — the model was trained
 * to continue free text after "Notification:", not to emit structured
 * output.
 */
export function sanitizeOutput(rawOutput: string, prompt: string): string {
  let text = rawOutput;

  if (text.startsWith(prompt)) {
    text = text.slice(prompt.length);
  }

  const eosIndex = text.indexOf(EOS_TOKEN);
  if (eosIndex !== -1) {
    text = text.slice(0, eosIndex);
  }

  return text.trim().replace(/\s+/g, ' ');
}
