import { useEffect, useState, useMemo } from "react";
import dingoLogo from "@/assets/dingo-logo.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flame, Trophy, LogOut, Zap, Settings, Compass, Crown, Star, Sparkles, Play, BarChart2, PenTool, User } from "lucide-react";
import { HomeworkHelpDrawer } from "@/components/HomeworkHelpDrawer";
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
  TERMS_2026,
} from "@/lib/weeklyGoalUtils";
import { useSmartMission } from "@/hooks/useSmartMission";
import { MyBadges } from "@/components/MyBadges";
import { DojoCrew } from "@/components/DojoCrew";
import { StripeCheckoutModal } from "@/components/StripeCheckoutModal";
import { getDojoBelt, getNextDojoBelt, getDojoProgress, DOJO_BELT_LEVELS, getSubjectBelt } from "@/lib/beltUtils";
import { getMasteryLevel } from "@/lib/progressUtils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface Profile {
  id: string;
  first_name: string | null;
  total_xp: number;
  current_streak: number;
  best_streak: number;
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
  const [handwritingHistory, setHandwritingHistory] = useState<any[]>([]);
  const [goalHistory, setGoalHistory] = useState<{ week_start_date: string; goal_met: boolean }[]>([]);
  const [dojoRankModal, setDojoRankModal] = useState(false);
  const [weeklyModal, setWeeklyModal] = useState(false);
  const [handwritingModal, setHandwritingModal] = useState(false);
  const [streakModal, setStreakModal] = useState(false);

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

          // Update best streak
          const newBest = Math.max(resetResult.newStreak, (profileData as any).best_streak || 0);

          await supabase
            .from("profiles")
            .update({
              weekly_xp_earned: 0,
              weekly_xp_goal: resetResult.newGoal,
              week_start_date: currentWeekStart,
              current_streak: resetResult.newStreak,
              vacation_passes: resetResult.vacationPasses,
              last_term_replenish_date: resetResult.lastTermReplenishDate,
              ...(newBest > ((profileData as any).best_streak || 0) ? { best_streak: newBest } : {}),
            } as any)
            .eq("id", profileData.id);

          updatedProfile = {
            ...updatedProfile,
            weekly_xp_earned: 0,
            weekly_xp_goal: resetResult.newGoal,
            week_start_date: currentWeekStart,
            current_streak: resetResult.newStreak,
            vacation_passes: resetResult.vacationPasses,
            last_term_replenish_date: resetResult.lastTermReplenishDate,
            best_streak: newBest,
          } as any;

          // Save previous week's result to goal history
          await (supabase as any).from("weekly_goal_history").upsert({
            profile_id: profileData.id,
            week_start_date: profileData.week_start_date,
            xp_earned: profileData.weekly_xp_earned || 0,
            xp_goal: profileData.weekly_xp_goal || 500,
            goal_met: (profileData.weekly_xp_earned || 0) >= (profileData.weekly_xp_goal || 500),
          }, { onConflict: "profile_id,week_start_date" });

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
          best_streak: (updatedProfile as any).best_streak || 0,
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

        // Fetch handwriting history with component scores
        const { data: hwData } = await supabase
          .from("handwriting_submissions")
          .select("composite_score, letter_formation, spacing_sizing, presentation, created_at")
          .eq("profile_id", profileData.id)
          .order("created_at", { ascending: true });

        if (hwData && hwData.length > 0) {
          const avg = hwData.reduce((sum, h) => sum + (Number(h.composite_score) || 0), 0) / hwData.length;
          setAvgHandwriting(avg);
          setHandwritingHistory(hwData);
        }

        // Fetch weekly goal history for streak calendar
        const { data: goalHistoryData } = await (supabase as any)
          .from("weekly_goal_history")
          .select("week_start_date, goal_met")
          .eq("profile_id", profileData.id)
          .order("week_start_date");
        if (goalHistoryData) setGoalHistory(goalHistoryData);
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

  const prioritySubjects = ["english", "maths"];

  const progressMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of topicProgressData) {
      map[p.topic_id] = p.xp_earned || 0;
    }
    return map;
  }, [topicProgressData]);

  // Dojo Rank based on total XP
  const totalXp = profile?.total_xp || 0;
  const dojoBelt = getDojoBelt(totalXp);
  const nextDojoBelt = getNextDojoBelt(totalXp);
  const dojoProgress = getDojoProgress(totalXp);
  const bestStreak = profile?.best_streak || 0;

  const coreXp = useMemo(() => {
    return subjects
      .filter(s => ['english', 'maths'].includes(s.slug))
      .reduce((sum, s) => sum + (subjectXps[s.id] || 0), 0);
  }, [subjects, subjectXps]);

  const bonusXp = useMemo(() => {
    return subjects
      .filter(s => !['english', 'maths'].includes(s.slug))
      .reduce((sum, s) => sum + (subjectXps[s.id] || 0), 0);
  }, [subjects, subjectXps]);

  const termInfo = useMemo(() => {
    const todayStr = getSydneyWeekStart();
    const today = new Date(todayStr + "T00:00:00");
    for (let i = 0; i < TERMS_2026.length; i++) {
      const start = new Date(TERMS_2026[i].start + "T00:00:00");
      const end = new Date(TERMS_2026[i].end + "T00:00:00");
      if (today >= start && today <= end) return { term: i + 1, ...TERMS_2026[i] };
    }
    return null;
  }, []);

  const termWeeks = useMemo(() => {
    if (!termInfo) return [];
    const weeks: { weekStart: string; label: string }[] = [];
    const termStart = new Date(termInfo.start + "T00:00:00");
    const termEnd = new Date(termInfo.end + "T00:00:00");
    let current = new Date(termStart);
    const day = current.getDay();
    if (day !== 1) {
      const daysToAdd = day === 0 ? 1 : 8 - day;
      current.setDate(current.getDate() + daysToAdd);
    }
    while (current <= termEnd) {
      weeks.push({ weekStart: current.toISOString().split("T")[0], label: `W${weeks.length + 1}` });
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  }, [termInfo]);

  const hwChartConfig = {
    letter: { label: "Letter Formation", color: "hsl(var(--primary))" },
    spacing: { label: "Spacing & Sizing", color: "hsl(var(--secondary))" },
    presentation: { label: "Presentation", color: "hsl(var(--destructive))" },
  };

  const hwChartData = handwritingHistory.map((h: any) => ({
    date: new Date(h.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    letter: h.letter_formation,
    spacing: h.spacing_sizing,
    presentation: h.presentation,
  }));

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
    }).filter(t => prioritySubjects.includes(t.subjectSlug));
  }, [topics, subjects, topicProgressData]);

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
          <img src={dingoLogo} alt="Dingo Dojo" className="w-16 h-16 mx-auto animate-float mb-4" />
          <p className="text-muted-foreground text-lg animate-pulse">Loading the Dojo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Wavy Header Background */}
      <div className="relative" style={{ background: "linear-gradient(135deg, hsl(var(--ochre-light)) 0%, hsl(var(--ochre)) 50%, hsl(var(--ochre-dark)) 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8 pb-14">
          <header className="animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={dingoLogo} alt="Dingo Dojo" className="w-24 h-24 animate-float" />
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground drop-shadow-sm">
                    G'day, {profile?.first_name || "Ninja"}!
                  </h1>
                  <p className="text-primary-foreground/75">{profile?.grade_level || "Year 5"} • The Dojo</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <HomeworkHelpDrawer gradeLevel={profile?.grade_level || "Year 5"} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-xl text-primary-foreground hover:bg-white/20 w-12 h-12">
                      <Settings className="w-10 h-10" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl">
                    <DropdownMenuItem onClick={() => navigate("/progress")} className="gap-2 cursor-pointer">
                      <BarChart2 className="w-4 h-4" />
                      Progress Report
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
        </div>
        {/* Wavy bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0]">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-[30px] md:h-[44px]">
            <path d="M0,30 C200,55 400,5 600,30 C800,55 1000,5 1200,30 L1200,60 L0,60 Z" className="fill-background" />
          </svg>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-8">

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

        {/* Stats Row — 4 clickable cards */}
        <div className={`grid ${handwritingHistory.length > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'} gap-4 mb-8`}>
          {/* Card 1: Dojo Rank */}
          <button onClick={() => setDojoRankModal(true)} className="stats-card text-left animate-slide-up stagger-1">
            <div className="flex items-center gap-3">
              <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${dojoBelt.colorClass}`}>
                {dojoBelt.emoji}
              </span>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Dojo Rank</p>
                <p className="text-lg font-display font-bold text-foreground leading-tight">{dojoBelt.name}</p>
                <p className="text-xs text-muted-foreground">{totalXp.toLocaleString()} XP</p>
              </div>
            </div>
          </button>

          {/* Card 2: This Week's Progress */}
          <button onClick={() => setWeeklyModal(true)} className="stats-card text-left animate-slide-up stagger-2">
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
                <p className="text-xs text-muted-foreground font-medium">This Week</p>
                <p className="text-lg font-display font-bold text-foreground">
                  {weeklyXpEarned} / {weeklyXpGoal} XP
                </p>
              </div>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-500 ${weeklyProgress >= 100 ? "bg-secondary" : "bg-primary"}`}
                style={{ width: `${weeklyProgress}%` }}
              />
            </div>
            <p className="text-xs font-medium text-foreground mt-1">
              {weeklyProgressMsg}
              {inHoliday && <span className="ml-1 text-sky">🏖️ Holiday</span>}
            </p>
          </button>

          {/* Card 3: Weekly Streak */}
          <button onClick={() => setStreakModal(true)} className="stats-card text-left animate-slide-up stagger-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Weekly Streak</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {profile?.current_streak || 0}<span className="text-sm font-normal text-muted-foreground ml-0.5">w</span>
                </p>
                <p className="text-[10px] text-muted-foreground">Best: {bestStreak}w</p>
              </div>
            </div>
          </button>

          {/* Card 4: Handwriting */}
          {handwritingHistory.length > 0 && (
            <button onClick={() => setHandwritingModal(true)} className="stats-card text-left animate-slide-up stagger-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <PenTool className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Handwriting</p>
                  <p className="text-2xl font-display font-bold text-foreground">
                    {avgHandwriting?.toFixed(1)}<span className="text-sm ml-0.5">/5</span>
                  </p>
                </div>
              </div>
            </button>
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

          {/* Priority Subjects — English & Maths */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {subjects
              .filter(s => prioritySubjects.includes(s.slug))
              .sort((a, b) => prioritySubjects.indexOf(a.slug) - prioritySubjects.indexOf(b.slug))
              .map((subject, index) => {
                const theme = getSubjectTheme(subject.slug);
                const xp = subjectXps[subject.id] || 0;
                const subjectTopicIds = topics.filter(t => t.subject_id === subject.id).map(t => t.id);
                const subjectBelt = getSubjectBelt({ subjectId: subject.id, topicIds: subjectTopicIds, progressMap });
                const beltLevel = subjectBelt.level;
                
                return (
                  <div
                    key={subject.id}
                    className="flip-card h-48 md:h-56 perspective-1000"
                    style={{ animationDelay: `${0.05 * (index + 1)}s` }}
                  >
                    <div
                      onClick={() => navigate(`/subject/${subject.slug}`)}
                      role="button"
                      tabIndex={0}
                      className="flip-card-inner w-full h-full relative transition-transform duration-500 transform-style-3d cursor-pointer group"
                    >
                      <div className={`flip-card-front absolute inset-0 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white flex flex-col items-center justify-center p-5 backface-hidden shadow-lg ${theme.glow}`}>
                        <span className="text-6xl md:text-7xl mb-3 drop-shadow-lg">{subject.emoji}</span>
                        <h3 className="text-lg md:text-xl font-display font-bold text-center leading-tight drop-shadow-sm">{subject.name}</h3>
                        {xp > 0 && (
                          <p className="mt-2 text-sm text-white/80 font-semibold">{xp.toLocaleString()} XP</p>
                        )}
                      </div>
                      <div className="flip-card-back absolute inset-0 rounded-2xl bg-card border-2 border-primary/20 flex flex-col items-center justify-center p-5 backface-hidden rotate-y-180 shadow-lg">
                        {/* Per-subject belt badge */}
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm mb-2 ${beltLevel.colorClass}`}>
                          {beltLevel.emoji} {beltLevel.name}
                        </span>
                        <p className="font-display font-bold text-xl text-foreground">
                          {xp > 0 ? `${xp.toLocaleString()} XP` : "Start Fresh!"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 mb-3">
                          {xp > 0 ? "Keep building your skills" : "Begin your journey"}
                        </p>
                        <span className={`px-5 py-2 rounded-full bg-gradient-to-r ${theme.gradient} text-white text-sm font-bold shadow-md`}>
                          Train →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Other Subjects */}
          <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
            {subjects
              .filter(s => !prioritySubjects.includes(s.slug))
              .map((subject, index) => {
                const theme = getSubjectTheme(subject.slug);
                const locked = isSubjectLocked(subject.slug);
                const xp = subjectXps[subject.id] || 0;
                
                return (
                  <div
                    key={subject.id}
                    className="flip-card h-32 md:h-36 perspective-1000"
                    style={{ animationDelay: `${0.05 * (index + 3)}s` }}
                  >
                    <div
                      onClick={() => !locked && navigate(`/subject/${subject.slug}`)}
                      role="button"
                      tabIndex={locked ? -1 : 0}
                      className={`flip-card-inner w-full h-full relative transition-transform duration-500 transform-style-3d ${locked ? 'cursor-not-allowed' : 'cursor-pointer'} group`}
                    >
                      <div className={`flip-card-front absolute inset-0 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white flex flex-col items-center justify-center p-3 backface-hidden shadow-md ${theme.glow} ${locked ? 'opacity-60' : ''}`}>
                        <span className="text-4xl md:text-5xl mb-2 drop-shadow-lg">{subject.emoji}</span>
                        <h3 className="text-sm md:text-base font-display font-bold text-center leading-tight drop-shadow-sm">{subject.name}</h3>
                        {locked && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <Crown className="w-3.5 h-3.5 text-yellow-300" />
                          </div>
                        )}
                      </div>
                      <div className={`flip-card-back absolute inset-0 rounded-2xl bg-card border-2 ${locked ? 'border-muted' : 'border-primary/20'} flex flex-col items-center justify-center p-3 backface-hidden rotate-y-180 shadow-md`}>
                        {locked ? (
                          <>
                            <Crown className="w-8 h-8 text-amber-500 mb-1" />
                            <p className="font-display font-bold text-xs text-foreground mb-1">Champion Only</p>
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleUpgrade(); }}
                              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleUpgrade(); }}
                              size="sm"
                              className="text-xs rounded-lg pointer-events-auto h-7 px-2"
                            >
                              Upgrade
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="font-display font-bold text-base text-foreground">
                              {xp > 0 ? `${xp.toLocaleString()} XP` : "Start!"}
                            </p>
                            <span className={`mt-2 px-3 py-1 rounded-full bg-gradient-to-r ${theme.gradient} text-white text-xs font-bold shadow-sm`}>
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
