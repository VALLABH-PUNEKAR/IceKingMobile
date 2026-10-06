import { NotificationContext, CONTEXT_KEYS } from './types';
import { DEFAULT_CONTEXT } from './defaults';

/**
 * The closed vocabulary your tokenizer was trained on, per field.
 *
 * IMPORTANT: this must be kept in sync with the actual categorical
 * values present in your training CSV (all.csv). A value outside this
 * list gets mapped to a trained default rather than passed through raw
 * — an out-of-vocabulary string in this field position is something
 * the model has never seen, and silently degrades output quality the
 * way we saw with "Chennai" and invented product names earlier.
 *
 * Fields left as [] are open-ended (product names, discount percentages,
 * emoji) and pass through unvalidated — tighten these if you see quality
 * issues tied to a specific field.
 */
export const ALLOWED_VALUES: Record<keyof NotificationContext, string[]> = {
  scenario: ['New Flavor', 'Seasonal Flavor', 'Discounts & Promotions', 'General Update', 'Cart Abandoned'],
  product: [],
  category: ['Ice Cream', 'Beverages', 'Snacks', 'General'],
  customer_type: ['New', 'Returning'],
  user_activity: ['Browsing', 'App Open', 'Cart Abandoned', 'Checkout'],
  time_of_day: ['Morning', 'Afternoon', 'Evening', 'Night'],
  day_type: ['Weekday', 'Weekend'],
  season: ['Spring', 'Summer', 'Autumn', 'Winter'],
  weather: ['Clear', 'Hot', 'Cold', 'Rainy'],
  discount: [],
  urgency: ['Low', 'Medium', 'High'],
  tone: ['Friendly', 'Exciting', 'Playful', 'Urgent'],
  emoji: [],
};

function normalizeField(key: keyof NotificationContext, value: string | undefined): string {
  const fallback = DEFAULT_CONTEXT[key];
  if (!value) return fallback;

  const allowed = ALLOWED_VALUES[key];
  if (allowed.length === 0) return value; // open-ended field, pass through

  const match = allowed.find((v) => v.toLowerCase() === value.toLowerCase());
  return match ?? fallback;
}

export function normalizeContext(raw: Partial<NotificationContext>): Required<NotificationContext> {
  const result = {} as Required<NotificationContext>;
  for (const key of CONTEXT_KEYS) {
    result[key] = normalizeField(key, raw[key]);
  }
  return result;
}
