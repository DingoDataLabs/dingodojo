import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, LogOut } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  first_name: string | null;
  total_xp: number;
  current_streak: number;
  grade_level: string;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  color: string;
}

export default function Dashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
      } else {
        setProfile(profileData);
      }

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("*")
        .order("name");

      if (subjectsError) {
        console.error("Subjects error:", subjectsError);
      } else {
        setSubjects(subjectsData || []);
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
          <Button
            variant="outline"
            onClick={handleLogout}
            className="rounded-xl gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="stats-card flex items-center gap-4 animate-slide-up stagger-1">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Flame className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Training Streak</p>
              <p className="text-3xl font-display font-bold text-foreground">
                {profile?.current_streak || 0}
                <span className="text-lg ml-1">days</span>
              </p>
            </div>
          </div>

          <div className="stats-card flex items-center gap-4 animate-slide-up stagger-2">
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
        <section className="animate-slide-up stagger-3">
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
                <div className="flex items-center gap-2 opacity-80">
                  <span className="text-sm font-medium">Start training</span>
                  <span className="text-lg">→</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Motivation Section */}
        <section className="mt-8 animate-slide-up stagger-4">
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
