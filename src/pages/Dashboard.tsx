import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, LogOut, Zap, Settings, Compass, Crown, Star, Sparkles, Play, BarChart2, PenTool } from "lucide-react";
import { toast } from "sonner";
import { ProgressRing } from "@/components/ProgressRing";
import { getSydneyWeekStart, isNewWeek } from "@/lib/weekUtils";
import { getSydneyToday } from "@/lib/dailyUtils";
import {
  calculateWeeklyReset,
  getWeeklyProgressMessage,
  isCurrentWeekHoliday,
  getHolidayLabel,
  getWeeklyXPGoal,
} from "@/lib/weeklyGoalUtils";
import { useSmartMission } from "@/hooks/useSmartMission";
import { MyBadges } from "@/components/MyBadges";
import { DojoCrew } from "@/components/DojoCrew";
import { StripeCheckoutModal } from "@/components/StripeCheckoutModal";
import { Progress } from "@/components/ui/progress";

interface Profile {
  id: string;
  first_name: string | null;
  total_xp: number;
  current_streak: number;
  weekly_xp_earned: number;
  weekly_xp_goal: number;
  vacation_passes: number;
  last_term_replenish_date: string | null;
  grade_level: string;
  week_start_date: string | null;
  last_mission_date: string | null;
  subscription_tier: string;
  onboarding_completed: boolean;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  color: string;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  subject_id: string;
}

interface TopicProgress {
  topic_id: string;
  xp_earned: number;
}

