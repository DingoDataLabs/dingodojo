import { useMemo } from "react";

interface TopicProgress {
  topicId: string;
  topicName: string;
  topicSlug: string;
  subjectSlug: string;
  subjectName: string;
  xpEarned: number;
}

interface UseSmartMissionProps {
  topicProgress: TopicProgress[];
}

interface SmartMissionResult {
  topicId: string;
  topicName: string;
  topicSlug: string;
  subjectSlug: string;
  subjectName: string;
  xpEarned: number;
  reason: 'level-up' | 'lowest-xp' | 'random';
  reasonText: string;
}

export function useSmartMission({ topicProgress }: UseSmartMissionProps): SmartMissionResult | null {
  return useMemo(() => {
    if (topicProgress.length === 0) return null;

    // First priority: Find topics close to leveling up (within 100 XP of next level boundary)
    const levelUpCandidates = topicProgress.filter(t => {
      const xpInCurrentLevel = t.xpEarned % 500;
      // Close to next level (within 100 XP) but not at 0
      return xpInCurrentLevel >= 400 || (t.xpEarned > 0 && xpInCurrentLevel >= 350);
    });

    if (levelUpCandidates.length > 0) {
      // Pick the one closest to leveling up
      const closest = levelUpCandidates.reduce((prev, curr) => {
        const prevToNext = 500 - (prev.xpEarned % 500);
        const currToNext = 500 - (curr.xpEarned % 500);
        return currToNext < prevToNext ? curr : prev;
      });

      const xpNeeded = 500 - (closest.xpEarned % 500);
      return {
        ...closest,
        reason: 'level-up',
        reasonText: `Just ${xpNeeded} XP to level up!`,
      };
    }

    // Second priority: Find the topic with lowest XP (keep progress well-rounded)
    const lowestXp = topicProgress.reduce((prev, curr) => 
      curr.xpEarned < prev.xpEarned ? curr : prev
    );

    return {
      ...lowestXp,
      reason: 'lowest-xp',
      reasonText: lowestXp.xpEarned === 0 
        ? `Start your ${lowestXp.subjectName} journey!` 
        : 'Keep your progress balanced!',
    };
  }, [topicProgress]);
}
