import { NotificationContext } from './types';

// Used when a field is missing or isn't a value the model saw in training
// (see contextNormalizer.ts). Every value here must exist in vocabulary.ts -
// 'scenario' is deliberately a neutral one that makes no discount/cart claims.
export const DEFAULT_CONTEXT: Required<NotificationContext> = {
  scenario: 'Trends & Recommendations',
  product: 'Coffee Toffee Crunch',
  category: 'Ice Cream',
  customer_type: 'Returning',
  user_activity: 'App Open',
  time_of_day: 'Afternoon',
  day_type: 'Weekday',
  season: 'Summer',
  weather: 'Clear',
  discount: '0%',
  urgency: 'Low',
  tone: 'Friendly',
  emoji: '🍦',
};
