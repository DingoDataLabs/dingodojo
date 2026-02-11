import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, LogOut, Zap, Settings, Compass, Crown, Star, Sparkles, Play, BarChart2, PenTool } from "lucide-react";
import { toast } from "sonner";
import { ProgressRing } from "@/components/ProgressRing";
import { getSydneyWeekStart, isNewWeek, getStreakMessage, isStreakSecured } from "@/lib/weekUtils";
import { getSydneyToday, isNewDay, getDailyStreakMessage, getDailyMissionsRemaining } from "@/lib/dailyUtils";
import { useSmartMission } from "@/hooks/useSmartMission";
import { MyBadges } from "@/components/MyBadges";
import { DojoCrew } from "@/components/DojoCrew";
import { StripeCheckoutModal } from "@/components/StripeCheckoutModal";

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
      // Fetch profile using secure view (excludes stripe_customer_id)
      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
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
          const { data: topicsData } = await supabase.from("topics").select("id, name, slug, subject_id");
          
          if (topicsData) {
            setTopics(topicsData);
            
            // Get all progress for this user
            const { data: progressData } = await supabase
              .from("student_progress")
              .select("topic_id, xp_earned")
              .eq("student_id", profileData.id);

            if (progressData) {
              setTopicProgressData(progressData);
              
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
      // Filter out locked subjects for Explorer users
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/progress")}
              className="rounded-xl"
              title="Progress Report"
            >
              <BarChart2 className="w-5 h-5" />
            </Button>
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
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleUpgrade();
                }}
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
        <div className={`grid ${avgHandwriting !== null ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-4 mb-8`}>
          {/* Streaks (merged) */}
          <div className="stats-card flex items-center gap-3 animate-slide-up stagger-1">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Streaks</p>
              <p className="text-lg font-display font-bold text-foreground">
                🔥 {dailyStreak}d / 📅 {profile?.current_streak || 0}w
              </p>
            </div>
          </div>

          {/* Today's Missions (Explorer only) */}
          {isExplorer ? (
            <div className="stats-card flex items-center gap-3 animate-slide-up stagger-2">
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
            <div className="stats-card flex items-center gap-3 animate-slide-up stagger-2">
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

          {/* Handwriting card (only if submissions exist) */}
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
                {/* Animated background shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                    <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl md:text-2xl font-display font-bold text-white drop-shadow-sm">
                      Start Mission
                    </h3>
                    <p className="text-white/90 text-sm md:text-base font-medium">
                      {smartMission.reasonText}
                    </p>
                  </div>
                </div>
                
                <div className="hidden sm:flex flex-col items-end relative z-10">
                  <span className="text-white/80 text-xs font-medium uppercase tracking-wide">Next up</span>
                  <span className="text-white font-display font-bold text-lg">
                    {smartMission.topicName}
                  </span>
                </div>
                
                <Zap className="w-6 h-6 text-white/80 animate-pulse relative z-10" />
              </div>
            </button>
          </section>
        )}

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
                  <div
                    onClick={() => !locked && navigate(`/subject/${subject.slug}`)}
                    role="button"
                    tabIndex={locked ? -1 : 0}
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
                            onTouchEnd={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleUpgrade();
                            }}
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
            dailyStreak={dailyStreak}
            totalXp={profile?.total_xp || 0}
          />
          <DojoCrew
            profileId={profile?.id || null}
            firstName={profile?.first_name || null}
            totalXp={profile?.total_xp || 0}
            dailyStreak={dailyStreak}
          />
        </section>

        {/* Stripe Checkout Modal */}
        <StripeCheckoutModal
          open={checkoutModalOpen}
          onOpenChange={setCheckoutModalOpen}
          onSuccess={handleCheckoutSuccess}
        />
      </div>
    </div>
  );
}
