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

interface UseSenseiSuggestionProps {
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
  "Greetings, young warrior",
];

const motivationalQuotes = [
  "Practice a little every day, and you'll be amazed how much you grow! 🥋",
  "Every black belt was once a white belt. Keep training! 💪",
  "Your mind is your greatest weapon - train it well! 🧠",
  "In the dojo of life, mistakes are lessons in disguise! ⭐",
  "Small steps every day lead to mastery! 🚀",
  "You're doing great - one technique at a time! 🎯",
  "Discipline and practice - the way of the warrior! 🥷",
  "Today is a great day to level up! ☀️",
];

export type SenseiMessageType = 'streak' | 'milestone' | 'quote';

export function useSenseiSuggestion({
  firstName,
  missionsThisWeek = 0,
  missionsToday = 0,
  currentStreak = 0,
  dailyStreak = 0,
  subjectProgress = [],
  totalXp = 0,
  recentBadges = [],
}: UseSenseiSuggestionProps): { message: string; type: SenseiMessageType } {
  return useMemo(() => {
    const name = firstName || "young warrior";
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    // Build a pool of possible messages with types
    const possibleMessages: { message: string; type: SenseiMessageType; priority: number }[] = [];

    // Recent badge achievements (highest priority)
    if (recentBadges.length > 0) {
      const badge = recentBadges[0];
      possibleMessages.push({
        message: `${greeting}, ${name}! Congrats on earning the "${badge.name}" badge! You're a true warrior! 🏅`,
        type: 'milestone',
        priority: 10,
      });
    }

    // Close to completing weekly missions
    if (missionsThisWeek === 4) {
      possibleMessages.push({
        message: `${greeting}, ${name}! Just 1 more training session to secure your weekly streak! 🔥`,
        type: 'streak',
        priority: 8,
      });
    }
    
    // Weekly goal complete
    if (missionsThisWeek >= 5) {
      possibleMessages.push({
        message: `${greeting}, ${name}! You've completed your weekly training! Keep building that discipline! 🏆`,
        type: 'milestone',
        priority: 7,
      });
    }
    
    // Check for subjects close to leveling up (belt promotion)
    const almostBeltUp = subjectProgress.find(s => {
      const xpInLevel = s.totalXp % 500;
      return xpInLevel >= 400; // Within 100 XP of next belt
    });
    
    if (almostBeltUp) {
      possibleMessages.push({
        message: `${greeting}, ${name}! You're so close to your next belt in ${almostBeltUp.subjectName}! Keep training! 🥋`,
        type: 'milestone',
        priority: 6,
      });
    }

    // XP milestones
    const xpMilestones = [100, 250, 500, 1000, 2500, 5000, 10000];
    for (const milestone of xpMilestones) {
      if (totalXp >= milestone && totalXp < milestone + 50) {
        possibleMessages.push({
          message: `${greeting}, ${name}! Wow, you've earned ${milestone.toLocaleString()} XP! That's impressive discipline! 🎉`,
          type: 'milestone',
          priority: 5,
        });
        break;
      }
    }
    
    // Daily streak encouragement
    if (dailyStreak >= 7) {
      possibleMessages.push({
        message: `${greeting}, ${name}! A ${dailyStreak}-day training streak! The way of the warrior! 🔥`,
        type: 'streak',
        priority: 4,
      });
    } else if (dailyStreak >= 3) {
      possibleMessages.push({
        message: `${greeting}, ${name}! ${dailyStreak} days of training in a row! Keep the discipline! ⚡`,
        type: 'streak',
        priority: 3,
      });
    }
    
    // Weekly streak encouragement
    if (currentStreak > 0) {
      possibleMessages.push({
        message: `${greeting}, ${name}! You're on a ${currentStreak}-week training streak! True warrior spirit! 🔥`,
        type: 'streak',
        priority: 2,
      });
    }
    
    // Default encouragements based on progress
    if (totalXp === 0) {
      possibleMessages.push({
        message: `${greeting}, ${name}! Ready to begin your training? Let's enter the dojo! 🎯`,
        type: 'quote',
        priority: 1,
      });
    }
    
    if (missionsToday === 0 && totalXp > 0) {
      possibleMessages.push({
        message: `${greeting}, ${name}! Time for your first training session of the day! 💪`,
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
    if (possibleMessages.length > 0) {
      const maxPriority = Math.max(...possibleMessages.map(m => m.priority));
      const topMessages = possibleMessages.filter(m => m.priority === maxPriority);
      
      if (maxPriority === 0) {
        return topMessages[Math.floor(Math.random() * topMessages.length)];
      }
      
      return topMessages[0];
    }

    return { message: `${greeting}, ${name}! ${randomQuote}`, type: 'quote' as SenseiMessageType };
  }, [firstName, missionsThisWeek, missionsToday, currentStreak, dailyStreak, subjectProgress, totalXp, recentBadges]);
}
