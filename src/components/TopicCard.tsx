import { ProgressRing } from "./ProgressRing";
import { getMasteryLevel, getProgressPercentage, getRingColor, isMastered } from "@/lib/progressUtils";
import { CheckCircle2 } from "lucide-react";

interface TopicCardProps {
  topic: {
    id: string;
    name: string;
    slug: string;
    emoji: string;
    description: string | null;
  };
  xpEarned: number;
  weeklyXp: number;
  onClick: () => void;
  animationDelay?: string;
}

export function TopicCard({ topic, xpEarned, weeklyXp, onClick, animationDelay }: TopicCardProps) {
  const level = getMasteryLevel(xpEarned);
  const progress = getProgressPercentage(xpEarned);
  const ringColor = getRingColor(xpEarned);
  const mastered = isMastered(xpEarned);

  return (
    <button
      onClick={onClick}
      className={`topic-card w-full text-left flex items-center gap-4 animate-slide-up ${
        mastered ? "border-eucalyptus/30 bg-eucalyptus/5" : ""
      }`}
      style={{ animationDelay }}
    >
      {/* Emoji */}
      <div className="text-4xl flex-shrink-0">{topic.emoji}</div>

      {/* Topic info */}
      <div className="flex-grow min-w-0">
        <h3 className="text-lg font-display font-bold text-foreground truncate">
          {topic.name}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          {/* Level badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${level.colorClass}`}
          >
            {level.emoji} {level.name}
          </span>
          {/* Total XP */}
          <span className="text-xs text-muted-foreground">{xpEarned} XP</span>
        </div>
      </div>

      {/* Progress section */}
      <div className="flex-shrink-0 flex flex-col items-center gap-1">
        {mastered ? (
          <CheckCircle2 className="w-10 h-10 text-eucalyptus" />
        ) : (
          <ProgressRing progress={progress} size={40} strokeWidth={4} colorClass={ringColor}>
            <span className="text-xs font-bold text-foreground">{progress}%</span>
          </ProgressRing>
        )}
        {weeklyXp > 0 && (
          <span className="text-xs text-eucalyptus font-medium">+{weeklyXp} this week</span>
        )}
      </div>
    </button>
  );
}
