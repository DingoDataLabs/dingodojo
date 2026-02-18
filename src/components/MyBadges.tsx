import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";

interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  badge_type: string;
  threshold: number;
}

interface UserBadge {
  badge_id: string;
  earned_at: string;
}

interface MyBadgesProps {
  profileId: string | null;
  currentStreak: number;
  totalXp: number;
}

export function MyBadges({ profileId, currentStreak, totalXp }: MyBadgesProps) {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileId) fetchBadges();
  }, [profileId]);

  useEffect(() => {
    if (profileId && allBadges.length > 0) checkAndAwardBadges();
  }, [profileId, allBadges, currentStreak, totalXp]);

  const fetchBadges = async () => {
    try {
      const [{ data: badges }, { data: earned }] = await Promise.all([
        supabase.from("badges").select("*").order("threshold"),
        supabase.from("user_badges").select("badge_id, earned_at").eq("profile_id", profileId!),
      ]);
      if (badges) setAllBadges(badges);
      if (earned) setEarnedBadges(earned);
    } catch (err) {
      console.error("Error fetching badges:", err);
    } finally {
      setLoading(false);
    }
  };

  const checkAndAwardBadges = async () => {
    if (!profileId) return;

    const { data: progressData } = await supabase
      .from("student_progress")
      .select("xp_earned")
      .eq("student_id", profileId);

    const masteryCount = progressData?.filter(p => (p.xp_earned || 0) >= 500).length || 0;
    const earnedIds = new Set(earnedBadges.map(e => e.badge_id));
    const newlyEarned: Badge[] = [];

    for (const badge of allBadges) {
      if (earnedIds.has(badge.id)) continue;
      let crossed = false;
      // Streak badges now use weekly streak (current_streak)
      if (badge.badge_type === "streak") crossed = currentStreak >= badge.threshold;
      else if (badge.badge_type === "xp") crossed = totalXp >= badge.threshold;
      else if (badge.badge_type === "mastery") crossed = masteryCount >= badge.threshold;
      if (crossed) newlyEarned.push(badge);
    }

    if (newlyEarned.length === 0) return;

    const inserts = newlyEarned.map(b => ({ profile_id: profileId, badge_id: b.id }));
    const { error } = await supabase.from("user_badges").insert(inserts);
    if (error) { console.error("Error awarding badges:", error); return; }

    const activityInserts = newlyEarned.map(b => ({
      profile_id: profileId,
      activity_type: "badge_earned" as const,
      badge_name: b.name,
      badge_emoji: b.emoji,
      xp_earned: 0,
    }));
    await supabase.from("activity_feed").insert(activityInserts);

    for (const badge of newlyEarned) {
      toast.success(`${badge.emoji} Badge Unlocked: ${badge.name}!`);
    }

    const { data: updated } = await supabase
      .from("user_badges")
      .select("badge_id, earned_at")
      .eq("profile_id", profileId);
    if (updated) setEarnedBadges(updated);
  };

  const isEarned = (badgeId: string) => earnedBadges.find(e => e.badge_id === badgeId);
  const earnedCount = earnedBadges.length;

  if (loading) {
    return (
      <div className="bento-card animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">🏅 My Badges</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground animate-pulse">Loading badges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card animate-slide-up h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2">🏅 My Badges</h3>
        <span className="text-xs text-muted-foreground font-medium">{earnedCount} / {allBadges.length} earned</span>
      </div>
      <div className="overflow-y-auto flex-1 scrollbar-thin">
        <TooltipProvider>
          <div className="grid grid-cols-4 md:grid-cols-5 gap-3">
            {allBadges.map((badge) => {
              const earned = isEarned(badge.id);
              return (
                <Tooltip key={badge.id}>
                  <TooltipTrigger asChild>
                    <div className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${earned ? "hover:bg-primary/5" : "opacity-40 grayscale"}`}>
                      <span className="text-3xl md:text-4xl mb-1">{badge.emoji}</span>
                      <p className="text-[10px] md:text-xs font-medium text-foreground leading-tight line-clamp-2">{badge.name}</p>
                      {!earned && (
                        <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{badge.description}</p>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {earned ? (
                      <p>Earned {formatDistanceToNow(new Date(earned.earned_at), { addSuffix: true })}</p>
                    ) : (
                      <p>{badge.description}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
