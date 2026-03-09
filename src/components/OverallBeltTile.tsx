import { getMasteryLevel, getNextMasteryLevel, getProgressPercentage } from "@/lib/progressUtils";
import { ProgressRing } from "@/components/ProgressRing";

interface OverallBeltTileProps {
  avgXp: number;
  topicCount: number;
}

export function OverallBeltTile({ avgXp, topicCount }: OverallBeltTileProps) {
  const level = getMasteryLevel(avgXp);
  const nextLevel = getNextMasteryLevel(avgXp);
  const progress = getProgressPercentage(avgXp);

  const ringColorMap: Record<string, string> = {
    muted: "stroke-muted-foreground",
    "ochre-light": "stroke-ochre",
    ochre: "stroke-ochre",
    "eucalyptus-light": "stroke-eucalyptus",
    sky: "stroke-sky",
    purple: "stroke-purple-500",
    brown: "stroke-amber-700",
    black: "stroke-gray-900",
  };

  const glowColorMap: Record<string, string> = {
    muted: "drop-shadow-[0_0_6px_hsl(var(--muted-foreground)/0.5)]",
    "ochre-light": "drop-shadow-[0_0_8px_hsl(var(--ochre)/0.6)]",
    ochre: "drop-shadow-[0_0_8px_hsl(var(--ochre)/0.6)]",
    "eucalyptus-light": "drop-shadow-[0_0_8px_hsl(var(--eucalyptus)/0.6)]",
    sky: "drop-shadow-[0_0_8px_hsl(var(--sky)/0.6)]",
    purple: "drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]",
    brown: "drop-shadow-[0_0_8px_rgba(180,83,9,0.6)]",
    black: "drop-shadow-[0_0_8px_rgba(0,0,0,0.6)]",
  };

  const targetColor = nextLevel?.color || level.color;
  const ringColor = ringColorMap[targetColor] || "stroke-muted-foreground";
  const glowClass = glowColorMap[targetColor] || "";

  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={glowClass}>
          <ProgressRing progress={progress} size={56} strokeWidth={6} colorClass={ringColor}>
            <span className="text-xl">{level.emoji}</span>
          </ProgressRing>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-primary-foreground/60 font-medium uppercase tracking-wide">Dojo Rank</p>
          <p className="text-lg font-display font-bold text-primary-foreground drop-shadow-sm leading-tight">
            {level.name}
          </p>
          {nextLevel ? (
            <p className="text-xs text-primary-foreground/70 mt-0.5">
              {nextLevel.minXp - avgXp} avg XP to <span className="font-semibold text-primary-foreground/90">{nextLevel.name}</span>
            </p>
          ) : (
            <p className="text-xs text-primary-foreground/90 font-semibold mt-0.5">
              🥷 Maximum rank!
            </p>
          )}
        </div>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm ${level.colorClass}`}>
          {level.emoji} {progress}%
        </span>
      </div>
    </div>
  );
}
