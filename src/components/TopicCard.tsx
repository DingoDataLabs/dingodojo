import { useState } from "react";
import { ProgressRing } from "./ProgressRing";
import { getMasteryLevel, getProgressPercentage, getRingColor, isMastered, getXpToNextLevel, MASTERY_LEVELS } from "@/lib/progressUtils";
import { CheckCircle2, ChevronUp, ChevronDown, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const level = getMasteryLevel(xpEarned);
  const progress = getProgressPercentage(xpEarned);
  const ringColor = getRingColor(xpEarned);
  const mastered = isMastered(xpEarned);
  const xpToNext = getXpToNextLevel(xpEarned);

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
      className={`group relative bg-card rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] animate-slide-up overflow-hidden ${
        mastered 
          ? "border-eucalyptus/50 bg-gradient-to-r from-eucalyptus/5 to-eucalyptus/10" 
          : "border-border hover:border-primary/30"
      }`}
      style={{ animationDelay }}
    >
      {/* Mastery celebration effect */}
      {mastered && (
        <div className="absolute top-2 right-2 z-10">
          <Sparkles className="w-5 h-5 text-eucalyptus animate-pulse" />
        </div>
      )}

      {/* Main clickable area */}
      <button 
        onClick={onClick} 
        className="w-full text-left p-4 sm:p-5 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-2xl"
      >
        <div className="flex items-start gap-4">
          {/* Left: Emoji & Info */}
          <div className="flex-1 min-w-0">
            {/* Topic header row */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl sm:text-5xl flex-shrink-0 group-hover:animate-wiggle">
                {topic.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-xl font-display font-bold text-foreground truncate leading-tight mb-1">
                  {topic.name}
                </h3>
                {topic.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1 hidden sm:block">
                    {topic.description}
                  </p>
                )}
              </div>
            </div>

            {/* Level badge & stats row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Level badge - prominent */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm ${level.colorClass}`}
              >
                <span className="text-base">{level.emoji}</span>
                <span>{level.name}</span>
              </span>

              {/* XP display */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-sm font-semibold text-foreground">
                <Zap className="w-4 h-4 text-ochre" />
                <span>{xpEarned} XP</span>
              </div>

              {/* Weekly XP boost indicator */}
              {weeklyXp > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-eucalyptus/10 text-eucalyptus text-sm font-bold">
                  +{weeklyXp} this week
                </span>
              )}
            </div>

            {/* Progress info - only show if not mastered */}
            {!mastered && xpToNext > 0 && (
              <div className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{xpToNext} XP</span> to next level
              </div>
            )}
          </div>

          {/* Right: Progress visualization */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            {mastered ? (
              <div className="relative">
                <CheckCircle2 className="w-14 h-14 sm:w-16 sm:h-16 text-eucalyptus drop-shadow-md" />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold text-eucalyptus bg-eucalyptus/10 px-2 py-0.5 rounded-full">
                  Mastered!
                </span>
              </div>
            ) : (
              <ProgressRing 
                progress={progress} 
                size={56} 
                strokeWidth={5} 
                colorClass={ringColor}
              >
                <span className="text-sm font-bold text-foreground">{progress}%</span>
              </ProgressRing>
            )}
          </div>
        </div>
      </button>

      {/* Level adjustment controls - shown at bottom when available */}
      {onLevelChange && (
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-border/50 bg-muted/30">
          <span className="text-xs text-muted-foreground font-medium">Adjust difficulty:</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className={`h-8 px-3 rounded-full text-xs font-semibold transition-all ${
                canGoBack 
                  ? "hover:bg-ochre/10 hover:border-ochre hover:text-ochre" 
                  : "opacity-40 cursor-not-allowed"
              }`}
              onClick={handleGoBack}
              disabled={!canGoBack}
              title="Previous level"
            >
              <ChevronDown className="w-4 h-4 mr-1" />
              Easier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 px-3 rounded-full text-xs font-semibold transition-all ${
                canAdvance 
                  ? "hover:bg-eucalyptus/10 hover:border-eucalyptus hover:text-eucalyptus" 
                  : "opacity-40 cursor-not-allowed"
              }`}
              onClick={handleAdvance}
              disabled={!canAdvance}
              title="Next level"
            >
              Harder
              <ChevronUp className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
