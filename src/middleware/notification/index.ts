import { useCallback } from 'react';
import { NotificationContext, GenerationOptions, GenerationResult } from './types';
import { buildPrompt } from './contextBuilder';
import { useSLMBridge } from './slmBridge';
import { sanitizeOutput } from './textSanitizer';
import { dispatchLocalNotification, requestNotificationPermission } from './notificationDispatcher';

/**
 * Public entry point for the middleware:
 *   context (raw) -> normalize + build prompt -> SLM -> sanitize -> (notify)
 *
 * generateNotification only produces text (preview); generateAndNotify also
 * shows a real device notification.
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

      return { notification, rawOutput, prompt, durationMs: Date.now() - startedAt };
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

      if (!result.notification) {
        console.warn('[notification] SLM returned empty text - nothing dispatched');
        return { ...result, dispatched: false };
      }

      const granted = await requestNotificationPermission();
      if (!granted) {
        console.warn('[notification] permission not granted - nothing dispatched');
        return { ...result, dispatched: false };
      }

      await dispatchLocalNotification(title, result.notification);
      return { ...result, dispatched: true };
    },
    [generateNotification]
  );

  return { generateNotification, generateAndNotify, isReady, isGenerating, interrupt };
}

export * from './types';
export { buildPrompt } from './contextBuilder';
export { normalizeContext } from './contextNormalizer';
export { VOCABULARY } from './vocabulary';
export { getTimeContext, getTimeOfDay, getDayType, getSeason } from './contextProviders';
export { formatSLMError, preloadSLM } from './slmBridge';
export { dispatchLocalNotification, requestNotificationPermission } from './notificationDispatcher';
