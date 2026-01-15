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

export const MASTERY_LEVELS: MasteryLevel[] = [
  { name: "White Belt", color: "muted", colorClass: "bg-muted text-muted-foreground", minXp: 0, maxXp: 49, emoji: "🥋" },
  { name: "Yellow Belt", color: "ochre-light", colorClass: "bg-ochre-light text-ochre-foreground", minXp: 50, maxXp: 149, emoji: "🥋" },
  { name: "Orange Belt", color: "ochre", colorClass: "bg-ochre text-ochre-foreground", minXp: 150, maxXp: 299, emoji: "🥋" },
  { name: "Green Belt", color: "eucalyptus-light", colorClass: "bg-eucalyptus-light text-eucalyptus-foreground", minXp: 300, maxXp: 499, emoji: "🥋" },
  { name: "Blue Belt", color: "sky", colorClass: "bg-sky text-sky-foreground", minXp: 500, maxXp: 749, emoji: "🥋" },
  { name: "Purple Belt", color: "purple", colorClass: "bg-purple-500 text-white", minXp: 750, maxXp: 999, emoji: "🥋" },
  { name: "Brown Belt", color: "brown", colorClass: "bg-amber-700 text-white", minXp: 1000, maxXp: 1499, emoji: "🥋" },
  { name: "Black Belt", color: "black", colorClass: "bg-gray-900 text-white", minXp: 1500, maxXp: Infinity, emoji: "🥷" },
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
    case "muted":
      return "stroke-muted-foreground";
    case "ochre-light":
    case "ochre":
      return "stroke-ochre";
    case "eucalyptus-light":
      return "stroke-eucalyptus";
    case "sky":
      return "stroke-sky";
    case "purple":
      return "stroke-purple-500";
    case "brown":
      return "stroke-amber-700";
    case "black":
      return "stroke-gray-900";
    default:
      return "stroke-muted-foreground";
  }
}

/**
 * Check if topic has reached mastery level (Black Belt)
 */
export function isMastered(xp: number): boolean {
  return xp >= 1500;
}
