import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Sparkles, CheckCircle, Loader2, ChevronRight, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { getSydneyWeekStart, isNewWeek } from "@/lib/weekUtils";

interface Topic {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  description: string | null;
  subject_id: string;
}

interface Subject {
  id: string;
  slug: string;
}

interface CheckQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  hint: string;
  explanation: string;
  points?: number;
}

interface LessonSection {
  type: "learn" | "check";
  title?: string;
  content?: string;
  question?: string;
  options?: string[];
  correct_answer?: number;
  hint?: string;
  explanation?: string;
}

interface FinalChallenge {
  title: string;
  description: string;
  questions: CheckQuestion[];
}

interface LessonContent {
  title: string;
  emoji: string;
  difficulty_level: string;
  fun_fact: string;
  sections: LessonSection[];
  final_challenge: FinalChallenge;
  total_xp: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Profile {
  id: string;
  total_xp: number;
  grade_level: string;
  subscription_tier: string;
  missions_this_week: number;
  week_start_date: string | null;
}

interface StudentProgress {
  xp_earned: number;
  weekly_xp: number;
  week_start_date: string | null;
  missions_this_week: number;
}

export default function TrainingSession() {
  const { subjectSlug, topicSlug } = useParams<{ subjectSlug: string; topicSlug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [topicXp, setTopicXp] = useState(0);

  // Lesson progression state
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionAnswers, setSectionAnswers] = useState<Record<number, number | null>>({});
  const [sectionCompleted, setSectionCompleted] = useState<Record<number, boolean>>({});
  const [showSectionHint, setShowSectionHint] = useState<Record<number, boolean>>({});
  const [sectionAttempts, setSectionAttempts] = useState<Record<number, number>>({});

  // Final challenge state
  const [inFinalChallenge, setInFinalChallenge] = useState(false);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [challengeAnswers, setChallengeAnswers] = useState<Record<number, number | null>>({});
  const [challengeCompleted, setChallengeCompleted] = useState<Record<number, boolean>>({});
  const [showChallengeHint, setShowChallengeHint] = useState<Record<number, boolean>>({});
  const [challengeAttempts, setChallengeAttempts] = useState<Record<number, number>>({});
  const [earnedXp, setEarnedXp] = useState(0);
  const [missionComplete, setMissionComplete] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "G'day! I'm Mirri, your study buddy! 🦘 Work through the lesson on the left, and ask me if you need help with any questions. I'll give you hints to guide you - no worries!",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lessonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (topicSlug && user) {
      fetchTopicAndLesson();
      fetchProfile();
    }
  }, [topicSlug, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, total_xp, grade_level, subscription_tier, missions_this_week, week_start_date")
      .eq("user_id", user?.id)
      .maybeSingle();
    
    if (data) {
      // Check mission limit for Explorer tier
      const currentWeekStart = getSydneyWeekStart();
      const profileIsNewWeek = isNewWeek(data.week_start_date);
      const effectiveMissions = profileIsNewWeek ? 0 : (data.missions_this_week || 0);
      
      if (data.subscription_tier !== "champion" && effectiveMissions >= 5) {
        toast.error("You've completed all 5 missions this week! Come back next week or upgrade to Champion.");
        navigate("/dashboard");
        return;
      }
      
      setProfile(data);
    }
  };

  const fetchTopicXp = async (topicId: string, profileId: string) => {
    const { data } = await supabase
      .from("student_progress")
      .select("xp_earned")
      .eq("topic_id", topicId)
      .eq("student_id", profileId)
      .maybeSingle();
    
    return (data as StudentProgress)?.xp_earned || 0;
  };

