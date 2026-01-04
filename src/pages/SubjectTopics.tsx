import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy } from "lucide-react";
import { TopicCard } from "@/components/TopicCard";
import { getSydneyWeekStart, isNewWeek } from "@/lib/weekUtils";

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
  description: string | null;
  emoji: string;
  order_index: number;
}

interface Progress {
  topic_id: string;
  is_completed: boolean;
  xp_earned: number;
  weekly_xp: number;
  week_start_date: string | null;
}

export default function SubjectTopics() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectTotalXp, setSubjectTotalXp] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (slug && user) {
      fetchData();
    }
  }, [slug, user]);

  const fetchData = async () => {
    try {
      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from("subjects")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (subjectError || !subjectData) {
        console.error("Subject error:", subjectError);
        navigate("/");
        return;
      }

      setSubject(subjectData);

      // Fetch topics for this subject
      const { data: topicsData, error: topicsError } = await supabase
        .from("topics")
        .select("*")
        .eq("subject_id", subjectData.id)
        .order("order_index");

      if (topicsError) {
        console.error("Topics error:", topicsError);
      } else {
        setTopics(topicsData || []);
      }

      // Fetch progress
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (profileData && topicsData) {
        const topicIds = topicsData.map((t) => t.id);
        const { data: progressData } = await supabase
          .from("student_progress")
          .select("topic_id, is_completed, xp_earned, weekly_xp, week_start_date")
          .eq("student_id", profileData.id)
          .in("topic_id", topicIds);

        const currentWeekStart = getSydneyWeekStart();
        
        // Process progress data - reset weekly_xp if it's a new week
        const processedProgress = (progressData || []).map((p) => ({
          ...p,
          xp_earned: p.xp_earned || 0,
          weekly_xp: isNewWeek(p.week_start_date) ? 0 : (p.weekly_xp || 0),
        }));

        setProgress(processedProgress);

        // Calculate total XP for this subject
        const totalXp = processedProgress.reduce((sum, p) => sum + (p.xp_earned || 0), 0);
        setSubjectTotalXp(totalXp);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTopicProgress = (topicId: string): { xpEarned: number; weeklyXp: number } => {
    const p = progress.find((p) => p.topic_id === topicId);
    return {
      xpEarned: p?.xp_earned || 0,
      weeklyXp: p?.weekly_xp || 0,
    };
  };

  const getHeaderGradient = (color: string) => {
    switch (color) {
      case "eucalyptus":
        return "from-eucalyptus to-eucalyptus-light";
      case "sky":
        return "from-sky to-sky-light";
      default:
        return "from-ochre to-ochre-light";
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-float mb-4">📚</div>
          <p className="text-muted-foreground text-lg animate-pulse">Loading topics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className={`bg-gradient-to-r ${getHeaderGradient(subject?.color || "ochre")} text-primary-foreground p-6 pb-12 animate-slide-up`}
      >
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 -ml-2"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dojo
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-6xl">{subject?.emoji}</span>
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold">
                  {subject?.name}
                </h1>
                <p className="opacity-80 text-lg">
                  {topics.length} topics to master
                </p>
              </div>
            </div>
            {/* Subject Total XP */}
            <div className="hidden sm:flex items-center gap-2 bg-primary-foreground/10 rounded-2xl px-4 py-2">
              <Trophy className="w-5 h-5" />
              <span className="font-display font-bold text-xl">{subjectTotalXp.toLocaleString()} XP</span>
            </div>
          </div>
        </div>
      </header>

      {/* Topics List */}
      <main className="max-w-4xl mx-auto p-4 md:p-6 -mt-6">
        <div className="space-y-3">
          {topics.map((topic, index) => {
            const { xpEarned, weeklyXp } = getTopicProgress(topic.id);
            return (
              <TopicCard
                key={topic.id}
                topic={topic}
                xpEarned={xpEarned}
                weeklyXp={weeklyXp}
                onClick={() => navigate(`/learn/${subject?.slug}/${topic.slug}`)}
                animationDelay={`${0.05 * (index + 1)}s`}
              />
            );
          })}
        </div>

        {topics.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No topics available yet. Check back soon!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
