// Daily streak and mission tracking utilities
// Uses Sydney timezone (AEST/AEDT)

/**
 * Get Sydney timezone offset in minutes
 */
const getSydneyOffset = (date: Date): number => {
  // Sydney is UTC+10 (AEST) or UTC+11 (AEDT during daylight saving)
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  const isDST = date.getTimezoneOffset() < stdOffset;
  
  // Sydney: AEST = UTC+10, AEDT = UTC+11
  // We need to determine if Sydney is in DST
  const month = date.getMonth();
  const day = date.getDate();
  const hour = date.getUTCHours();
  
  // DST in Sydney: First Sunday of October to First Sunday of April
  const isOctToMar = month >= 9 || month <= 2;
  const sydneyIsDST = isOctToMar;
  
  return sydneyIsDST ? -660 : -600; // -660 = UTC+11, -600 = UTC+10
};

/**
 * Convert a date to Sydney time
 */
const toSydneyDate = (date: Date): Date => {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const sydneyOffset = getSydneyOffset(date);
  return new Date(utc - sydneyOffset * 60000);
};

/**
 * Get today's date in Sydney timezone as YYYY-MM-DD
 */
export const getSydneyToday = (): string => {
  const now = new Date();
  const sydneyNow = toSydneyDate(now);
  
  const year = sydneyNow.getFullYear();
  const month = String(sydneyNow.getMonth() + 1).padStart(2, '0');
  const day = String(sydneyNow.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Check if the given date is a new day in Sydney timezone
 */
export const isNewDay = (lastMissionDate: string | null): boolean => {
  if (!lastMissionDate) return true;
  return lastMissionDate !== getSydneyToday();
};

/**
 * Check if the user was active yesterday (for streak continuation)
 */
export const wasActiveYesterday = (lastMissionDate: string | null): boolean => {
  if (!lastMissionDate) return false;
  
  const today = new Date(getSydneyToday());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  return lastMissionDate === yesterdayStr;
};

/**
 * Calculate the new daily streak
 */
export const calculateDailyStreak = (
  currentStreak: number,
  lastMissionDate: string | null
): number => {
  const today = getSydneyToday();
  
  if (!lastMissionDate) {
    // First mission ever
    return 1;
  }
  
  if (lastMissionDate === today) {
    // Already completed a mission today, no change
    return currentStreak;
  }
  
  if (wasActiveYesterday(lastMissionDate)) {
    // Streak continues
    return currentStreak + 1;
  }
  
  // Streak broken - start fresh
  return 1;
};

/**
 * Get missions remaining for Explorer tier (2 per day)
 */
export const getDailyMissionsRemaining = (missionsToday: number): number => {
  return Math.max(0, 2 - missionsToday);
};

/**
 * Check if daily mission limit is reached for Explorer
 */
export const isDailyLimitReached = (missionsToday: number): boolean => {
  return missionsToday >= 2;
};

/**
 * Get streak message for daily streak
 */
export const getDailyStreakMessage = (streak: number): string => {
  if (streak === 0) return "Start your streak today!";
  if (streak === 1) return "1 day - Great start!";
  if (streak < 7) return `${streak} days - Keep it up!`;
  if (streak < 30) return `${streak} days - On fire! 🔥`;
  if (streak < 100) return `${streak} days - Incredible! 💪`;
  return `${streak} days - LEGENDARY! 🌟`;
};
