import { useMemo } from "react";

interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  totalXp: number;
}

interface UseMirriSuggestionProps {
  firstName?: string | null;
  missionsThisWeek?: number;
  currentStreak?: number;
  subjectProgress?: SubjectProgress[];
  totalXp?: number;
}

const greetings = [
  "G'day",
  "Hey there",
  "Howdy",
  "Hi",
];

const encouragements = [
  "You've got this! 💪",
  "Keep up the great work! ⭐",
  "You're doing amazing! 🌟",
  "Let's learn something awesome today! 🚀",
];

export function useMirriSuggestion({
  firstName,
  missionsThisWeek = 0,
  currentStreak = 0,
  subjectProgress = [],
  totalXp = 0,
}: UseMirriSuggestionProps): string {
  return useMemo(() => {
    const name = firstName || "mate";
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    // Check if close to completing weekly missions
    if (missionsThisWeek === 4) {
      return `${greeting}, ${name}! Just 1 more mission to secure your streak this week! 🔥`;
    }
    
    if (missionsThisWeek >= 5) {
      return `${greeting}, ${name}! You've crushed your weekly goal! Keep building that streak! 🏆`;
    }
    
    // Check for subjects close to leveling up
    const almostLevelUp = subjectProgress.find(s => {
      const level = Math.floor(s.totalXp / 500);
      const xpInLevel = s.totalXp % 500;
      return xpInLevel >= 400; // Within 100 XP of next level
    });
    
    if (almostLevelUp) {
      return `${greeting}, ${name}! You're so close to levelling up in ${almostLevelUp.subjectName}! Just a bit more practice! ⭐`;
    }
    
    // Streak encouragement
    if (currentStreak > 0) {
      return `${greeting}, ${name}! You're on a ${currentStreak}-week streak! Let's keep it going! 🔥`;
    }
    
    // Default encouragements based on progress
    if (totalXp === 0) {
      return `${greeting}, ${name}! Ready to start your learning adventure? Pick a subject below! 🎯`;
    }
    
    if (missionsThisWeek === 0) {
      return `${greeting}, ${name}! Time for your first mission of the week! ${encouragements[Math.floor(Math.random() * encouragements.length)]}`;
    }
    
    const missionsLeft = 5 - missionsThisWeek;
    return `${greeting}, ${name}! ${missionsLeft} more mission${missionsLeft === 1 ? '' : 's'} to secure your weekly streak! ${encouragements[Math.floor(Math.random() * encouragements.length)]}`;
  }, [firstName, missionsThisWeek, currentStreak, subjectProgress, totalXp]);
}
