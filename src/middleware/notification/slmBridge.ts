import { useLLM } from 'react-native-executorch';
import { useCallback } from 'react';
import { GenerationOptions } from './types';

/**
 * Thin wrapper around react-native-executorch's useLLM hook. Targets
 * react-native-executorch specifically — not llama.rn, which is a
 * different runtime with a different API. The .pte + tokenizer.json
 * pair this loads must come from export_to_executorch.py.
 *
 * ⚠️ VERIFY BEFORE SHIPPING: useLLM's generate(messages) API is built
 * for chat-style instruct models and may apply its own chat template
 * (e.g. wrapping your text in role markers) before encoding. Your SLM
 * is a base language model trained on raw "Context: ... -> Notification:"
 * continuation — not a chat format. If useLLM silently reformats the
 * prompt, output quality will degrade in ways that look like a training
 * problem but aren't. Check react-native-executorch's docs for a raw
 * completion / non-chat generate path; if none exists, you may need to
 * inspect what useLLM actually sends to the tokenizer and work around
 * the template injection, or call the lower-level runtime API directly.
 */
export function useSLMBridge() {
  const llm = useLLM({
    modelSource: require('../../../assets/model.pte'),
    tokenizerSource: require('../../../assets/tokenizer.json'),
  });

  const generate = useCallback(
    async (prompt: string, _options: GenerationOptions = {}): Promise<string> => {
      if (!llm.isReady) {
        throw new Error('SLM model is not yet loaded');
      }
      // See the warning above — confirm this does not inject a chat
      // template around `prompt` before it reaches the tokenizer.
      await llm.generate([{ role: 'user', content: prompt }]);
      return llm.response;
    },
    [llm]
  );

  return {
    generate,
    isReady: llm.isReady,
    isGenerating: llm.isGenerating,
    interrupt: llm.interrupt,
  };
}
