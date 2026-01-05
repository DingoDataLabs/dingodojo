import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, LogOut, Zap, Settings, Compass, Lock } from "lucide-react";
import { toast } from "sonner";
import { ProgressRing } from "@/components/ProgressRing";
import { getSydneyWeekStart, isNewWeek, getStreakMessage, isStreakSecured } from "@/lib/weekUtils";

interface Profile {
  id: string;
  first_name: string | null;
  total_xp: number;
  current_streak: number;
  grade_level: string;
  missions_this_week: number;
  week_start_date: string | null;
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
    }
  }, [user]);

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

        // Check if it's a new week and handle streak logic
        const currentWeekStart = getSydneyWeekStart();
        const wasNewWeek = isNewWeek(profileData.week_start_date);

        if (wasNewWeek && profileData.week_start_date) {
          // It's a new week - check if previous week had 5+ missions
          const previousMissions = profileData.missions_this_week || 0;
          const newStreak = previousMissions >= 5 
            ? (profileData.current_streak || 0) + 1 
            : 0;

          // Update profile with reset missions and updated streak
          await supabase
            .from("profiles")
            .update({
              missions_this_week: 0,
              week_start_date: currentWeekStart,
              current_streak: newStreak,
            })
            .eq("id", profileData.id);

          setProfile({
            ...profileData,
            missions_this_week: 0,
            week_start_date: currentWeekStart,
            current_streak: newStreak,
          });
        } else if (!profileData.week_start_date) {
          // First time - initialize week_start_date
          await supabase
            .from("profiles")
            .update({ week_start_date: currentWeekStart })
            .eq("id", profileData.id);

          setProfile({
            ...profileData,
            week_start_date: currentWeekStart,
          });
        } else {
          setProfile(profileData);
        }

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

  const getSubjectCardClass = (color: string) => {
    switch (color) {
      case "eucalyptus":
        return "subject-card-eucalyptus";
      case "sky":
        return "subject-card-sky";
      default:
        return "subject-card-ochre";
    }
  };

  const missionsThisWeek = profile?.missions_this_week || 0;
  const missionsProgress = Math.min(100, (missionsThisWeek / 5) * 100);
  const streakMessage = getStreakMessage(missionsThisWeek);
  const streakSecured = isStreakSecured(missionsThisWeek);
  const isExplorer = profile?.subscription_tier !== "champion";
  const missionsRemaining = isExplorer ? Math.max(0, 5 - missionsThisWeek) : null;

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
                    {missionsRemaining === 0 
                      ? "You've used all 5 missions this week!" 
                      : `${missionsRemaining} mission${missionsRemaining === 1 ? '' : 's'} left this week`}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl gap-2" disabled>
                <Lock className="w-4 h-4" />
                Champion Coming Soon
              </Button>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Training Streak */}
          <div className="stats-card flex items-center gap-4 animate-slide-up stagger-1">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Flame className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Training Streak</p>
              <p className="text-3xl font-display font-bold text-foreground">
                {profile?.current_streak || 0}
                <span className="text-lg ml-1">weeks</span>
              </p>
            </div>
          </div>

          {/* Missions This Week */}
          <div className="stats-card flex items-center gap-4 animate-slide-up stagger-2">
            <ProgressRing
              progress={missionsProgress}
              size={56}
              strokeWidth={5}
              colorClass={streakSecured ? "stroke-eucalyptus" : "stroke-ochre"}
            >
              <Zap className={`w-5 h-5 ${streakSecured ? "text-eucalyptus" : "text-ochre"}`} />
            </ProgressRing>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Missions This Week</p>
              <p className="text-2xl font-display font-bold text-foreground">
                {missionsThisWeek}/5
              </p>
              <p className={`text-xs font-medium ${streakSecured ? "text-eucalyptus" : "text-ochre"}`}>
                {streakMessage}
              </p>
            </div>
          </div>

          {/* Total XP */}
          <div className="stats-card flex items-center gap-4 animate-slide-up stagger-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total XP</p>
              <p className="text-3xl font-display font-bold text-foreground">
                {profile?.total_xp?.toLocaleString() || 0}
                <span className="text-lg ml-1">XP</span>
              </p>
            </div>
          </div>
        </div>

        {/* Subject Cards - Bento Grid */}
        <section className="animate-slide-up stagger-4">
          <h2 className="text-xl font-display font-bold mb-4 text-foreground">
            Choose Your Training 🎯
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {subjects.map((subject, index) => (
              <button
                key={subject.id}
                onClick={() => navigate(`/subject/${subject.slug}`)}
                className={`bento-card ${getSubjectCardClass(subject.color)} text-left p-8 min-h-[180px] flex flex-col justify-between transition-all active:scale-[0.98]`}
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                <div>
                  <span className="text-5xl mb-4 block">{subject.emoji}</span>
                  <h3 className="text-3xl font-display font-bold mb-2">{subject.name}</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 opacity-80">
                    <span className="text-sm font-medium">Start training</span>
                    <span className="text-lg">→</span>
                  </div>
                  {subjectXps[subject.id] > 0 && (
                    <span className="bg-primary-foreground/20 rounded-full px-3 py-1 text-sm font-medium">
                      {subjectXps[subject.id].toLocaleString()} XP
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Motivation Section */}
        <section className="mt-8 animate-slide-up stagger-5">
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
