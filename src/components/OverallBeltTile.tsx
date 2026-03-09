import { getMasteryLevel, getNextMasteryLevel, getProgressPercentage, type MasteryLevel } from "@/lib/progressUtils";
import { ProgressRing } from "@/components/ProgressRing";

interface OverallBeltTileProps {
  avgXp: number;
  topicCount: number;
}

export function OverallBeltTile({ avgXp, topicCount }: OverallBeltTileProps) {
  const level = getMasteryLevel(avgXp);
  const nextLevel = getNextMasteryLevel(avgXp);
  const progress = getProgressPercentage(avgXp);

  // Belt color mapping for ring
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
  const ringColor = ringColorMap[level.color] || "stroke-muted-foreground";

  return (
    <div className="bento-card bg-card p-5 animate-slide-up">
      <div className="flex items-center gap-4">
        {/* Belt ring */}
        <ProgressRing progress={progress} size={64} strokeWidth={5} colorClass={ringColor}>
          <span className="text-2xl">{level.emoji}</span>
        </ProgressRing>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium mb-0.5">Overall Dojo Rank</p>
          <p className={`text-xl font-display font-bold ${level.color === "black" ? "text-foreground" : "text-foreground"}`}>
            {level.name}
          </p>
          {nextLevel ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              {nextLevel.minXp - avgXp} avg XP to <span className="font-semibold">{nextLevel.name}</span>
            </p>
          ) : (
            <p className="text-xs text-eucalyptus font-semibold mt-0.5">
              🥷 Maximum rank achieved!
            </p>
          )}
        </div>

        {/* Belt badge */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold shadow-sm ${level.colorClass}`}>
          {level.emoji} {progress}%
        </span>
      </div>
    </div>
  );
}