interface WeeklySubjectBreakdown {
  subjectName: string;
  emoji: string;
  xp: number;
  missions: number;
}

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectXps, setSubjectXps] = useState<Record<string, number>>({});
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicProgressData, setTopicProgressData] = useState<TopicProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [avgHandwriting, setAvgHandwriting] = useState<number | null>(null);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklySubjectBreakdown[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
      checkSubscriptionStatus();
      
      const subscriptionStatus = searchParams.get("subscription");
      if (subscriptionStatus === "success") {
        toast.success("Welcome to Champion tier! 🏆 Unlimited learning awaits!");
      } else if (subscriptionStatus === "cancelled") {
        toast("No worries! You can upgrade anytime.", { icon: "👍" });
      }
    }
  }, [user, searchParams]);

  const checkSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("Subscription check error:", error);
        return;
      }
    } catch (err) {
      console.error("Failed to check subscription:", err);
    }
  };

  const handleUpgrade = () => {
    setCheckoutModalOpen(true);
  };

  const handleCheckoutSuccess = () => {
    toast.success("Welcome to Champion tier! 🏆 Unlimited learning awaits!");
    fetchData();
    checkSubscriptionStatus();
  };

  const fetchData = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
      } else if (profileData) {
        if (!profileData.onboarding_completed) {
          navigate("/onboarding");
          return;
        }

        const currentWeekStart = getSydneyWeekStart();
        const wasNewWeek = isNewWeek(profileData.week_start_date);

        let updatedProfile = { ...profileData };

        // Handle new week reset with weekly XP goal system
        if (wasNewWeek && profileData.week_start_date) {
          const resetResult = calculateWeeklyReset(
            profileData.week_start_date,
            profileData.current_streak || 0,
            profileData.weekly_xp_earned || 0,
            profileData.weekly_xp_goal || 500,
            profileData.vacation_passes ?? 2,
            profileData.last_term_replenish_date || null
          );

          await supabase
            .from("profiles")
            .update({
              weekly_xp_earned: 0,
              weekly_xp_goal: resetResult.newGoal,
              week_start_date: currentWeekStart,
              current_streak: resetResult.newStreak,
              vacation_passes: resetResult.vacationPasses,
              last_term_replenish_date: resetResult.lastTermReplenishDate,
            })
            .eq("id", profileData.id);

          updatedProfile = {
            ...updatedProfile,
            weekly_xp_earned: 0,
            weekly_xp_goal: resetResult.newGoal,
            week_start_date: currentWeekStart,
            current_streak: resetResult.newStreak,
            vacation_passes: resetResult.vacationPasses,
            last_term_replenish_date: resetResult.lastTermReplenishDate,
          };

          // Show toasts for reset events
          if (resetResult.passConsumed) {
            toast(`Vacation pass used! 🏖️ You have ${resetResult.vacationPasses} left this term. Your streak continues!`);
          } else if (resetResult.streakReset) {
            toast("Your streak has reset. Don't worry — start fresh this week! 🌟");
          } else if (resetResult.holidayProtected) {
            toast("School holidays protected your streak! 🏖️");
          }
        } else if (!profileData.week_start_date) {
          // First time — initialize
          const initialGoal = getWeeklyXPGoal(0);
          await supabase
            .from("profiles")
            .update({ week_start_date: currentWeekStart, weekly_xp_goal: initialGoal })
            .eq("id", profileData.id);

          updatedProfile = {
            ...updatedProfile,
            week_start_date: currentWeekStart,
            weekly_xp_goal: initialGoal,
          };
        }

        // Also check term replenishment even if not a new week
        // (user may not have logged in at term start)
        if (!wasNewWeek) {
          const { shouldReplenishPasses } = await import("@/lib/weeklyGoalUtils");
          const termReplenish = shouldReplenishPasses(updatedProfile.last_term_replenish_date || null);
          if (termReplenish) {
            await supabase
              .from("profiles")
              .update({ vacation_passes: 2, last_term_replenish_date: termReplenish })
              .eq("id", profileData.id);
            updatedProfile = {
              ...updatedProfile,
              vacation_passes: 2,
              last_term_replenish_date: termReplenish,
            };
          }
        }

        setProfile({
          id: updatedProfile.id!,
          first_name: updatedProfile.first_name || null,
          total_xp: updatedProfile.total_xp || 0,
          current_streak: updatedProfile.current_streak || 0,
          weekly_xp_earned: updatedProfile.weekly_xp_earned || 0,
          weekly_xp_goal: updatedProfile.weekly_xp_goal || 500,
          vacation_passes: updatedProfile.vacation_passes ?? 2,
          last_term_replenish_date: updatedProfile.last_term_replenish_date || null,
          grade_level: updatedProfile.grade_level || "Year 5",
          week_start_date: updatedProfile.week_start_date || null,
          last_mission_date: updatedProfile.last_mission_date || null,
          subscription_tier: updatedProfile.subscription_tier || "explorer",
          onboarding_completed: updatedProfile.onboarding_completed || false,
        });

        // Fetch subject data
        const { data: subjectsData } = await supabase.from("subjects").select("*").order("name");
        
        if (subjectsData) {
          setSubjects(subjectsData);

          const { data: topicsData } = await supabase.from("topics").select("id, name, slug, subject_id");
          
          if (topicsData) {
            setTopics(topicsData);
            
            const { data: progressData } = await supabase
              .from("student_progress")
              .select("topic_id, xp_earned")
              .eq("student_id", profileData.id);

            if (progressData) {
              setTopicProgressData(progressData);
              
              const xpBySubject: Record<string, number> = {};
              for (const topic of topicsData) {
                const topicProgress = progressData.find((p) => p.topic_id === topic.id);
                if (topicProgress) {
                  xpBySubject[topic.subject_id] = (xpBySubject[topic.subject_id] || 0) + (topicProgress.xp_earned || 0);
                }
              }
              setSubjectXps(xpBySubject);
            }

            // Fetch weekly subject breakdown (student_progress updated this week)
            const weekStart = updatedProfile.week_start_date || currentWeekStart;
            const { data: weeklyProgress } = await supabase
              .from("student_progress")
              .select("topic_id, weekly_xp, missions_this_week, week_start_date")
              .eq("student_id", profileData.id)
              .eq("week_start_date", weekStart);

            if (weeklyProgress && weeklyProgress.length > 0) {
              const breakdown: WeeklySubjectBreakdown[] = [];
              const subjectMap: Record<string, { xp: number; missions: number }> = {};

              for (const wp of weeklyProgress) {
                const topic = topicsData.find(t => t.id === wp.topic_id);
                if (!topic) continue;
                const subj = subjectsData.find(s => s.id === topic.subject_id);
                if (!subj) continue;
                const key = subj.id;
                if (!subjectMap[key]) subjectMap[key] = { xp: 0, missions: 0 };
                subjectMap[key].xp += wp.weekly_xp || 0;
                subjectMap[key].missions += wp.missions_this_week || 0;
              }

              for (const [sid, data] of Object.entries(subjectMap)) {
                const subj = subjectsData.find(s => s.id === sid);
                if (subj && data.xp > 0) {
                  breakdown.push({
                    subjectName: subj.name,
                    emoji: subj.emoji || "📚",
                    xp: data.xp,
                    missions: data.missions,
                  });
                }
              }
              setWeeklyBreakdown(breakdown);
            }
          }
        }

        // Fetch average handwriting score
        const { data: hwData } = await supabase
          .from("handwriting_submissions")
          .select("composite_score")
          .eq("profile_id", profileData.id);

        if (hwData && hwData.length > 0) {
          const avg = hwData.reduce((sum, h) => sum + (Number(h.composite_score) || 0), 0) / hwData.length;
          setAvgHandwriting(avg);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("See you next time, ninja! 👋");
    navigate("/auth");
  };

  // Subject-specific color schemes
  const getSubjectTheme = (slug: string) => {
    switch (slug) {
      case "english":
        return { gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/30", bgLight: "bg-violet-50", icon: "📖" };
      case "maths":
        return { gradient: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/30", bgLight: "bg-blue-50", icon: "🔢" };
      case "geography":
        return { gradient: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/30", bgLight: "bg-emerald-50", icon: "🌏" };
      case "history":
        return { gradient: "from-amber-600 to-yellow-500", glow: "shadow-amber-600/30", bgLight: "bg-amber-50", icon: "🏛️" };
      case "science-technology":
        return { gradient: "from-rose-500 to-red-600", glow: "shadow-rose-500/30", bgLight: "bg-rose-50", icon: "🔬" };
      default:
        return { gradient: "from-ochre to-ochre-light", glow: "shadow-ochre/30", bgLight: "bg-ochre/10", icon: "📚" };
    }
  };

  const isSubjectLocked = (slug: string) => {
    const freeSubjects = ["english", "maths"];
    return isExplorer && !freeSubjects.includes(slug);
  };

  const isExplorer = profile?.subscription_tier !== "champion";
  const weeklyXpEarned = profile?.weekly_xp_earned || 0;
  const weeklyXpGoal = profile?.weekly_xp_goal || 500;
  const weeklyProgress = Math.min(100, (weeklyXpEarned / weeklyXpGoal) * 100);
  const weeklyProgressMsg = getWeeklyProgressMessage(weeklyXpEarned, weeklyXpGoal);
  const inHoliday = isCurrentWeekHoliday();
  const holidayLabel = inHoliday ? getHolidayLabel(getSydneyWeekStart()) : null;

  // Build topic progress for smart mission selection
  const smartMissionTopics = useMemo(() => {
    return topics.map(topic => {
      const subject = subjects.find(s => s.id === topic.subject_id);
      const progress = topicProgressData.find(p => p.topic_id === topic.id);
      return {
        topicId: topic.id,
        topicName: topic.name,
        topicSlug: topic.slug,
        subjectSlug: subject?.slug || '',
        subjectName: subject?.name || '',
        xpEarned: progress?.xp_earned || 0,
      };
    }).filter(t => {
      const freeSubjects = ["english", "maths"];
      return !isExplorer || freeSubjects.includes(t.subjectSlug);
    });
  }, [topics, subjects, topicProgressData, isExplorer]);

  const smartMission = useSmartMission({ topicProgress: smartMissionTopics });

  const handleStartSmartMission = () => {
    if (smartMission) {
      navigate(`/learn/${smartMission.subjectSlug}/${smartMission.topicSlug}`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-float mb-4">🦊</div>
          <p className="text-muted-foreground text-lg animate-pulse">Loading the Dojo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="text-5xl animate-float">🦊</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                G'day, {profile?.first_name || "Ninja"}!
              </h1>
              <p className="text-muted-foreground">{profile?.grade_level || "Year 5"} • The Dojo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/progress")} className="rounded-xl" title="Progress Report">
              <BarChart2 className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")} className="rounded-xl">
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="outline" onClick={handleLogout} className="rounded-xl gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* School Holiday Banner */}
        {inHoliday && (
          <div className="mb-6 bento-card bg-gradient-to-r from-sky/10 to-eucalyptus/10 border-2 border-sky/20 animate-slide-up">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏖️</span>
              <div>
                <p className="font-semibold text-foreground">{holidayLabel || "School Holidays"} — Streak protection active!</p>
                <p className="text-sm text-muted-foreground">Enjoy your break, but training still earns XP!</p>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Banner for Explorer */}
        {isExplorer && (
          <div className="mb-6 bento-card bg-gradient-to-r from-ochre/10 to-eucalyptus/10 border-2 border-ochre/20 animate-slide-up">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky/20 flex items-center justify-center">
                  <Compass className="w-5 h-5 text-sky" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Explorer Plan</p>
                  <p className="text-sm text-muted-foreground">2 missions per day</p>
                </div>
              </div>
              <Button 
                onClick={handleUpgrade}
                onTouchEnd={(e) => { e.preventDefault(); handleUpgrade(); }}
                size="sm" 
                className="rounded-xl gap-2 bg-gradient-to-r from-ochre to-amber-500 hover:from-ochre/90 hover:to-amber-500/90"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Champion
              </Button>
            </div>
          </div>
        )}

        {/* Stats Row — 4 cards */}
        <div className={`grid ${avgHandwriting !== null ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'} gap-4 mb-8`}>
          {/* Card 1: Weekly Streak */}
          <div className="stats-card flex items-center gap-3 animate-slide-up stagger-1">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Weekly Streak</p>
              <p className="text-2xl font-display font-bold text-foreground">
                {profile?.current_streak || 0} <span className="text-sm font-normal text-muted-foreground">weeks</span>
              </p>
            </div>
          </div>

          {/* Card 2: Weekly Progress */}
          <div className="stats-card animate-slide-up stagger-2">
            <div className="flex items-center gap-2 mb-2">
              <ProgressRing
                progress={weeklyProgress}
                size={40}
                strokeWidth={4}
                colorClass={weeklyProgress >= 100 ? "stroke-eucalyptus" : "stroke-ochre"}
              >
                <Zap className={`w-3.5 h-3.5 ${weeklyProgress >= 100 ? "text-eucalyptus" : "text-ochre"}`} />
              </ProgressRing>
              <div>
                <p className="text-xs text-muted-foreground font-medium">This Week's Progress</p>
                <p className="text-lg font-display font-bold text-foreground">
                  {weeklyXpEarned} / {weeklyXpGoal} XP
                </p>
              </div>
            </div>
            <Progress value={weeklyProgress} className="h-2 mb-2" />
            {weeklyBreakdown.length > 0 && (
              <div className="space-y-0.5 mb-1">
                {weeklyBreakdown.map(wb => (
                  <p key={wb.subjectName} className="text-[10px] text-muted-foreground">
                    {wb.emoji} {wb.subjectName}: {wb.xp} XP ({wb.missions} mission{wb.missions !== 1 ? 's' : ''})
                  </p>
                ))}
              </div>
            )}
            <p className="text-xs font-medium text-foreground">
              {weeklyProgressMsg}
              {inHoliday && <span className="ml-1 text-sky">🏖️ Holiday mode</span>}
            </p>
          </div>

          {/* Card 3: Total XP */}
          <div className="stats-card flex items-center gap-3 animate-slide-up stagger-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total XP</p>
              <p className="text-2xl font-display font-bold text-foreground">
                {profile?.total_xp?.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Card 4: Handwriting (only if submissions exist) */}
          {avgHandwriting !== null && (
            <div className="stats-card flex items-center gap-3 animate-slide-up stagger-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                <PenTool className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Handwriting</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {avgHandwriting.toFixed(1)}<span className="text-sm ml-0.5">/5</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Start Mission Button */}
        {smartMission && (
          <section className="mb-8 animate-slide-up stagger-5">
            <button
              onClick={handleStartSmartMission}
              className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-ochre via-amber-500 to-ochre-light p-1 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="relative flex items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-ochre via-amber-500 to-ochre-light px-6 py-5 md:py-6">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                    <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl md:text-2xl font-display font-bold text-white drop-shadow-sm">Start Mission</h3>
                    <p className="text-white/90 text-sm md:text-base font-medium">{smartMission.reasonText}</p>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end relative z-10">
                  <span className="text-white/80 text-xs font-medium uppercase tracking-wide">Next up</span>
                  <span className="text-white font-display font-bold text-lg">{smartMission.topicName}</span>
                </div>
                <Zap className="w-6 h-6 text-white/80 animate-pulse relative z-10" />
              </div>
            </button>
          </section>
        )}

        {/* Subject Cards */}
        <section className="animate-slide-up stagger-6">
          <h2 className="text-xl font-display font-bold mb-5 text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 text-ochre" />
            Choose Your Training
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {subjects.map((subject, index) => {
              const theme = getSubjectTheme(subject.slug);
              const locked = isSubjectLocked(subject.slug);
              const xp = subjectXps[subject.id] || 0;
              
              return (
                <div
                  key={subject.id}
                  className="flip-card h-40 md:h-48 perspective-1000"
                  style={{ animationDelay: `${0.05 * (index + 1)}s` }}
                >
                  <div
                    onClick={() => !locked && navigate(`/subject/${subject.slug}`)}
                    role="button"
                    tabIndex={locked ? -1 : 0}
                    className={`flip-card-inner w-full h-full relative transition-transform duration-500 transform-style-3d ${locked ? 'cursor-not-allowed' : 'cursor-pointer'} group`}
                  >
                    <div className={`flip-card-front absolute inset-0 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white flex flex-col items-center justify-center p-4 backface-hidden shadow-lg ${theme.glow} ${locked ? 'opacity-60' : ''}`}>
                      <span className="text-5xl md:text-6xl mb-3 drop-shadow-lg">{subject.emoji}</span>
                      <h3 className="text-base md:text-lg font-display font-bold text-center leading-tight drop-shadow-sm">{subject.name}</h3>
                      {locked && (
                        <div className="absolute top-3 right-3 w-7 h-7 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Crown className="w-4 h-4 text-yellow-300" />
                        </div>
                      )}
                    </div>
                    <div className={`flip-card-back absolute inset-0 rounded-2xl bg-card border-2 ${locked ? 'border-muted' : 'border-primary/20'} flex flex-col items-center justify-center p-4 backface-hidden rotate-y-180 shadow-lg`}>
                      {locked ? (
                        <>
                          <Crown className="w-10 h-10 text-amber-500 mb-2" />
                          <p className="font-display font-bold text-sm text-foreground mb-1">Champion Only</p>
                          <p className="text-xs text-muted-foreground text-center mb-2">Upgrade to unlock {subject.name}</p>
                          <Button
                            onClick={(e) => { e.stopPropagation(); handleUpgrade(); }}
                            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleUpgrade(); }}
                            size="sm"
                            className="text-xs rounded-lg pointer-events-auto"
                          >
                            Upgrade
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center mb-3 shadow-md`}>
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                          <p className="font-display font-bold text-lg text-foreground">
                            {xp > 0 ? `${xp.toLocaleString()} XP` : "Start Fresh!"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 mb-3">
                            {xp > 0 ? "Keep building your skills" : "Begin your journey"}
                          </p>
                          <span className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${theme.gradient} text-white text-sm font-bold shadow-md`}>
                            Train →
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Badges & Dojo Crew */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up stagger-7">
          <MyBadges
            profileId={profile?.id || null}
            currentStreak={profile?.current_streak || 0}
            totalXp={profile?.total_xp || 0}
          />
          <DojoCrew
            profileId={profile?.id || null}
            firstName={profile?.first_name || null}
            totalXp={profile?.total_xp || 0}
            currentStreak={profile?.current_streak || 0}
          />
        </section>

        <StripeCheckoutModal
          open={checkoutModalOpen}
          onOpenChange={setCheckoutModalOpen}
          onSuccess={handleCheckoutSuccess}
        />
      </div>
    </div>
  );
}
