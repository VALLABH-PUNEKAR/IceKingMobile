import { NotificationContext } from './types';

// Used whenever a field is missing or fails vocabulary validation in
// contextNormalizer.ts. Keep these values inside ALLOWED_VALUES for
// each field, or they'll themselves be out-of-vocabulary.
export const DEFAULT_CONTEXT: Required<NotificationContext> = {
  scenario: 'General Update',
  product: 'our app',
  category: 'General',
  customer_type: 'Returning',
  user_activity: 'App Open',
  time_of_day: 'Afternoon',
  day_type: 'Weekday',
  season: 'Spring',
  weather: 'Clear',
  discount: '0%',
  urgency: 'Low',
  tone: 'Friendly',
  emoji: '🔔',
};
