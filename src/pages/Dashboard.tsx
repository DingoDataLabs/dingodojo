import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, LogOut, Zap, Settings, Compass, Lock, Crown, Star, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ProgressRing } from "@/components/ProgressRing";
import { getSydneyWeekStart, isNewWeek, getStreakMessage, isStreakSecured } from "@/lib/weekUtils";
import { getSydneyToday, isNewDay, getDailyStreakMessage, getDailyMissionsRemaining } from "@/lib/dailyUtils";
import { MirriSuggestion } from "@/components/MirriSuggestion";
import { useMirriSuggestion } from "@/hooks/useMirriSuggestion";

interface Profile {
  id: string;
  first_name: string | null;
  total_xp: number;
  current_streak: number;
  daily_streak: number;
  grade_level: string;
  missions_this_week: number;
  missions_today: number;
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

interface SubjectXp {
  subject_id: string;
  total_xp: number;
}

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectXps, setSubjectXps] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
      checkSubscriptionStatus();
      
      // Handle subscription callback
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
      // Subscription tier is updated via the edge function
    } catch (err) {
      console.error("Failed to check subscription:", err);
    }
  };

  const handleUpgrade = async () => {
    const promoCode = sessionStorage.getItem("dingo_promo_code") || "";
    
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { promoCode },
      });
      
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Couldn't start checkout. Please try again!");
    }
  };

  const fetchData = async () => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
      } else if (profileData) {
        // Check if onboarding is completed
        if (!profileData.onboarding_completed) {
          navigate("/onboarding");
          return;
        }

        const currentWeekStart = getSydneyWeekStart();
        const wasNewWeek = isNewWeek(profileData.week_start_date);
        const today = getSydneyToday();
        const wasNewDay = isNewDay(profileData.last_mission_date);

        let updatedProfile = { ...profileData };

        // Handle new week reset
        if (wasNewWeek && profileData.week_start_date) {
          const previousMissions = profileData.missions_this_week || 0;
          const newWeeklyStreak = previousMissions >= 5 
            ? (profileData.current_streak || 0) + 1 
            : 0;

          await supabase
            .from("profiles")
            .update({
              missions_this_week: 0,
              week_start_date: currentWeekStart,
              current_streak: newWeeklyStreak,
            })
            .eq("id", profileData.id);

          updatedProfile = {
            ...updatedProfile,
            missions_this_week: 0,
            week_start_date: currentWeekStart,
            current_streak: newWeeklyStreak,
          };
        } else if (!profileData.week_start_date) {
          await supabase
            .from("profiles")
            .update({ week_start_date: currentWeekStart })
            .eq("id", profileData.id);

          updatedProfile = {
            ...updatedProfile,
            week_start_date: currentWeekStart,
          };
        }

        // Handle new day reset for daily missions
        if (wasNewDay && profileData.last_mission_date) {
          await supabase
            .from("profiles")
            .update({ missions_today: 0 })
            .eq("id", profileData.id);

          updatedProfile = {
            ...updatedProfile,
            missions_today: 0,
          };
        }

        setProfile({
          ...updatedProfile,
          daily_streak: updatedProfile.daily_streak || 0,
          missions_today: updatedProfile.missions_today || 0,
          last_mission_date: updatedProfile.last_mission_date || null,
        });

        // Fetch subject XP totals
        const { data: subjectsData } = await supabase.from("subjects").select("*").order("name");
        
        if (subjectsData) {
          setSubjects(subjectsData);

          // Get all topics grouped by subject
          const { data: topicsData } = await supabase.from("topics").select("id, subject_id");
          
          if (topicsData) {
            // Get all progress for this user
            const { data: progressData } = await supabase
              .from("student_progress")
              .select("topic_id, xp_earned")
              .eq("student_id", profileData.id);

            if (progressData) {
              // Calculate XP per subject
              const xpBySubject: Record<string, number> = {};
              for (const topic of topicsData) {
                const topicProgress = progressData.find((p) => p.topic_id === topic.id);
                if (topicProgress) {
                  xpBySubject[topic.subject_id] = (xpBySubject[topic.subject_id] || 0) + (topicProgress.xp_earned || 0);
                }
              }
              setSubjectXps(xpBySubject);
            }
          }
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
        return {
          gradient: "from-violet-500 to-purple-600",
          glow: "shadow-violet-500/30",
          bgLight: "bg-violet-50",
          icon: "📖",
        };
      case "maths":
        return {
          gradient: "from-blue-500 to-indigo-600",
          glow: "shadow-blue-500/30",
          bgLight: "bg-blue-50",
          icon: "🔢",
        };
      case "geography":
        return {
          gradient: "from-emerald-500 to-teal-600",
          glow: "shadow-emerald-500/30",
          bgLight: "bg-emerald-50",
          icon: "🌏",
        };
      case "history":
        return {
          gradient: "from-amber-600 to-yellow-500",
          glow: "shadow-amber-600/30",
          bgLight: "bg-amber-50",
          icon: "🏛️",
        };
      case "science-technology":
        return {
          gradient: "from-rose-500 to-red-600",
          glow: "shadow-rose-500/30",
          bgLight: "bg-rose-50",
          icon: "🔬",
        };
      default:
        return {
          gradient: "from-ochre to-ochre-light",
          glow: "shadow-ochre/30",
          bgLight: "bg-ochre/10",
          icon: "📚",
        };
    }
  };

  // Check if subject requires Champion tier
  const isSubjectLocked = (slug: string) => {
    const freeSubjects = ["english", "maths"];
    return isExplorer && !freeSubjects.includes(slug);
  };

  const missionsThisWeek = profile?.missions_this_week || 0;
  const missionsToday = profile?.missions_today || 0;
  const dailyStreak = profile?.daily_streak || 0;
  const missionsProgress = Math.min(100, (missionsThisWeek / 5) * 100);
  const dailyProgress = Math.min(100, (missionsToday / 2) * 100);
  const streakMessage = getStreakMessage(missionsThisWeek);
  const streakSecured = isStreakSecured(missionsThisWeek);
  const isExplorer = profile?.subscription_tier !== "champion";
  const dailyMissionsRemaining = isExplorer ? getDailyMissionsRemaining(missionsToday) : null;

  const subjectProgressData = useMemo(() => 
    subjects.map(s => ({
      subjectId: s.id,
      subjectName: s.name,
      totalXp: subjectXps[s.id] || 0,
    })),
    [subjects, subjectXps]
  );

  const mirriMessage = useMirriSuggestion({
    firstName: profile?.first_name,
    missionsThisWeek,
    currentStreak: profile?.current_streak || 0,
    subjectProgress: subjectProgressData,
    totalXp: profile?.total_xp || 0,
  });

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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="rounded-xl"
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="rounded-xl gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

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
                  <p className="text-sm text-muted-foreground">
                    {dailyMissionsRemaining === 0 
                      ? "You've used all 2 missions for today!" 
                      : `${dailyMissionsRemaining} mission${dailyMissionsRemaining === 1 ? '' : 's'} left today`}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleUpgrade}
                size="sm" 
                className="rounded-xl gap-2 bg-gradient-to-r from-ochre to-amber-500 hover:from-ochre/90 hover:to-amber-500/90"
              >
                <Crown className="w-4 h-4" />
                Upgrade to Champion
              </Button>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {/* Daily Streak */}
          <div className="stats-card flex items-center gap-3 animate-slide-up stagger-1">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Daily Streak</p>
              <p className="text-2xl font-display font-bold text-foreground">
                {dailyStreak}
                <span className="text-sm ml-1">days</span>
              </p>
            </div>
          </div>

          {/* Weekly Streak */}
          <div className="stats-card flex items-center gap-3 animate-slide-up stagger-2">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Weekly Streak</p>
              <p className="text-2xl font-display font-bold text-foreground">
                {profile?.current_streak || 0}
                <span className="text-sm ml-1">weeks</span>
              </p>
            </div>
          </div>

          {/* Today's Missions (Explorer only) */}
          {isExplorer ? (
            <div className="stats-card flex items-center gap-3 animate-slide-up stagger-3">
              <ProgressRing
                progress={dailyProgress}
                size={48}
                strokeWidth={4}
                colorClass={missionsToday >= 2 ? "stroke-eucalyptus" : "stroke-ochre"}
              >
                <Zap className={`w-4 h-4 ${missionsToday >= 2 ? "text-eucalyptus" : "text-ochre"}`} />
              </ProgressRing>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Today</p>
                <p className="text-xl font-display font-bold text-foreground">
                  {missionsToday}/2
                </p>
              </div>
            </div>
          ) : (
            <div className="stats-card flex items-center gap-3 animate-slide-up stagger-3">
              <ProgressRing
                progress={missionsProgress}
                size={48}
                strokeWidth={4}
                colorClass={streakSecured ? "stroke-eucalyptus" : "stroke-ochre"}
              >
                <Zap className={`w-4 h-4 ${streakSecured ? "text-eucalyptus" : "text-ochre"}`} />
              </ProgressRing>
              <div>
                <p className="text-xs text-muted-foreground font-medium">This Week</p>
                <p className="text-xl font-display font-bold text-foreground">
                  {missionsThisWeek}/5
                </p>
              </div>
            </div>
          )}

          {/* Total XP */}
          <div className="stats-card flex items-center gap-3 animate-slide-up stagger-4">
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
        </div>

        {/* Mirri Suggestion */}
        <section className="mb-6 animate-slide-up stagger-5">
          <MirriSuggestion message={mirriMessage} />
        </section>

        {/* Subject Cards - Flip Cards */}
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
                  <button
                    onClick={() => !locked && navigate(`/subject/${subject.slug}`)}
                    disabled={locked}
                    className={`flip-card-inner w-full h-full relative transition-transform duration-500 transform-style-3d ${locked ? 'cursor-not-allowed' : 'cursor-pointer'} group`}
                  >
                    {/* Front of card */}
                    <div className={`flip-card-front absolute inset-0 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white flex flex-col items-center justify-center p-4 backface-hidden shadow-lg ${theme.glow} ${locked ? 'opacity-60' : ''}`}>
                      <span className="text-5xl md:text-6xl mb-3 drop-shadow-lg">{subject.emoji}</span>
                      <h3 className="text-base md:text-lg font-display font-bold text-center leading-tight drop-shadow-sm">{subject.name}</h3>
                      {locked && (
                        <div className="absolute top-3 right-3 w-7 h-7 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Crown className="w-4 h-4 text-yellow-300" />
                        </div>
                      )}
                    </div>
                    
                    {/* Back of card */}
                    <div className={`flip-card-back absolute inset-0 rounded-2xl bg-card border-2 ${locked ? 'border-muted' : 'border-primary/20'} flex flex-col items-center justify-center p-4 backface-hidden rotate-y-180 shadow-lg`}>
                      {locked ? (
                        <>
                          <Crown className="w-10 h-10 text-amber-500 mb-2" />
                          <p className="font-display font-bold text-sm text-foreground mb-1">Champion Only</p>
                          <p className="text-xs text-muted-foreground text-center mb-2">Upgrade to unlock {subject.name}</p>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpgrade();
                            }}
                            size="sm"
                            className="text-xs rounded-lg"
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
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Motivation Section */}
        <section className="mt-8 animate-slide-up stagger-7">
          <div className="bento-card bg-gradient-to-br from-sky/10 to-sky-light/5 border-2 border-dashed border-sky/20 text-center py-8">
            <p className="text-lg text-muted-foreground mb-2">💡 Tip of the Day</p>
            <p className="text-xl font-display font-semibold text-foreground">
              "Practice a little every day, and you'll be amazed how much you grow!"
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
