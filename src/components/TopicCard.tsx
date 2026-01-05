import { useState } from "react";
import { ProgressRing } from "./ProgressRing";
import { getMasteryLevel, getProgressPercentage, getRingColor, isMastered, MASTERY_LEVELS } from "@/lib/progressUtils";
import { CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  onLevelChange?: (topicId: string, newXp: number) => void;
  animationDelay?: string;
}

export function TopicCard({ topic, xpEarned, weeklyXp, onClick, onLevelChange, animationDelay }: TopicCardProps) {
  const [showLevelMenu, setShowLevelMenu] = useState(false);
  const level = getMasteryLevel(xpEarned);
  const progress = getProgressPercentage(xpEarned);
  const ringColor = getRingColor(xpEarned);
  const mastered = isMastered(xpEarned);

  const currentLevelIndex = MASTERY_LEVELS.findIndex(l => l.name === level.name);
  const canAdvance = currentLevelIndex < MASTERY_LEVELS.length - 1;
  const canGoBack = currentLevelIndex > 0;

  const handleAdvance = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canAdvance && onLevelChange) {
      const nextLevel = MASTERY_LEVELS[currentLevelIndex + 1];
      onLevelChange(topic.id, nextLevel.minXp);
    }
  };

  const handleGoBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canGoBack && onLevelChange) {
      const prevLevel = MASTERY_LEVELS[currentLevelIndex - 1];
      onLevelChange(topic.id, prevLevel.minXp);
    }
  };

  return (
    <div
      className={`topic-card w-full text-left flex items-center gap-4 animate-slide-up ${
        mastered ? "border-eucalyptus/30 bg-eucalyptus/5" : ""
      }`}
      style={{ animationDelay }}
    >
      {/* Clickable main area */}
      <button onClick={onClick} className="flex items-center gap-4 flex-grow min-w-0">
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
      </button>

      {/* Progress section */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {/* Level controls */}
        {onLevelChange && (
          <div className="flex flex-col gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md hover:bg-eucalyptus/10"
              onClick={handleAdvance}
              disabled={!canAdvance}
              title="Advance to next level"
            >
              <ChevronUp className={`w-4 h-4 ${canAdvance ? "text-eucalyptus" : "text-muted-foreground/30"}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md hover:bg-ochre/10"
              onClick={handleGoBack}
              disabled={!canGoBack}
              title="Go back a level"
            >
              <ChevronDown className={`w-4 h-4 ${canGoBack ? "text-ochre" : "text-muted-foreground/30"}`} />
            </Button>
          </div>
        )}

        {/* Progress ring */}
        <div className="flex flex-col items-center gap-1">
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
      </div>
    </div>
  );
}