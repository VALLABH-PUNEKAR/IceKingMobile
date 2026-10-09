/**
 * Derives time-based context from the device clock, so call sites don't
 * hardcode "Afternoon" / "Weekday" / "Summer". Every value returned here
 * exists in the training vocabulary.
 */

export function getTimeOfDay(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  if (h >= 21) return 'Night';
  return 'Late Night'; // 00:00-04:59
}

export function getDayType(date: Date = new Date()): string {
  const d = date.getDay();
  return d === 0 || d === 6 ? 'Weekend' : 'Weekday';
}

// Index = month (0 = January). Edit for your region - the training data also
// has "Monsoon", "Rainy" and "Festival Season".
const SEASON_BY_MONTH = [
  'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer',
  'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter',
];

export function getSeason(date: Date = new Date()): string {
  return SEASON_BY_MONTH[date.getMonth()];
}

export function getTimeContext(date: Date = new Date()) {
  return {
    time_of_day: getTimeOfDay(date),
    day_type: getDayType(date),
    season: getSeason(date),
  };
}
