import { NotificationContext, CONTEXT_KEYS } from './types';
import { DEFAULT_CONTEXT } from './defaults';
import { VOCABULARY, VocabularyField } from './vocabulary';

type Field = keyof NotificationContext;

// product and emoji are open-ended: a real catalog item the model never saw
// is still better than silently swapping in a different product.
const OPEN_FIELDS: Field[] = ['product', 'emoji'];

// Common app-side wording -> the closest value that exists in training data.
// Keys are lowercase. Only consulted when the value is NOT already in the vocabulary.
const ALIASES: Partial<Record<Field, Record<string, string>>> = {
  scenario: {
    'item added to cart': 'Cart & Purchase Intent',
    'add to cart': 'Cart & Purchase Intent',
    'added to cart': 'Cart & Purchase Intent',
  },
  user_activity: {
    'adding product': 'Adding to Cart',
    'add to cart': 'Adding to Cart',
  },
  customer_type: {
    regular: 'Returning',
    repeat: 'Returning',
    existing: 'Returning',
  },
};

// Case-insensitive lookup tables, built once.
const LOOKUP: Partial<Record<Field, Map<string, string>>> = {};
for (const field of Object.keys(VOCABULARY) as VocabularyField[]) {
  LOOKUP[field] = new Map<string, string>(
    VOCABULARY[field].map((v): [string, string] => [v.toLowerCase(), v])
  );
}

function warnSubstituted(key: Field, value: string, fallback: string) {
  if (__DEV__) {
    console.warn(`[notification] ${key}="${value}" was not seen in training; using "${fallback}"`);
  }
}

function normalizeDiscount(value: string, fallback: string): string {
  // Any "NN%" is fine - digits tokenize the same way the training data did.
  const numeric = value.match(/^(\d{1,3})(?:\.\d+)?\s*%?$/);
  if (numeric) return `${numeric[1]}%`;
  return LOOKUP.discount?.get(value.toLowerCase()) ?? fallback;
}

function normalizeField(key: Field, value: string | undefined): string {
  const fallback = DEFAULT_CONTEXT[key];
  const trimmed = (value ?? '').trim();
  if (!trimmed) return fallback;

  if (key === 'discount') return normalizeDiscount(trimmed, fallback);
  if (OPEN_FIELDS.includes(key)) return trimmed;

  const lower = trimmed.toLowerCase();
  const resolved = LOOKUP[key]?.get(lower) ?? ALIASES[key]?.[lower];
  if (resolved) return resolved;

  warnSubstituted(key, trimmed, fallback);
  return fallback;
}

export function normalizeContext(raw: Partial<NotificationContext>): Required<NotificationContext> {
  const result = {} as Required<NotificationContext>;
  for (const key of CONTEXT_KEYS) {
    result[key] = normalizeField(key, raw[key]);
  }
  return result;
}
