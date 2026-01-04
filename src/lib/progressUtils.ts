/**
 * Mastery level and progress utilities
 */

export interface MasteryLevel {
  name: string;
  color: string;
  colorClass: string;
  minXp: number;
  maxXp: number;
  emoji: string;
}

const MASTERY_LEVELS: MasteryLevel[] = [
  { name: "Beginning", color: "ochre", colorClass: "bg-ochre text-ochre-foreground", minXp: 0, maxXp: 49, emoji: "🌱" },
  { name: "Developing", color: "sky", colorClass: "bg-sky text-sky-foreground", minXp: 50, maxXp: 149, emoji: "📚" },
  { name: "Consolidating", color: "sky-light", colorClass: "bg-sky-light text-sky-foreground", minXp: 150, maxXp: 299, emoji: "💪" },
  { name: "Extending", color: "eucalyptus", colorClass: "bg-eucalyptus text-eucalyptus-foreground", minXp: 300, maxXp: 499, emoji: "🚀" },
  { name: "Mastering", color: "eucalyptus", colorClass: "bg-eucalyptus text-eucalyptus-foreground", minXp: 500, maxXp: Infinity, emoji: "⭐" },
];

/**
 * Get the mastery level based on XP
 */
export function getMasteryLevel(xp: number): MasteryLevel {
  for (let i = MASTERY_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= MASTERY_LEVELS[i].minXp) {
      return MASTERY_LEVELS[i];
    }
  }
  return MASTERY_LEVELS[0];
}

/**
 * Get the next mastery level (returns null if at max)
 */
export function getNextMasteryLevel(xp: number): MasteryLevel | null {
  const currentLevel = getMasteryLevel(xp);
  const currentIndex = MASTERY_LEVELS.findIndex((l) => l.name === currentLevel.name);
  if (currentIndex < MASTERY_LEVELS.length - 1) {
    return MASTERY_LEVELS[currentIndex + 1];
  }
  return null;
}

/**
 * Get progress percentage toward next level (0-100)
 */
export function getProgressPercentage(xp: number): number {
  const currentLevel = getMasteryLevel(xp);
  const nextLevel = getNextMasteryLevel(xp);

  if (!nextLevel) {
    return 100; // Maxed out
  }

  const xpInLevel = xp - currentLevel.minXp;
  const xpNeededForLevel = nextLevel.minXp - currentLevel.minXp;

  return Math.min(100, Math.round((xpInLevel / xpNeededForLevel) * 100));
}

/**
 * Get XP needed to reach next level
 */
export function getXpToNextLevel(xp: number): number {
  const nextLevel = getNextMasteryLevel(xp);
  if (!nextLevel) return 0;
  return nextLevel.minXp - xp;
}

/**
 * Get the ring color class based on mastery level
 */
export function getRingColor(xp: number): string {
  const level = getMasteryLevel(xp);
  switch (level.color) {
    case "eucalyptus":
      return "stroke-eucalyptus";
    case "sky":
    case "sky-light":
      return "stroke-sky";
    default:
      return "stroke-ochre";
  }
}

/**
 * Check if topic has reached mastery level
 */
export function isMastered(xp: number): boolean {
  return xp >= 500;
}
