import { useMemo } from "react";

interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  totalXp: number;
}

interface Badge {
  name: string;
  earnedAt: string;
}

interface UseMirriSuggestionProps {
  firstName?: string | null;
  missionsThisWeek?: number;
  missionsToday?: number;
  currentStreak?: number;
  dailyStreak?: number;
  subjectProgress?: SubjectProgress[];
  totalXp?: number;
  recentBadges?: Badge[];
}

const greetings = [
  "G'day",
  "Hey there",
  "Howdy",
  "Hi",
];

const motivationalQuotes = [
  "Practice a little every day, and you'll be amazed how much you grow! 🌱",
  "Every expert was once a beginner. Keep going! 💪",
  "Your brain is like a muscle - the more you use it, the stronger it gets! 🧠",
  "Mistakes are proof that you're trying. Don't give up! ⭐",
  "Small steps every day lead to big achievements! 🚀",
  "You're doing awesome - one question at a time! 🎯",
  "Learning is a superpower, and you've got it! 🦸",
  "Today is a great day to learn something new! ☀️",
];

export type MirriMessageType = 'streak' | 'milestone' | 'quote';

export function useMirriSuggestion({
  firstName,
  missionsThisWeek = 0,
  missionsToday = 0,
  currentStreak = 0,
  dailyStreak = 0,
  subjectProgress = [],
  totalXp = 0,
  recentBadges = [],
}: UseMirriSuggestionProps): { message: string; type: MirriMessageType } {
  return useMemo(() => {
    const name = firstName || "mate";
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    // Build a pool of possible messages with types
    const possibleMessages: { message: string; type: MirriMessageType; priority: number }[] = [];

    // Recent badge achievements (highest priority)
    if (recentBadges.length > 0) {
      const badge = recentBadges[0];
      possibleMessages.push({
        message: `${greeting}, ${name}! Congrats on earning the "${badge.name}" badge! You're crushing it! 🏅`,
        type: 'milestone',
        priority: 10,
      });
    }

    // Close to completing weekly missions
    if (missionsThisWeek === 4) {
      possibleMessages.push({
        message: `${greeting}, ${name}! Just 1 more mission to secure your weekly streak! 🔥`,
        type: 'streak',
        priority: 8,
      });
    }
    
    // Weekly goal complete
    if (missionsThisWeek >= 5) {
      possibleMessages.push({
        message: `${greeting}, ${name}! You've crushed your weekly goal! Keep building that streak! 🏆`,
        type: 'milestone',
        priority: 7,
      });
    }
    
    // Check for subjects close to leveling up
    const almostLevelUp = subjectProgress.find(s => {
      const level = Math.floor(s.totalXp / 500);
      const xpInLevel = s.totalXp % 500;
      return xpInLevel >= 400; // Within 100 XP of next level
    });
    
    if (almostLevelUp) {
      possibleMessages.push({
        message: `${greeting}, ${name}! You're so close to levelling up in ${almostLevelUp.subjectName}! Just a bit more! ⭐`,
        type: 'milestone',
        priority: 6,
      });
    }

    // XP milestones
    const xpMilestones = [100, 250, 500, 1000, 2500, 5000, 10000];
    for (const milestone of xpMilestones) {
      if (totalXp >= milestone && totalXp < milestone + 50) {
        possibleMessages.push({
          message: `${greeting}, ${name}! Wow, you've hit ${milestone.toLocaleString()} XP! That's amazing! 🎉`,
          type: 'milestone',
          priority: 5,
        });
        break;
      }
    }
    
    // Daily streak encouragement
    if (dailyStreak >= 7) {
      possibleMessages.push({
        message: `${greeting}, ${name}! A ${dailyStreak}-day streak! You're on fire! 🔥`,
        type: 'streak',
        priority: 4,
      });
    } else if (dailyStreak >= 3) {
      possibleMessages.push({
        message: `${greeting}, ${name}! ${dailyStreak} days in a row! Keep the momentum going! ⚡`,
        type: 'streak',
        priority: 3,
      });
    }
    
    // Weekly streak encouragement
    if (currentStreak > 0) {
      possibleMessages.push({
        message: `${greeting}, ${name}! You're on a ${currentStreak}-week streak! Let's keep it going! 🔥`,
        type: 'streak',
        priority: 2,
      });
    }
    
    // Default encouragements based on progress
    if (totalXp === 0) {
      possibleMessages.push({
        message: `${greeting}, ${name}! Ready to start your learning adventure? Let's go! 🎯`,
        type: 'quote',
        priority: 1,
      });
    }
    
    if (missionsToday === 0 && totalXp > 0) {
      possibleMessages.push({
        message: `${greeting}, ${name}! Time for your first mission of the day! You've got this! 💪`,
        type: 'streak',
        priority: 1,
      });
    }

    // Always add some motivational quotes as fallback
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    possibleMessages.push({
      message: `${greeting}, ${name}! ${randomQuote}`,
      type: 'quote',
      priority: 0,
    });

    // If we have high-priority messages, prefer those
    // Otherwise, randomly pick between streak updates and quotes (weighted)
    if (possibleMessages.length > 0) {
      const maxPriority = Math.max(...possibleMessages.map(m => m.priority));
      const topMessages = possibleMessages.filter(m => m.priority === maxPriority);
      
      // If top priority is 0, give slight randomization
      if (maxPriority === 0) {
        return topMessages[Math.floor(Math.random() * topMessages.length)];
      }
      
      return topMessages[0];
    }

    return { message: `${greeting}, ${name}! ${randomQuote}`, type: 'quote' as MirriMessageType };
  }, [firstName, missionsThisWeek, missionsToday, currentStreak, dailyStreak, subjectProgress, totalXp, recentBadges]);
}
