import { useState, useEffect } from "react";
import dingoLogo from "@/assets/dingo-logo.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, ChevronRight, ChevronLeft, LogOut } from "lucide-react";

type ConfidenceLevel = "tricky" | "okay" | "strong";

interface SubjectConfidence {
  id: string;
  name: string;
  emoji: string;
  confidence: ConfidenceLevel | null;
}

const confidenceOptions: { level: ConfidenceLevel; emoji: string; label: string }[] = [
  { level: "tricky", emoji: "😬", label: "Tricky" },
  { level: "okay", emoji: "🙂", label: "Okay" },
  { level: "strong", emoji: "😎", label: "Strong" },
];

const XP_MAP: Record<ConfidenceLevel, number> = {
  tricky: 0,
  okay: 50,
  strong: 150,
};

export default function Onboarding() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [gradeLevel, setGradeLevel] = useState("Year 5");
  const [subjects, setSubjects] = useState<SubjectConfidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, onboarding_completed")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (profile?.onboarding_completed) {
      navigate("/dashboard");
      return;
    }

    if (profile) {
      setProfileId(profile.id);
    }

    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("id, name, emoji")
      .order("name");

    if (subjectsData) {
      setSubjects(
        subjectsData.map((s) => ({
          id: s.id,
          name: s.name,
          emoji: s.emoji || "📚",
          confidence: null,
        }))
      );
    }
  };

  const setConfidence = (subjectId: string, level: ConfidenceLevel) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === subjectId ? { ...s, confidence: level } : s))
    );
  };

  const allRated = subjects.every((s) => s.confidence !== null);

  const handleComplete = async () => {
    if (!profileId) return;
    setLoading(true);

    try {
      await supabase
        .from("profiles")
        .update({ grade_level: gradeLevel, onboarding_completed: true })
        .eq("id", profileId);

      // Fetch all topics grouped by subject
      const { data: topicsData } = await supabase
        .from("topics")
        .select("id, subject_id");

      if (topicsData) {
        const progressRecords = topicsData
          .map((topic) => {
            const subject = subjects.find((s) => s.id === topic.subject_id);
            if (!subject?.confidence) return null;
            return {
              student_id: profileId,
              topic_id: topic.id,
              xp_earned: XP_MAP[subject.confidence],
            };
          })
          .filter(Boolean);

        if (progressRecords.length > 0) {
          await supabase.from("student_progress").insert(progressRecords);
        }
      }

      toast.success("Welcome to Dingo Dojo! Let's start training! 🦊");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error("Something went wrong. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  const gradeOptions = ["Year 5", "Year 6"];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Logout Button */}
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="rounded-xl gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <img src={dingoLogo} alt="Dingo Dojo" className="w-16 h-16 mx-auto mb-4 animate-float" />
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            Welcome to the Dojo!
          </h1>
          <p className="text-muted-foreground text-lg">
            Let's set up your training profile
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 2 && (
                <div
                  className={`w-12 h-1 rounded-full transition-all ${
                    step > s ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bento-card bg-card p-8 animate-slide-up">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  What year are you in?
                </h2>
                <p className="text-muted-foreground">
                  This helps us give you the right level of challenges
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                {gradeOptions.map((grade) => (
                  <button
                    key={grade}
                    onClick={() => setGradeLevel(grade)}
                    className={`p-6 rounded-2xl border-2 transition-all text-center ${
                      gradeLevel === grade
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-3xl mb-2 block">🎒</span>
                    <span className="text-xl font-display font-bold text-foreground">{grade}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  How do you feel about each subject?
                </h2>
                <p className="text-muted-foreground">
                  Tap how you feel — there's no wrong answer!
                </p>
              </div>

              <div className="space-y-4">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="rounded-2xl border-2 border-border p-4 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{subject.emoji}</span>
                      <span className="text-lg font-display font-bold text-foreground">
                        {subject.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {confidenceOptions.map((opt) => {
                        const isSelected = subject.confidence === opt.level;
                        return (
                          <button
                            key={opt.level}
                            onClick={() => setConfidence(subject.id, opt.level)}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                              isSelected
                                ? opt.level === "strong"
                                  ? "border-eucalyptus bg-eucalyptus/10"
                                  : opt.level === "okay"
                                  ? "border-primary bg-primary/10"
                                  : "border-ochre bg-ochre/10"
                                : "border-transparent hover:bg-muted"
                            }`}
                          >
                            <span className="text-3xl">{opt.emoji}</span>
                            <span className={`text-xs font-semibold ${
                              isSelected ? "text-foreground" : "text-muted-foreground"
                            }`}>
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="rounded-xl gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step === 1 ? (
              <Button
                onClick={() => setStep(2)}
                className="rounded-xl gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={loading || !allRated}
                className="rounded-xl gap-2 px-8"
              >
                {loading ? "Setting up..." : "Start Training! 🎯"}
              </Button>
            )}
          </div>
        </div>

        {/* Skip option */}
        {step === 2 && (
          <p className="text-center text-muted-foreground mt-4">
            <button
              onClick={handleComplete}
              className="hover:text-primary transition-colors underline"
            >
              Skip this step
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