  const fetchTopicAndLesson = async () => {
    try {
      // Fetch topic with subject
      const { data: topicData, error: topicError } = await supabase
        .from("topics")
        .select("*, subjects!inner(id, slug)")
        .eq("slug", topicSlug)
        .maybeSingle();

      if (topicError || !topicData) {
        console.error("Topic error:", topicError);
        navigate("/");
        return;
      }

      const subjectData = (topicData as any).subjects as Subject;
      setTopic(topicData);
      setSubject(subjectData);

      // Get profile first to fetch topic XP
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, total_xp, grade_level, subscription_tier, missions_this_week, week_start_date")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
        const xp = await fetchTopicXp(topicData.id, profileData.id);
        setTopicXp(xp);
      }

      // Check for existing generated module
      const { data: moduleData } = await supabase
        .from("generated_modules")
        .select("content_json")
        .eq("topic_id", topicData.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (moduleData?.content_json) {
        const content = moduleData.content_json as unknown as LessonContent;
        // Check if it's the new format with sections
        if (content.sections && content.final_challenge) {
          setLessonContent(content);
        } else {
          // Old format, regenerate
          await generateLesson(topicData, subjectData, profileData?.grade_level, profileData?.id ? await fetchTopicXp(topicData.id, profileData.id) : 0);
        }
        setLoading(false);
      } else {
        await generateLesson(topicData, subjectData, profileData?.grade_level, topicXp);
      }
    } catch (err) {
      console.error("Error:", err);
      setLoading(false);
    }
  };

