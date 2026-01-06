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
      className={`topic-card-refined animate-slide-up ${
        mastered ? "topic-card-mastered" : ""
      }`}
      style={{ animationDelay }}
    >
      {/* Clickable main area */}
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 py-3 px-4">
        {/* Emoji */}
        <span className="text-2xl flex-shrink-0">{topic.emoji}</span>

        {/* Topic info */}
        <div className="flex-1 min-w-0 text-left">
          <h3 className="text-base font-display font-bold text-foreground truncate leading-tight">
            {topic.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${level.colorClass}`}
            >
              {level.emoji} {level.name}
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">{xpEarned} XP</span>
          </div>
        </div>
      </button>

      {/* Right section - Progress & Controls */}
      <div className="flex items-center gap-1 pr-3 flex-shrink-0">
        {/* Level controls */}
        {onLevelChange && (
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded hover:bg-eucalyptus/10"
              onClick={handleAdvance}
              disabled={!canAdvance}
              title="Advance to next level"
            >
              <ChevronUp className={`w-3.5 h-3.5 ${canAdvance ? "text-eucalyptus" : "text-muted-foreground/20"}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded hover:bg-ochre/10"
              onClick={handleGoBack}
              disabled={!canGoBack}
              title="Go back a level"
            >
              <ChevronDown className={`w-3.5 h-3.5 ${canGoBack ? "text-ochre" : "text-muted-foreground/20"}`} />
            </Button>
          </div>
        )}

        {/* Progress ring */}
        <div className="flex flex-col items-center">
          {mastered ? (
            <CheckCircle2 className="w-8 h-8 text-eucalyptus" />
          ) : (
            <ProgressRing progress={progress} size={32} strokeWidth={3} colorClass={ringColor}>
              <span className="text-[9px] font-bold text-foreground">{progress}%</span>
            </ProgressRing>
          )}
          {weeklyXp > 0 && (
            <span className="text-[9px] text-eucalyptus font-semibold mt-0.5">+{weeklyXp}</span>
          )}
        </div>
      </div>
    </div>
  );
}