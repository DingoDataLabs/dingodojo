import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Trophy, Flame, Target, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

interface Profile {
  id: string;
  total_xp: number;
  current_streak: number;
  weekly_xp_earned: number;
  weekly_xp_goal: number;
}

interface SubjectProgress {
  subjectName: string;
  emoji: string;
  completedTopics: number;
  totalTopics: number;
  xpEarned: number;
}

interface HandwritingSubmission {
  id: string;
  image_path: string | null;
  letter_formation: number;
  spacing_sizing: number;
  presentation: number;
  composite_score: number;
  created_at: string;
}

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [handwritingData, setHandwritingData] = useState<HandwritingSubmission[]>([]);
  const [missionsCompleted, setMissionsCompleted] = useState(0);
  const [topicsMastered, setTopicsMastered] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    try {
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (!profileData) { setLoading(false); return; }
      setProfile(profileData);

      // Subjects + topics + progress in parallel
      const [subjectsRes, topicsRes, progressRes, hwRes] = await Promise.all([
        supabase.from("subjects").select("id, name, emoji").order("name"),
        supabase.from("topics").select("id, subject_id"),
        supabase.from("student_progress").select("topic_id, xp_earned, missions_this_week").eq("student_id", profileData.id),
        supabase.from("handwriting_submissions").select("id, image_path, letter_formation, spacing_sizing, presentation, composite_score, created_at").eq("profile_id", profileData.id).order("created_at", { ascending: true }),
      ]);

      const subjects = subjectsRes.data || [];
      const topics = topicsRes.data || [];
      const progress = progressRes.data || [];

      // Calculate missions completed (sum of all missions_this_week across all progress records + profile level)
      const totalMissions = progress.reduce((sum, p) => sum + (p.missions_this_week || 0), 0);
      setMissionsCompleted(totalMissions);

      // Topics mastered (xp >= 500)
      const mastered = progress.filter(p => (p.xp_earned || 0) >= 500).length;
      setTopicsMastered(mastered);

      // Subject progress
      const sp: SubjectProgress[] = subjects.map(s => {
        const subjectTopics = topics.filter(t => t.subject_id === s.id);
        const completed = subjectTopics.filter(t => {
          const p = progress.find(pr => pr.topic_id === t.id);
          return p && (p.xp_earned || 0) >= 500;
        }).length;
        const xp = subjectTopics.reduce((sum, t) => {
          const p = progress.find(pr => pr.topic_id === t.id);
          return sum + (p?.xp_earned || 0);
        }, 0);
        return {
          subjectName: s.name,
          emoji: s.emoji || "📚",
          completedTopics: completed,
          totalTopics: subjectTopics.length,
          xpEarned: xp,
        };
      }).filter(s => s.totalTopics > 0);

      setSubjectProgress(sp);
      setHandwritingData(hwRes.data || []);
    } catch (err) {
      console.error("Error fetching progress:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("handwriting-submissions").getPublicUrl(path);
    return data.publicUrl;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-float mb-4">📊</div>
          <p className="text-muted-foreground text-lg animate-pulse">Loading progress...</p>
        </div>
      </div>
    );
  }

  const chartConfig = {
    composite: { label: "Overall", color: "hsl(var(--primary))" },
    letter: { label: "Letter Formation", color: "hsl(var(--secondary))" },
    spacing: { label: "Spacing & Sizing", color: "hsl(var(--accent))" },
    presentation: { label: "Presentation", color: "hsl(var(--destructive))" },
  };

  const chartData = handwritingData.map(h => ({
    date: formatDate(h.created_at),
    composite: h.composite_score,
    letter: h.letter_formation,
    spacing: h.spacing_sizing,
    presentation: h.presentation,
  }));

  const recentSubmissions = [...handwritingData]
    .reverse()
    .filter(h => h.image_path)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Progress Report</h1>
              <p className="text-muted-foreground">Your learning journey</p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => window.print()} className="rounded-xl">
            <Printer className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Section 1: Summary */}
          <div className="bento-card bg-card p-6 animate-slide-up">
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              📋 Summary
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <Trophy className="w-6 h-6 text-primary mx-auto mb-1" />
                <p className="text-2xl font-display font-bold text-foreground">{profile?.total_xp?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">Total XP</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <Target className="w-6 h-6 text-secondary mx-auto mb-1" />
                <p className="text-2xl font-display font-bold text-foreground">{missionsCompleted}</p>
                <p className="text-xs text-muted-foreground">Missions</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <BookOpen className="w-6 h-6 text-accent mx-auto mb-1" />
                <p className="text-2xl font-display font-bold text-foreground">{topicsMastered}</p>
                <p className="text-xs text-muted-foreground">Topics Mastered</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <Flame className="w-6 h-6 text-destructive mx-auto mb-1" />
                <p className="text-2xl font-display font-bold text-foreground">
                  {profile?.current_streak || 0}w
                </p>
                <p className="text-xs text-muted-foreground">Weekly Streak</p>
              </div>
            </div>
          </div>

          {/* Section 2: Subjects */}
          <div className="bento-card bg-card p-6 animate-slide-up stagger-1">
            <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
              📚 Subjects
            </h2>
            <div className="space-y-4">
              {subjectProgress.map(s => (
                <div key={s.subjectName} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-2">
                      <span>{s.emoji}</span> {s.subjectName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.completedTopics}/{s.totalTopics} topics · {s.xpEarned.toLocaleString()} XP
                    </span>
                  </div>
                  <Progress
                    value={s.totalTopics > 0 ? (s.completedTopics / s.totalTopics) * 100 : 0}
                    className="h-2"
                  />
                </div>
              ))}
              {subjectProgress.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No progress yet — start a mission! 🥋</p>
              )}
            </div>
          </div>

          {/* Section 3: Handwriting Progress */}
          {handwritingData.length > 0 && (
            <div className="bento-card bg-card p-6 animate-slide-up stagger-2">
              <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
                ✍️ Handwriting Progress
              </h2>

              {/* Main composite chart */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-foreground mb-2">Overall Score</p>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis domain={[0, 5]} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="composite" stroke="var(--color-composite)" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ChartContainer>
              </div>

              {/* Individual criteria charts */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: "letter", label: "Letter Formation", color: "composite" },
                  { key: "spacing", label: "Spacing & Sizing", color: "spacing" },
                  { key: "presentation", label: "Presentation", color: "presentation" },
                ].map(c => (
                  <div key={c.key}>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{c.label}</p>
                    <ChartContainer config={chartConfig} className="h-[120px] w-full">
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" fontSize={10} tick={false} />
                        <YAxis domain={[0, 5]} fontSize={10} />
                        <Line type="monotone" dataKey={c.key} stroke={`var(--color-${c.color})`} strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ChartContainer>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Recent Submissions */}
          {recentSubmissions.length > 0 && (
            <div className="bento-card bg-card p-6 animate-slide-up stagger-3">
              <h2 className="text-xl font-display font-bold text-foreground mb-4 flex items-center gap-2">
                📸 Recent Submissions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {recentSubmissions.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => sub.image_path && window.open(getPublicUrl(sub.image_path), "_blank")}
                    className="relative rounded-xl overflow-hidden border border-border aspect-square group"
                  >
                    <img
                      src={getPublicUrl(sub.image_path!)}
                      alt="Handwriting submission"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-white text-xs font-bold">{sub.composite_score?.toFixed(1)}/5</p>
                      <p className="text-white/70 text-[10px]">{formatDate(sub.created_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
