import { getMasteryLevel, type MasteryLevel } from "@/lib/progressUtils";

/**
 * Dojo Belt levels based on TOTAL XP across all subjects.
 * Thresholds scaled by ~10 core topics.
 */
export const DOJO_BELT_LEVELS: MasteryLevel[] = [
  { name: "White Belt", color: "muted", colorClass: "bg-muted text-muted-foreground", minXp: 0, maxXp: 499, emoji: "🥋" },
  { name: "Yellow Belt", color: "ochre-light", colorClass: "bg-ochre-light text-ochre-foreground", minXp: 500, maxXp: 1499, emoji: "🥋" },
  { name: "Orange Belt", color: "ochre", colorClass: "bg-ochre text-ochre-foreground", minXp: 1500, maxXp: 2999, emoji: "🥋" },
  { name: "Green Belt", color: "eucalyptus-light", colorClass: "bg-eucalyptus-light text-eucalyptus-foreground", minXp: 3000, maxXp: 4999, emoji: "🥋" },
  { name: "Blue Belt", color: "sky", colorClass: "bg-sky text-sky-foreground", minXp: 5000, maxXp: 7499, emoji: "🥋" },
  { name: "Purple Belt", color: "purple", colorClass: "bg-purple-500 text-white", minXp: 7500, maxXp: 9999, emoji: "🥋" },
  { name: "Brown Belt", color: "brown", colorClass: "bg-amber-700 text-white", minXp: 10000, maxXp: 14999, emoji: "🥋" },
  { name: "Black Belt", color: "black", colorClass: "bg-gray-900 text-white", minXp: 15000, maxXp: Infinity, emoji: "🥷" },
];

export function getDojoBelt(totalXp: number): MasteryLevel {
  for (let i = DOJO_BELT_LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= DOJO_BELT_LEVELS[i].minXp) return DOJO_BELT_LEVELS[i];
  }
  return DOJO_BELT_LEVELS[0];
}

export function getNextDojoBelt(totalXp: number): MasteryLevel | null {
  const current = getDojoBelt(totalXp);
  const idx = DOJO_BELT_LEVELS.findIndex(l => l.name === current.name);
  return idx < DOJO_BELT_LEVELS.length - 1 ? DOJO_BELT_LEVELS[idx + 1] : null;
}

export function getDojoProgress(totalXp: number): number {
  const current = getDojoBelt(totalXp);
  const next = getNextDojoBelt(totalXp);
  if (!next) return 100;
  const xpInLevel = totalXp - current.minXp;
  const xpNeeded = next.minXp - current.minXp;
  return Math.min(100, Math.round((xpInLevel / xpNeeded) * 100));
}

// ── Per-subject belt (still uses topic-level mastery thresholds) ──

interface SubjectBeltInput {
  subjectId: string;
  topicIds: string[];
  progressMap: Record<string, number>;
}

export function getSubjectBelt(input: SubjectBeltInput): { level: MasteryLevel; avgXp: number; topicCount: number } {
  const { topicIds, progressMap } = input;
  if (topicIds.length === 0) return { level: getMasteryLevel(0), avgXp: 0, topicCount: 0 };
  const totalXp = topicIds.reduce((sum, id) => sum + (progressMap[id] || 0), 0);
  const avgXp = Math.round(totalXp / topicIds.length);
  return { level: getMasteryLevel(avgXp), avgXp, topicCount: topicIds.length };
}
