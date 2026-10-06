import { useCallback } from 'react';
import { NotificationContext, GenerationOptions, GenerationResult } from './types';
import { buildPrompt } from './contextBuilder';
import { useSLMBridge } from './slmBridge';
import { sanitizeOutput } from './textSanitizer';
import { dispatchLocalNotification, requestNotificationPermission } from './notificationDispatcher';

/**
 * Public entry point for the middleware. Wires together:
 *   context (raw) -> normalize + build prompt -> SLM -> sanitize -> result
 *
 * Generation and dispatch are kept as separate steps internally
 * (generateNotification vs dispatchLocalNotification) so the UI can
 * preview SLM output before firing a real device notification, but
 * generateAndNotify below does both in one call for the common case.
 */
export function useNotificationGenerator() {
  const { generate, isReady, isGenerating, interrupt } = useSLMBridge();

  const generateNotification = useCallback(
    async (
      context: Partial<NotificationContext>,
      options?: GenerationOptions
    ): Promise<GenerationResult> => {
      const prompt = buildPrompt(context);
      const startedAt = Date.now();

      const rawOutput = await generate(prompt, options);
      const notification = sanitizeOutput(rawOutput, prompt);

      return {
        notification,
        rawOutput,
        prompt,
        durationMs: Date.now() - startedAt,
      };
    },
    [generate]
  );

  const generateAndNotify = useCallback(
    async (
      context: Partial<NotificationContext>,
      title: string,
      options?: GenerationOptions
    ): Promise<GenerationResult> => {
      const result = await generateNotification(context, options);
      await requestNotificationPermission();
      await dispatchLocalNotification(title, result.notification);
      return result;
    },
    [generateNotification]
  );

  return { generateNotification, generateAndNotify, isReady, isGenerating, interrupt };
}

export * from './types';
export { buildPrompt } from './contextBuilder';
export { normalizeContext, ALLOWED_VALUES } from './contextNormalizer';
export { dispatchLocalNotification, requestNotificationPermission } from './notificationDispatcher';
