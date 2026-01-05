import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";

interface Topic {
  id: string;
  name: string;
  emoji: string;
  subject_name: string;
}

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [gradeLevel, setGradeLevel] = useState("Year 5");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [confidentTopics, setConfidentTopics] = useState<string[]>([]);
  const [challengingTopics, setChallengingTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    // Fetch profile
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

    // Fetch all topics with subject names
    const { data: subjectsData } = await supabase
      .from("subjects")
      .select("id, name");
    
    const { data: topicsData } = await supabase
      .from("topics")
      .select("id, name, emoji, subject_id")
      .order("order_index");

    if (topicsData && subjectsData) {
      const subjectMap = Object.fromEntries(subjectsData.map(s => [s.id, s.name]));
      setTopics(topicsData.map(t => ({
        id: t.id,
        name: t.name,
        emoji: t.emoji || "📖",
        subject_name: subjectMap[t.subject_id] || "Unknown"
      })));
    }
  };

  const toggleConfident = (topicId: string) => {
    if (confidentTopics.includes(topicId)) {
      setConfidentTopics(prev => prev.filter(id => id !== topicId));
    } else if (confidentTopics.length < 5) {
      // Remove from challenging if selected there
      setChallengingTopics(prev => prev.filter(id => id !== topicId));
      setConfidentTopics(prev => [...prev, topicId]);
    }
  };

  const toggleChallenging = (topicId: string) => {
    if (challengingTopics.includes(topicId)) {
      setChallengingTopics(prev => prev.filter(id => id !== topicId));
    } else if (challengingTopics.length < 5) {
      // Remove from confident if selected there
      setConfidentTopics(prev => prev.filter(id => id !== topicId));
      setChallengingTopics(prev => [...prev, topicId]);
    }
  };

  const handleComplete = async () => {
    if (!profileId) return;
    setLoading(true);

    try {
      // Update profile with grade level and mark onboarding complete
      await supabase
        .from("profiles")
        .update({
          grade_level: gradeLevel,
          onboarding_completed: true,
        })
        .eq("id", profileId);

      // Create initial progress records for selected topics
      const progressRecords = [];

      // Confident topics start at Consolidating level (150+ XP)
      for (const topicId of confidentTopics) {
        progressRecords.push({
          student_id: profileId,
          topic_id: topicId,
          xp_earned: 150, // Start at Consolidating level
        });
      }

      // Challenging topics start at lower XP (Beginning level)
      for (const topicId of challengingTopics) {
        progressRecords.push({
          student_id: profileId,
          topic_id: topicId,
          xp_earned: 0, // Start at Beginning level
        });
      }

      if (progressRecords.length > 0) {
        await supabase.from("student_progress").insert(progressRecords);
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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="text-6xl mb-4 animate-float">🦊</div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            Welcome to the Dojo!
          </h1>
          <p className="text-muted-foreground text-lg">
            Let's set up your training profile
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
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
              {s < 3 && (
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
                  What are you confident with? 💪
                </h2>
                <p className="text-muted-foreground">
                  Select 3-5 topics you feel good about ({confidentTopics.length}/5 selected)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto scrollbar-thin p-1">
                {topics.map((topic) => {
                  const isSelected = confidentTopics.includes(topic.id);
                  const isDisabled = !isSelected && confidentTopics.length >= 5;
                  const isChallenging = challengingTopics.includes(topic.id);

                  return (
                    <button
                      key={topic.id}
                      onClick={() => toggleConfident(topic.id)}
                      disabled={isDisabled || isChallenging}
                      className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                        isSelected
                          ? "border-eucalyptus bg-eucalyptus/10"
                          : isChallenging
                          ? "border-border bg-muted/50 opacity-50"
                          : isDisabled
                          ? "border-border opacity-50 cursor-not-allowed"
                          : "border-border hover:border-eucalyptus/50"
                      }`}
                    >
                      <span className="text-2xl">{topic.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{topic.name}</p>
                        <p className="text-sm text-muted-foreground">{topic.subject_name}</p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-eucalyptus flex items-center justify-center">
                          <Check className="w-4 h-4 text-secondary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                  What's more challenging? 🎯
                </h2>
                <p className="text-muted-foreground">
                  Select 3-5 topics you want to improve ({challengingTopics.length}/5 selected)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto scrollbar-thin p-1">
                {topics.map((topic) => {
                  const isSelected = challengingTopics.includes(topic.id);
                  const isDisabled = !isSelected && challengingTopics.length >= 5;
                  const isConfident = confidentTopics.includes(topic.id);

                  return (
                    <button
                      key={topic.id}
                      onClick={() => toggleChallenging(topic.id)}
                      disabled={isDisabled || isConfident}
                      className={`p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3 ${
                        isSelected
                          ? "border-ochre bg-ochre/10"
                          : isConfident
                          ? "border-border bg-muted/50 opacity-50"
                          : isDisabled
                          ? "border-border opacity-50 cursor-not-allowed"
                          : "border-border hover:border-ochre/50"
                      }`}
                    >
                      <span className="text-2xl">{topic.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{topic.name}</p>
                        <p className="text-sm text-muted-foreground">{topic.subject_name}</p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-ochre flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            {step > 1 ? (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="rounded-xl gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 2 && confidentTopics.length < 3}
                className="rounded-xl gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={loading || challengingTopics.length < 3}
                className="rounded-xl gap-2 px-8"
              >
                {loading ? "Setting up..." : "Start Training! 🎯"}
              </Button>
            )}
          </div>
        </div>

        {/* Skip option */}
        {step === 2 || step === 3 ? (
          <p className="text-center text-muted-foreground mt-4">
            <button
              onClick={() => step === 2 ? setStep(3) : handleComplete()}
              className="hover:text-primary transition-colors underline"
            >
              Skip this step
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}