  const generateLesson = async (topicData: Topic, subjectData: Subject, gradeLevel?: string, xp?: number) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson", {
        body: { 
          topicName: topicData.name, 
          topicEmoji: topicData.emoji,
          gradeLevel: gradeLevel || "Year 5",
          topicXp: xp || 0,
          subjectSlug: subjectData.slug
        },
      });

      if (error) throw error;

      if (data?.content) {
        setLessonContent(data.content);

        // Save to database
        await supabase.from("generated_modules").insert({
          topic_id: topicData.id,
          content_json: data.content,
        });
      }
    } catch (err) {
      console.error("Generation error:", err);
      toast.error("Couldn't generate the lesson. Please try again!");
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const getCurrentSection = () => {
    if (!lessonContent) return null;
    return lessonContent.sections[currentSectionIndex];
  };

  const handleSectionAnswer = (sectionIdx: number, answerIdx: number) => {
    if (sectionCompleted[sectionIdx]) return;
    setSectionAnswers(prev => ({ ...prev, [sectionIdx]: answerIdx }));
  };

  const checkSectionAnswer = (sectionIdx: number) => {
    const section = lessonContent?.sections[sectionIdx];
    if (!section || section.type !== "check") return;

    const selectedAnswer = sectionAnswers[sectionIdx];
    if (selectedAnswer === null || selectedAnswer === undefined) {
      toast.error("Pick an answer first!");
      return;
    }

    const attempts = (sectionAttempts[sectionIdx] || 0) + 1;
    setSectionAttempts(prev => ({ ...prev, [sectionIdx]: attempts }));

    const isCorrect = selectedAnswer === section.correct_answer;
    
    if (isCorrect) {
      setSectionCompleted(prev => ({ ...prev, [sectionIdx]: true }));
      toast.success("Brilliant! You got it! 🎉");
      setEarnedXp(prev => prev + 10);
    } else {
      // Don't reveal the answer - show hint and encourage retry
      setShowSectionHint(prev => ({ ...prev, [sectionIdx]: true }));
      toast("Not quite right - check the hint and try again! 💪", { icon: "🤔" });
      
      // Auto-message Mirri for help
      if (attempts >= 2) {
        const helpMessage = `I'm stuck on this question: "${section.question}"`;
        sendMessageWithContext(helpMessage, {
          question: section.question!,
          options: section.options!,
          correct_answer: section.correct_answer!,
          hint: section.hint!,
          explanation: section.explanation!,
        }, selectedAnswer);
      }
      
      // Reset selection for retry
      setSectionAnswers(prev => ({ ...prev, [sectionIdx]: null }));
    }
  };

  const proceedToNext = () => {
    if (!lessonContent) return;

    if (currentSectionIndex < lessonContent.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      lessonRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Move to final challenge
      setInFinalChallenge(true);
      lessonRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleChallengeAnswer = (questionIdx: number, answerIdx: number) => {
    if (challengeCompleted[questionIdx]) return;
    setChallengeAnswers(prev => ({ ...prev, [questionIdx]: answerIdx }));
  };

  const checkChallengeAnswer = (questionIdx: number) => {
    const question = lessonContent?.final_challenge.questions[questionIdx];
    if (!question) return;

    const selectedAnswer = challengeAnswers[questionIdx];
    if (selectedAnswer === null || selectedAnswer === undefined) {
      toast.error("Pick an answer first!");
      return;
    }

    const attempts = (challengeAttempts[questionIdx] || 0) + 1;
    setChallengeAttempts(prev => ({ ...prev, [questionIdx]: attempts }));

    const isCorrect = selectedAnswer === question.correct_answer;
    
    if (isCorrect) {
      setChallengeCompleted(prev => ({ ...prev, [questionIdx]: true }));
      const points = question.points || 20;
      setEarnedXp(prev => prev + points);
      toast.success(`Correct! +${points} XP 🎉`);
      
      // Move to next question or complete
      if (questionIdx < lessonContent!.final_challenge.questions.length - 1) {
        setTimeout(() => setCurrentChallengeIndex(questionIdx + 1), 1000);
      }
    } else {
      setShowChallengeHint(prev => ({ ...prev, [questionIdx]: true }));
      toast("Good try! Check the hint and have another go! 💪", { icon: "🤔" });
      
      // Auto-message Mirri for help after 2 attempts
      if (attempts >= 2) {
        const helpMessage = `I need help with this challenge question: "${question.question}"`;
        sendMessageWithContext(helpMessage, question, selectedAnswer);
      }
      
      setChallengeAnswers(prev => ({ ...prev, [questionIdx]: null }));
    }
  };

  const allChallengesComplete = () => {
    if (!lessonContent) return false;
    return lessonContent.final_challenge.questions.every((_, idx) => challengeCompleted[idx]);
  };

  const completeMission = async () => {
    if (!profile || !topic) return;

    try {
      const totalXp = earnedXp;
      const currentWeekStart = getSydneyWeekStart();

      // Fetch current profile data for missions_this_week
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("total_xp, missions_this_week, week_start_date, current_streak")
        .eq("id", profile.id)
        .maybeSingle();

      const profileMissionsNewWeek = isNewWeek(currentProfile?.week_start_date);
      const profileMissionsThisWeek = profileMissionsNewWeek ? 0 : (currentProfile?.missions_this_week || 0);

      // Handle streak calculation if it's a new week
      let newStreak = currentProfile?.current_streak || 0;
      if (profileMissionsNewWeek && currentProfile?.week_start_date) {
        // Previous week ended - check if they completed 5+ missions
        const prevMissions = currentProfile?.missions_this_week || 0;
        newStreak = prevMissions >= 5 ? newStreak + 1 : 0;
      }

      // Update profile with XP and mission count
      await supabase
        .from("profiles")
        .update({
          total_xp: (currentProfile?.total_xp || 0) + totalXp,
          missions_this_week: profileMissionsThisWeek + 1,
          week_start_date: currentWeekStart,
          current_streak: newStreak,
        })
        .eq("id", profile.id);

      // Fetch existing progress for this topic
      const { data: existingProgress } = await supabase
        .from("student_progress")
        .select("xp_earned, weekly_xp, week_start_date, missions_this_week")
        .eq("student_id", profile.id)
        .eq("topic_id", topic.id)
        .maybeSingle();

      const topicIsNewWeek = isNewWeek(existingProgress?.week_start_date);
      const existingXp = (existingProgress as StudentProgress)?.xp_earned || 0;
      const existingWeeklyXp = topicIsNewWeek ? 0 : ((existingProgress as StudentProgress)?.weekly_xp || 0);
      const existingMissions = topicIsNewWeek ? 0 : ((existingProgress as StudentProgress)?.missions_this_week || 0);

      const newXpEarned = existingXp + totalXp;
      const isMastered = newXpEarned >= 500;

      // Update or create progress with weekly tracking
      await supabase.from("student_progress").upsert({
        student_id: profile.id,
        topic_id: topic.id,
        is_completed: isMastered,
        xp_earned: newXpEarned,
        weekly_xp: existingWeeklyXp + totalXp,
        week_start_date: currentWeekStart,
        missions_this_week: existingMissions + 1,
      }, {
        onConflict: "student_id,topic_id",
      });

      setMissionComplete(true);

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#D97706", "#059669", "#0EA5E9", "#F59E0B"],
      });

      toast.success(`+${totalXp} XP earned! You're amazing! 🏆`);

      setTimeout(() => {
        navigate(`/subject/${subjectSlug}`);
      }, 2500);
    } catch (err) {
      console.error("Error completing mission:", err);
      toast.error("Something went wrong!");
    }
  };

  const sendMessageWithContext = async (message: string, currentQuestion?: CheckQuestion, studentAnswer?: number) => {
    setMessages(prev => [...prev, { role: "user", content: message }]);
    setIsChatLoading(true);

    try {
      const chatMessages = messages
        .filter((m, idx) => !(m.role === "assistant" && idx === 0))
        .concat([{ role: "user" as const, content: message }]);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-tutor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: chatMessages,
            topicName: topic?.name,
            lessonContent,
            currentQuestion,
            studentAnswer,
            gradeLevel: profile?.grade_level,
          }),
        }
      );

      if (!response.ok) throw new Error("Chat failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && !line.includes("[DONE]")) {
            try {
              const json = JSON.parse(line.slice(6));
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: assistantMessage,
                  };
                  return newMessages;
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Oops! Something went wrong. Can you try asking again? 🤔",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;
    const userMessage = inputMessage.trim();
    setInputMessage("");
    
    // Get current question context if in a check section or challenge
    let currentQuestion: CheckQuestion | undefined;
    let studentAnswer: number | undefined;
    
    if (inFinalChallenge) {
      const question = lessonContent?.final_challenge.questions[currentChallengeIndex];
      if (question) {
        currentQuestion = question;
        studentAnswer = challengeAnswers[currentChallengeIndex] ?? undefined;
      }
    } else {
      const section = getCurrentSection();
      if (section?.type === "check") {
        currentQuestion = {
          question: section.question!,
          options: section.options!,
          correct_answer: section.correct_answer!,
          hint: section.hint!,
          explanation: section.explanation!,
        };
        studentAnswer = sectionAnswers[currentSectionIndex] ?? undefined;
      }
    }
    
    await sendMessageWithContext(userMessage, currentQuestion, studentAnswer);
  };

  const renderSectionContent = () => {
    if (!lessonContent) return null;
    const section = lessonContent.sections[currentSectionIndex];
    if (!section) return null;

    if (section.type === "learn") {
      return (
        <div className="space-y-4 animate-slide-up">
          <h3 className="font-display font-bold text-xl text-foreground">{section.title}</h3>
          <div className="bg-card rounded-2xl p-5 border border-border">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{section.content}</p>
          </div>
          <Button onClick={proceedToNext} className="w-full h-12 text-lg font-bold rounded-xl gap-2">
            Continue <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      );
    }

    if (section.type === "check") {
      const isCompleted = sectionCompleted[currentSectionIndex];
      const selectedAnswer = sectionAnswers[currentSectionIndex];
      const showHint = showSectionHint[currentSectionIndex];

      return (
        <div className="space-y-4 animate-slide-up">
          <div className="bg-card rounded-2xl p-5 border-2 border-sky/20">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              ✅ Quick Check
            </h3>
            <p className="font-medium text-foreground mb-4">{section.question}</p>

            <div className="space-y-2 mb-4">
              {section.options?.map((option, index) => {
                const isCorrect = index === section.correct_answer;
                const isSelected = selectedAnswer === index;

                return (
                  <button
                    key={index}
                    onClick={() => handleSectionAnswer(currentSectionIndex, index)}
                    disabled={isCompleted}
                    className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                      isCompleted
                        ? isCorrect
                          ? "bg-eucalyptus text-eucalyptus-foreground"
                          : "bg-muted text-muted-foreground"
                        : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    <span className="mr-2">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                );
              })}
            </div>

            {showHint && !isCompleted && (
              <div className="bg-sky/10 border border-sky/20 rounded-xl p-4 mb-4 animate-slide-up">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-5 h-5 text-sky flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-sky mb-1">Hint:</p>
                    <p className="text-foreground/80">{section.hint}</p>
                  </div>
                </div>
              </div>
            )}

            {!isCompleted && (
              <Button
                onClick={() => checkSectionAnswer(currentSectionIndex)}
                className="w-full h-12 text-lg font-bold rounded-xl"
                disabled={selectedAnswer === null || selectedAnswer === undefined}
              >
                Check Answer
              </Button>
            )}

            {isCompleted && (
              <div className="space-y-4">
                <div className="bg-eucalyptus/10 border border-eucalyptus/20 p-4 rounded-xl">
                  <p className="text-foreground">{section.explanation}</p>
                </div>
                <Button onClick={proceedToNext} className="w-full h-12 text-lg font-bold rounded-xl gap-2">
                  Continue <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  const renderFinalChallenge = () => {
    if (!lessonContent) return null;
    const { final_challenge } = lessonContent;
    const question = final_challenge.questions[currentChallengeIndex];
    const isCompleted = challengeCompleted[currentChallengeIndex];
    const selectedAnswer = challengeAnswers[currentChallengeIndex];
    const showHint = showChallengeHint[currentChallengeIndex];
    const allDone = allChallengesComplete();

    return (
      <div className="space-y-6 animate-slide-up">
        <div className="text-center">
          <span className="text-4xl block mb-2">🎯</span>
          <h2 className="text-2xl font-display font-bold text-foreground">{final_challenge.title}</h2>
          <p className="text-muted-foreground mt-2">{final_challenge.description}</p>
          <div className="flex justify-center gap-2 mt-4">
            {final_challenge.questions.map((_, idx) => (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full transition-all ${
                  challengeCompleted[idx]
                    ? "bg-eucalyptus"
                    : idx === currentChallengeIndex
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {!allDone && question && (
          <div className="bg-card rounded-2xl p-5 border-2 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">
                Question {currentChallengeIndex + 1} of {final_challenge.questions.length}
              </h3>
              <span className="text-sm font-medium text-primary">+{question.points || 20} XP</span>
            </div>
            <p className="font-medium text-foreground mb-4">{question.question}</p>

            <div className="space-y-2 mb-4">
              {question.options.map((option, index) => {
                const isCorrect = index === question.correct_answer;
                const isSelected = selectedAnswer === index;

                return (
                  <button
                    key={index}
                    onClick={() => handleChallengeAnswer(currentChallengeIndex, index)}
                    disabled={isCompleted}
                    className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                      isCompleted
                        ? isCorrect
                          ? "bg-eucalyptus text-eucalyptus-foreground"
                          : "bg-muted text-muted-foreground"
                        : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    <span className="mr-2">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                );
              })}
            </div>

            {showHint && !isCompleted && (
              <div className="bg-ochre/10 border border-ochre/20 rounded-xl p-4 mb-4 animate-slide-up">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-5 h-5 text-ochre flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-ochre mb-1">Hint:</p>
                    <p className="text-foreground/80">{question.hint}</p>
                  </div>
                </div>
              </div>
            )}

            {!isCompleted && (
              <Button
                onClick={() => checkChallengeAnswer(currentChallengeIndex)}
                className="w-full h-12 text-lg font-bold rounded-xl"
                disabled={selectedAnswer === null || selectedAnswer === undefined}
              >
                Check Answer
              </Button>
            )}

            {isCompleted && (
              <div className="bg-eucalyptus/10 border border-eucalyptus/20 p-4 rounded-xl">
                <p className="text-foreground">{question.explanation}</p>
              </div>
            )}
          </div>
        )}

        {allDone && !missionComplete && (
          <div className="text-center space-y-4">
            <div className="bg-eucalyptus/10 border border-eucalyptus/20 rounded-2xl p-6">
              <span className="text-5xl block mb-4">🎉</span>
              <h3 className="text-xl font-display font-bold text-foreground mb-2">
                All Challenges Complete!
              </h3>
              <p className="text-muted-foreground mb-4">
                You've earned <span className="font-bold text-eucalyptus">{earnedXp} XP</span> in this lesson!
              </p>
              <Button
                onClick={completeMission}
                className="h-14 text-lg font-bold rounded-xl bg-eucalyptus hover:bg-eucalyptus-dark gap-2 px-8"
              >
                <CheckCircle className="w-5 h-5" />
                Complete Mission! 🏆
              </Button>
            </div>
          </div>
        )}

        {missionComplete && (
          <div className="text-center p-4 animate-bounce-in">
            <p className="text-2xl font-display font-bold text-eucalyptus">
              🏆 Mission Complete! 🏆
            </p>
          </div>
        )}
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-float mb-4">{generating ? "✨" : "📖"}</div>
          <p className="text-muted-foreground text-lg animate-pulse">
            {generating ? "Creating your personalised lesson..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 bg-card border-b border-border p-3 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(`/subject/${subjectSlug}`)}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{topic?.emoji}</span>
          <h1 className="text-lg font-display font-bold truncate max-w-[200px] sm:max-w-none">
            {topic?.name}
          </h1>
          {lessonContent?.difficulty_level && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
              {lessonContent.difficulty_level}
            </span>
          )}
        </div>
        <div className="xp-badge">+{earnedXp || lessonContent?.total_xp || 50} XP</div>
      </header>

      {/* Split View */}
      <main className="flex-grow flex overflow-hidden">
        {/* Left Column - The Mission */}
        <div ref={lessonRef} className="w-1/2 border-r border-border overflow-y-auto scrollbar-thin p-4 md:p-6">
          {lessonContent ? (
            <div className="space-y-6 max-w-xl mx-auto">
              {/* Title & Fun Fact (always visible) */}
              {!inFinalChallenge && currentSectionIndex === 0 && (
                <>
                  <div className="text-center animate-slide-up">
                    <span className="text-5xl block mb-3">{lessonContent.emoji}</span>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                      {lessonContent.title}
                    </h2>
                  </div>

                  <div className="fun-fact-card animate-slide-up">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-sky flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground text-sm mb-1">Fun Fact!</p>
                        <p className="text-foreground/80">{lessonContent.fun_fact}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Progress indicator */}
              {!inFinalChallenge && (
                <div className="flex items-center gap-2 justify-center">
                  {lessonContent.sections.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        idx < currentSectionIndex
                          ? "bg-eucalyptus w-8"
                          : idx === currentSectionIndex
                          ? "bg-primary w-8"
                          : "bg-muted w-4"
                      }`}
                    />
                  ))}
                  <div className={`h-2 rounded-full transition-all ${inFinalChallenge ? "bg-primary w-8" : "bg-muted w-4"}`} />
                </div>
              )}

              {/* Content */}
              {inFinalChallenge ? renderFinalChallenge() : renderSectionContent()}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Generating your personalised lesson...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - The Sensei */}
        <div className="w-1/2 flex flex-col bg-sand/30">
          <div className="flex-shrink-0 p-4 border-b border-border bg-card/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-ochre flex items-center justify-center text-2xl">
                🦊
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">Mirri the Study Buddy</h3>
                <p className="text-sm text-muted-foreground">Ask me for hints!</p>
              </div>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto scrollbar-thin p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-ochre flex items-center justify-center text-lg mr-2 flex-shrink-0">
                    🦊
                  </div>
                )}
                <div
                  className={`max-w-[80%] ${
                    message.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isChatLoading && messages[messages.length - 1]?.content === "" && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-ochre flex items-center justify-center text-lg mr-2">
                  🦊
                </div>
                <div className="chat-bubble-assistant">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="flex-shrink-0 p-4 border-t border-border bg-card/50">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Ask Mirri for help..."
                className="flex-grow h-12 rounded-xl bg-background"
                disabled={isChatLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isChatLoading}
                className="h-12 w-12 rounded-xl"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}