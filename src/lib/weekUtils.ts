/**
 * Sydney timezone week utilities
 * Week runs Monday 00:00 to Sunday 23:59 Sydney time
 */

// Sydney is UTC+10 (AEST) or UTC+11 (AEDT during daylight saving)
// Daylight saving runs from first Sunday in October to first Sunday in April
function getSydneyOffset(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const dayOfMonth = date.getUTCDate();
  const dayOfWeek = date.getUTCDay();

  // Calculate first Sunday of October
  const octFirst = new Date(Date.UTC(year, 9, 1));
  const octFirstSunday = 1 + ((7 - octFirst.getUTCDay()) % 7);

  // Calculate first Sunday of April
  const aprFirst = new Date(Date.UTC(year, 3, 1));
  const aprFirstSunday = 1 + ((7 - aprFirst.getUTCDay()) % 7);

  // Check if we're in daylight saving time (AEDT = UTC+11)
  // DST starts first Sunday of October at 2am, ends first Sunday of April at 3am
  const isDST =
    (month > 9 || month < 3) || // Nov-Feb always DST
    (month === 9 && dayOfMonth >= octFirstSunday) || // October after first Sunday
    (month === 3 && dayOfMonth < aprFirstSunday); // April before first Sunday

  return isDST ? 11 : 10;
}

function toSydneyDate(date: Date): Date {
  const offset = getSydneyOffset(date);
  return new Date(date.getTime() + offset * 60 * 60 * 1000);
}

/**
 * Get the Monday of the current Sydney week as a date string (YYYY-MM-DD)
 */
export function getSydneyWeekStart(): string {
  const now = new Date();
  const sydneyNow = toSydneyDate(now);

  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = sydneyNow.getUTCDay();

  // Calculate days to subtract to get to Monday
  // If Sunday (0), subtract 6 days. Otherwise subtract (dayOfWeek - 1)
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const monday = new Date(sydneyNow);
  monday.setUTCDate(monday.getUTCDate() - daysToSubtract);

  // Return as YYYY-MM-DD format
  return monday.toISOString().split("T")[0];
}

/**
 * Check if the stored week start date is from a previous week
 */
export function isNewWeek(lastWeekStart: string | null): boolean {
  if (!lastWeekStart) return true;
  const currentWeekStart = getSydneyWeekStart();
  return lastWeekStart !== currentWeekStart;
}

/**
 * Calculate how many more missions are needed to maintain streak
 */
export function getMissionsRemaining(completedCount: number): number {
  const required = 5;
  return Math.max(0, required - completedCount);
}

/**
 * Check if streak requirement is met
 */
export function isStreakSecured(missionsThisWeek: number): boolean {
  return missionsThisWeek >= 5;
}

/**
 * Get a friendly message about streak status
 */
export function getStreakMessage(missionsThisWeek: number): string {
  const remaining = getMissionsRemaining(missionsThisWeek);
  if (remaining === 0) {
    return "Streak secured! 🔥";
  } else if (remaining === 1) {
    return "1 more to keep your streak!";
  } else {
    return `${remaining} more to keep your streak`;
  }
}
