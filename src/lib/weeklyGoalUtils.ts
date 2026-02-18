/**
 * Weekly XP Goal system utilities
 * Replaces the daily streak system with progressive weekly XP goals,
 * school holiday protection, and vacation passes.
 */

import { getSydneyWeekStart } from "./weekUtils";

// ─── Weekly XP Goal Scaling ───────────────────────────────────────────────────

export function getWeeklyXPGoal(currentStreak: number): number {
  if (currentStreak <= 0) return 500;
  if (currentStreak === 1) return 600;
  if (currentStreak === 2) return 700;
  if (currentStreak === 3) return 800;
  if (currentStreak === 4) return 900;
  return 1000; // Week 6+
}

// ─── Subject XP Multipliers ──────────────────────────────────────────────────

const SUBJECT_MULTIPLIERS: Record<string, number> = {
  english: 1.2,
  maths: 1.2,
  "science-technology": 1.0,
  geography: 1.0,
  history: 1.0,
};

export function getSubjectMultiplier(subjectSlug: string): number {
  return SUBJECT_MULTIPLIERS[subjectSlug] ?? 1.0;
}

export function applySubjectMultiplier(baseXP: number, subjectSlug: string): number {
  return Math.round(baseXP * getSubjectMultiplier(subjectSlug));
}

// ─── NSW 2026 School Term & Holiday Dates ────────────────────────────────────

interface TermDates {
  start: string; // YYYY-MM-DD
  end: string;
}

// NSW 2026 Eastern Division term dates (inclusive)
const TERMS_2026: TermDates[] = [
  { start: "2026-01-28", end: "2026-04-04" }, // Term 1
  { start: "2026-04-22", end: "2026-07-03" }, // Term 2
  { start: "2026-07-21", end: "2026-09-25" }, // Term 3
  { start: "2026-10-13", end: "2026-12-17" }, // Term 4
];

interface HolidayPeriod {
  start: string;
  end: string;
  label: string;
}

const HOLIDAYS_2026: HolidayPeriod[] = [
  { start: "2025-12-18", end: "2026-01-27", label: "Summer Holidays" },
  { start: "2026-04-05", end: "2026-04-21", label: "Autumn Holidays" },
  { start: "2026-07-04", end: "2026-07-20", label: "Winter Holidays" },
  { start: "2026-09-26", end: "2026-10-12", label: "Spring Holidays" },
];

/**
 * Check if a given Monday (week start date, YYYY-MM-DD) falls within a school
 * holiday period.
 */
export function isSchoolHolidayWeek(weekStartDate: string): boolean {
  const monday = new Date(weekStartDate + "T00:00:00");
  for (const h of HOLIDAYS_2026) {
    const hStart = new Date(h.start + "T00:00:00");
    const hEnd = new Date(h.end + "T00:00:00");
    if (monday >= hStart && monday <= hEnd) return true;
  }
  return false;
}

/**
 * Get the label for the current holiday period, or null if not in holidays.
 */
export function getHolidayLabel(weekStartDate: string): string | null {
  const monday = new Date(weekStartDate + "T00:00:00");
  for (const h of HOLIDAYS_2026) {
    const hStart = new Date(h.start + "T00:00:00");
    const hEnd = new Date(h.end + "T00:00:00");
    if (monday >= hStart && monday <= hEnd) return h.label;
  }
  return null;
}

/**
 * Check whether the current week is currently in a school holiday period.
 */
export function isCurrentWeekHoliday(): boolean {
  return isSchoolHolidayWeek(getSydneyWeekStart());
}

// ─── Term Replenishment ──────────────────────────────────────────────────────

/**
 * Check if a new term has started since the last replenish date.
 * Returns the term start date string if replenish is needed, null otherwise.
 */
export function shouldReplenishPasses(lastReplenishDate: string | null): string | null {
  const today = new Date(getSydneyWeekStart() + "T00:00:00");

  for (const term of TERMS_2026) {
    const termStart = new Date(term.start + "T00:00:00");
    // If today is on or after this term start
    if (today >= termStart) {
      // And we haven't replenished for this term yet
      if (!lastReplenishDate || new Date(lastReplenishDate + "T00:00:00") < termStart) {
        return term.start;
      }
    }
  }
  return null;
}

// ─── Weekly Reset Logic ──────────────────────────────────────────────────────

export interface WeeklyResetResult {
  newStreak: number;
  newGoal: number;
  weeklyXpEarned: number; // always resets to 0
  vacationPasses: number;
  lastTermReplenishDate: string | null;
  passConsumed: boolean;
  streakReset: boolean;
  holidayProtected: boolean;
}

/**
 * Calculate the result of a weekly reset. Called when a new week is detected.
 *
 * @param prevWeekStart The Monday of the PREVIOUS week (YYYY-MM-DD)
 * @param currentStreak Current weekly streak count
 * @param weeklyXpEarned XP earned in the previous week
 * @param weeklyXpGoal XP goal for the previous week
 * @param vacationPasses Current vacation passes remaining
 * @param lastTermReplenishDate Date of last term replenishment
 */
export function calculateWeeklyReset(
  prevWeekStart: string,
  currentStreak: number,
  weeklyXpEarned: number,
  weeklyXpGoal: number,
  vacationPasses: number,
  lastTermReplenishDate: string | null
): WeeklyResetResult {
  let newStreak = currentStreak;
  let passes = vacationPasses;
  let replenishDate = lastTermReplenishDate;
  let passConsumed = false;
  let streakReset = false;
  let holidayProtected = false;

  // Check term replenishment first
  const termReplenish = shouldReplenishPasses(replenishDate);
  if (termReplenish) {
    passes = 2;
    replenishDate = termReplenish;
  }

  const wasHoliday = isSchoolHolidayWeek(prevWeekStart);

  if (wasHoliday) {
    // Holiday week — streak protected, no pass consumed
    holidayProtected = true;
  } else if (weeklyXpEarned >= weeklyXpGoal) {
    // Goal met — streak increments
    newStreak = currentStreak + 1;
  } else {
    // Goal missed during term time
    if (passes > 0) {
      passes -= 1;
      passConsumed = true;
    } else {
      newStreak = 0;
      streakReset = true;
    }
  }

  const newGoal = getWeeklyXPGoal(newStreak);

  return {
    newStreak,
    newGoal,
    weeklyXpEarned: 0,
    vacationPasses: passes,
    lastTermReplenishDate: replenishDate,
    passConsumed,
    streakReset,
    holidayProtected,
  };
}

// ─── Progress Messages ───────────────────────────────────────────────────────

export function getWeeklyProgressMessage(earned: number, goal: number): string {
  const pct = goal > 0 ? earned / goal : 0;
  const remaining = Math.max(0, goal - earned);
  if (pct >= 1) return "Goal smashed! 🎉";
  if (pct >= 0.75) return `Almost there! ${remaining} XP to go 💪`;
  return `Keep training! ${remaining} XP to go 🥋`;
}
