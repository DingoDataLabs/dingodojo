import { useEffect, useState, useRef, useCallback } from "react";
import dingoLogo from "@/assets/dingo-logo.png";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Send, Sparkles, CheckCircle, Loader2, ChevronRight, HelpCircle, Camera, PenTool, Crown, Mic, MicOff, Square } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { getSydneyWeekStart, isNewWeek } from "@/lib/weekUtils";
import { getSydneyToday, isNewDay } from "@/lib/dailyUtils";
import { applySubjectMultiplier } from "@/lib/weeklyGoalUtils";
import { SenseiChatDrawer } from "@/components/SenseiChatDrawer";
import { getMasteryLevel } from "@/lib/progressUtils";
import { AnnotatedWriting } from "@/components/AnnotatedWriting";
import { WritingFeedbackModal } from "@/components/WritingFeedbackModal";
import { MathsWorkingFeedbackModal } from "@/components/MathsWorkingFeedbackModal";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useMirriVoice } from "@/hooks/useMirriVoice";

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
  name: string;
}

interface CheckQuestion {
  question: string;
  options?: string[];
  correct_answer?: number;
  hint: string;
  explanation: string;
  points?: number;
  type?: "multiple_choice" | "free_text" | "worked_solution";
  assessment_criteria?: string[];
  example_elements?: string[];
  max_words?: number;
  min_words?: number;
  worked_solution_type?: "chart" | "working";
  correct_answer_value?: string;
  working_steps_expected?: string[];
  bonus_xp?: number;
}

interface WritingAnnotation {
  originalText: string;
  suggestion: string;
  type: "spelling" | "grammar" | "punctuation" | "style" | "praise";
  comment: string;
}

interface FreeTextFeedback {
  score: number;
  maxScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  overallRating: string;
  annotations?: WritingAnnotation[];
}

interface HandwritingResult {
  letter_formation: number;
  letter_formation_comment: string;
  spacing_sizing: number;
  spacing_sizing_comment: string;
  presentation: number;
  presentation_comment: string;
  composite_score: number;
  transcribed_text: string;
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
  question_type?: "multiple_choice" | "free_text";
  assessment_criteria?: string[];
  example_elements?: string[];
  max_words?: number;
  min_words?: number;
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
  weekly_xp_earned: number;
  weekly_xp_goal: number;
  week_start_date: string | null;
  last_mission_date: string | null;
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
  const { user, session, loading: authLoading } = useAuth();
  // Use lg breakpoint (1024px) for Mirri layout — below lg = compact (no split)
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsCompact(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // ── SessionStorage persistence (Bug 1: survive camera remounts) ──
  const sessionKey = `training_session_${topicSlug}`;
  const restoredRef = useRef(false);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
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
  const [regeneratingQuestion, setRegeneratingQuestion] = useState<Record<number, boolean>>({});
  const [earnedXp, setEarnedXp] = useState(0);
  const [missionComplete, setMissionComplete] = useState(false);
  const [completionCountdown, setCompletionCountdown] = useState<number | null>(null);
  const [celebrationData, setCelebrationData] = useState<{ xp: number; streak: number; isStreakDay: boolean } | null>(null);

  // Free-text state
  const [freeTextAnswers, setFreeTextAnswers] = useState<Record<string, string>>({});
  const [freeTextFeedback, setFreeTextFeedback] = useState<Record<string, FreeTextFeedback>>({});
  const [assessingFreeText, setAssessingFreeText] = useState<Record<string, boolean>>({});
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [pendingFeedbackKey, setPendingFeedbackKey] = useState<string | null>(null);
  const [handwritingResults, setHandwritingResults] = useState<Record<string, HandwritingResult>>({});

  // Maths working state
  const [mathsWorkingFeedback, setMathsWorkingFeedback] = useState<Record<string, any>>({});
  const [showMathsFeedbackModal, setShowMathsFeedbackModal] = useState(false);
  const [pendingMathsFeedbackKey, setPendingMathsFeedbackKey] = useState<string | null>(null);
  const canvasGetDataUrlRef = useRef<Record<string, (() => string | null)>>({});

  // Handwriting upload state
  const [answerMode, setAnswerMode] = useState<Record<string, "type" | "photo" | "draw">>({});
  const [photoFiles, setPhotoFiles] = useState<Record<string, File | null>>({});
  const [photoPreviews, setPhotoPreviews] = useState<Record<string, string>>({});
  const [photoRejectionMsg, setPhotoRejectionMsg] = useState<Record<string, string>>({});

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "G'day! I'm your Sensei! 🦊 Work through the lesson on the left, and ask me if you need help with any questions. I'll give you hints to guide you - no worries!",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lessonRef = useRef<HTMLDivElement>(null);
  const [desktopVoiceMode, setDesktopVoiceMode] = useState(false);
  const prevChatLoadingRef = useRef(false);
  const pendingVoiceTranscriptRef = useRef<string | null>(null);

  const isChampionUser = profile?.subscription_tier === "champion";

  const desktopVoice = useMirriVoice({
    isChampion: isChampionUser,
    onTranscript: (text: string) => {
      pendingVoiceTranscriptRef.current = text;
      setInputMessage(text);
    },
    onSpeakingChange: () => {},
  });

  // Auto-send when voice transcript sets inputMessage
  useEffect(() => {
    if (pendingVoiceTranscriptRef.current && inputMessage === pendingVoiceTranscriptRef.current && desktopVoiceMode) {
      pendingVoiceTranscriptRef.current = null;
      sendMessage();
    }
  }, [inputMessage, desktopVoiceMode]);

  // Detect streaming complete for desktop voice
  useEffect(() => {
    if (prevChatLoadingRef.current && !isChatLoading && desktopVoiceMode) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.content) {
        desktopVoice.speak(lastMsg.content);
      }
    }
    prevChatLoadingRef.current = isChatLoading;
  }, [isChatLoading, messages, desktopVoiceMode]);

  // Keep screen awake during final challenge with free-text/photo/worked_solution submissions
  const hasFreeTextChallenge = lessonContent?.final_challenge?.questions?.some(q => q.type === "free_text" || q.type === "worked_solution") ?? false;
  useWakeLock(inFinalChallenge && hasFreeTextChallenge);

  const isBonusSubject = subject ? !['english', 'maths', 'mathematics'].includes(subject.slug) : false;

  // ── Persist to sessionStorage on change ──
  useEffect(() => {
    if (!restoredRef.current) return; // Don't save during initial restore
    if (!lessonContent) return;
    try {
      const snapshot = {
        lessonContent,
        inFinalChallenge,
        currentChallengeIndex,
        challengeCompleted,
        freeTextAnswers,
        answerMode,
        photoPreviews,
        earnedXp,
        currentSectionIndex,
        sectionCompleted,
        challengeAnswers,
        challengeAttempts,
        sectionAnswers,
        sectionAttempts,
        showSectionHint,
        showChallengeHint,
      };
      sessionStorage.setItem(sessionKey, JSON.stringify(snapshot));
    } catch { /* quota exceeded — non-critical */ }
  }, [lessonContent, inFinalChallenge, currentChallengeIndex, challengeCompleted, freeTextAnswers, answerMode, photoPreviews, earnedXp, currentSectionIndex, sectionCompleted, challengeAnswers]);

  // Clear session on navigation away
  useEffect(() => {
    return () => {
      // Don't clear if mission is completing (navigation to subject page)
      if (!missionComplete) {
        // Keep it — user might be coming back from camera
      }
    };
  }, [missionComplete]);

  const clearSessionState = useCallback(() => {
    try { sessionStorage.removeItem(sessionKey); } catch {}
  }, [sessionKey]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (topicSlug && user) {
      // Bug 1 fix: Rehydrate from sessionStorage before fetching
      const saved = sessionStorage.getItem(sessionKey);
      if (saved && !restoredRef.current) {
        try {
          const snapshot = JSON.parse(saved);
          if (snapshot.lessonContent) {
            setLessonContent(snapshot.lessonContent);
            setInFinalChallenge(snapshot.inFinalChallenge ?? false);
            setCurrentChallengeIndex(snapshot.currentChallengeIndex ?? 0);
            setChallengeCompleted(snapshot.challengeCompleted ?? {});
            setFreeTextAnswers(snapshot.freeTextAnswers ?? {});
            setAnswerMode(snapshot.answerMode ?? {});
            setPhotoPreviews(snapshot.photoPreviews ?? {});
            setEarnedXp(snapshot.earnedXp ?? 0);
            setCurrentSectionIndex(snapshot.currentSectionIndex ?? 0);
            setSectionCompleted(snapshot.sectionCompleted ?? {});
            setChallengeAnswers(snapshot.challengeAnswers ?? {});
            setChallengeAttempts(snapshot.challengeAttempts ?? {});
            setSectionAnswers(snapshot.sectionAnswers ?? {});
            setSectionAttempts(snapshot.sectionAttempts ?? {});
            setShowSectionHint(snapshot.showSectionHint ?? {});
            setShowChallengeHint(snapshot.showChallengeHint ?? {});
            setLoading(false);
            restoredRef.current = true;
          }
        } catch { /* corrupt data, proceed normally */ }
      }
      restoredRef.current = true;
      fetchTopicAndLesson();
      fetchProfile();
    }
  }, [topicSlug, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-complete mission after countdown when all challenges are done
  useEffect(() => {
    if (completionCountdown === null) return;
    if (completionCountdown <= 0) {
      completeMission();
      return;
    }
    const timer = setTimeout(() => setCompletionCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [completionCountdown]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, total_xp, grade_level, subscription_tier, weekly_xp_earned, weekly_xp_goal, week_start_date, last_mission_date")
      .eq("user_id", user?.id)
      .maybeSingle();
    
    if (data) {
      setProfile({
        ...data,
        weekly_xp_earned: data.weekly_xp_earned || 0,
        weekly_xp_goal: data.weekly_xp_goal || 500,
        last_mission_date: data.last_mission_date || null,
      });
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
      // Fetch topic with subject (always needed for chat context etc.)
      const { data: topicData, error: topicError } = await supabase
        .from("topics")
        .select("*, subjects!inner(id, slug, name)")
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

      // If we already restored lesson from sessionStorage, skip regeneration
      if (lessonContent) {
        setLoading(false);
        return;
      }

      // Get profile first to fetch topic XP
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, total_xp, grade_level, subscription_tier, weekly_xp_earned, weekly_xp_goal, week_start_date, last_mission_date")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          ...profileData,
          weekly_xp_earned: profileData.weekly_xp_earned || 0,
          weekly_xp_goal: profileData.weekly_xp_goal || 500,
          last_mission_date: profileData.last_mission_date || null,
        });
        const xp = await fetchTopicXp(topicData.id, profileData.id);
        setTopicXp(xp);
      }

      // Calculate the student's current difficulty level from their XP
      const xp = profileData?.id ? await fetchTopicXp(topicData.id, profileData.id) : 0;
      setTopicXp(xp);
      const difficultyLevel = getMasteryLevel(xp).name;

      // Check for existing generated module at this difficulty level
      const { data: moduleData } = await supabase
        .from("generated_modules")
        .select("content_json, difficulty_level")
        .eq("topic_id", topicData.id)
        .eq("difficulty_level", difficultyLevel)
        .maybeSingle();

      if (moduleData?.content_json) {
        const content = moduleData.content_json as unknown as LessonContent;
        // Check if it's the new format with sections
        if (content.sections && content.final_challenge) {
          setLessonContent(content);
          setLoading(false);
        } else {
          // Old format, regenerate
          await generateLesson(topicData, subjectData, profileData?.grade_level, xp);
        }
      } else {
        // No cached lesson at this level - generate new content
        await generateLesson(topicData, subjectData, profileData?.grade_level, xp);
      }
    } catch (err) {
      console.error("Error:", err);
      setLoading(false);
    }
  };

  const generateLesson = async (topicData: Topic, subjectData: Subject, gradeLevel?: string, xp?: number) => {
    setGenerating(true);
    try {
      const baseBody = {
        topicName: topicData.name,
        topicEmoji: topicData.emoji,
        gradeLevel: gradeLevel || "Year 5",
        topicXp: xp || 0,
        subjectSlug: subjectData.slug,
      };

      // Phase 1: Scaffold — get learn sections immediately
      const { data: scaffoldData, error: scaffoldError } = await supabase.functions.invoke("generate-lesson", {
        body: { ...baseBody, phase: "scaffold" },
      });

      if (scaffoldError) throw scaffoldError;
      if (!scaffoldData?.content) throw new Error("No scaffold content");

      const scaffold = scaffoldData.content;
      
      // Show scaffold immediately with placeholder check sections and empty challenge
      const scaffoldLesson: LessonContent = {
        title: scaffold.title,
        emoji: scaffold.emoji,
        difficulty_level: scaffold.difficulty_level,
        fun_fact: scaffold.fun_fact,
        sections: scaffold.sections || [],
        final_challenge: { title: "Challenge Time!", description: "Loading...", questions: [] },
        total_xp: scaffold.total_xp || 50,
      };
      setLessonContent(scaffoldLesson);
      setGenerating(false);
      setLoading(false);
      setQuestionsLoading(true);

      // Extract learn sections for context
      const learnSections = (scaffold.sections || [])
        .filter((s: any) => s.type === "learn")
        .map((s: any) => ({ title: s.title, content: s.content }));

      // Phase 2: Check questions — run in background
      try {
        const { data: checksData } = await supabase.functions.invoke("generate-lesson", {
          body: { ...baseBody, phase: "checks", scaffoldSections: learnSections },
        });

        if (checksData?.checks) {
          // Interleave check sections after each learn section
          setLessonContent(prev => {
            if (!prev) return prev;
            const newSections: LessonSection[] = [];
            let checkIdx = 0;
            for (const section of prev.sections) {
              newSections.push(section);
              if (section.type === "learn" && checkIdx < checksData.checks.length) {
                const check = checksData.checks[checkIdx];
                newSections.push({
                  type: "check",
                  question: check.question,
                  options: check.options,
                  correct_answer: check.correct_answer,
                  hint: check.hint,
                  explanation: check.explanation,
                  question_type: check.question_type || "multiple_choice",
                });
                checkIdx++;
              }
            }
            return { ...prev, sections: newSections };
          });
        }
      } catch (checksErr) {
        console.error("Phase 2 (checks) error:", checksErr);
      }

      // Phase 3: Final challenge — run in background
      try {
        const { data: challengeData } = await supabase.functions.invoke("generate-lesson", {
          body: { ...baseBody, phase: "challenge" },
        });

        if (challengeData?.final_challenge) {
          setLessonContent(prev => {
            if (!prev) return prev;
            return { ...prev, final_challenge: challengeData.final_challenge };
          });
        }
      } catch (challengeErr) {
        console.error("Phase 3 (challenge) error:", challengeErr);
      }

      setQuestionsLoading(false);

      // Cache full lesson after all phases complete
      setLessonContent(prev => {
        if (prev) {
          const difficultyLevel = scaffoldData.difficultyLevel || getMasteryLevel(xp || 0).name;
          supabase.from("generated_modules").upsert({
            topic_id: topicData.id,
            content_json: prev as any,
            difficulty_level: difficultyLevel,
          }, {
            onConflict: "topic_id,difficulty_level",
          });
        }
        return prev;
      });

    } catch (err) {
      console.error("Generation error:", err);
      toast.error("Couldn't generate the training session. Please try again!");
      setGenerating(false);
      setLoading(false);
      setQuestionsLoading(false);
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
      setEarnedXp(prev => prev + (isBonusSubject ? 5 : 10));
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
      
      if (attempts >= 2) {
        // Regenerate this question to prevent answer spamming
        toast("New question coming — let's try a fresh one! 🔄", { icon: "🔄" });
        regenerateChallengeQuestion(questionIdx);
      } else {
        toast("Good try! Check the hint and have another go! 💪", { icon: "🤔" });
      }
      
      setChallengeAnswers(prev => ({ ...prev, [questionIdx]: null }));
    }
  };

  const regenerateChallengeQuestion = async (questionIdx: number) => {
    if (!lessonContent || !topic || !subject) return;
    
    setRegeneratingQuestion(prev => ({ ...prev, [questionIdx]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson", {
        body: {
          topicName: topic.name,
          topicEmoji: topic.emoji,
          gradeLevel: profile?.grade_level || "Year 5",
          topicXp: topicXp || 0,
          subjectSlug: subject.slug,
          phase: "challenge",
        },
      });

      if (error) throw error;
      
      const newChallenge = data?.final_challenge;
      if (newChallenge?.questions?.length > 0) {
        // Pick one question from the regenerated set (use questionIdx mod length for variety)
        const newQuestion = newChallenge.questions[questionIdx % newChallenge.questions.length];
        
        setLessonContent(prev => {
          if (!prev) return prev;
          const updatedQuestions = [...prev.final_challenge.questions];
          updatedQuestions[questionIdx] = newQuestion;
          return {
            ...prev,
            final_challenge: { ...prev.final_challenge, questions: updatedQuestions },
          };
        });
        
        // Reset state for this question
        setChallengeAttempts(prev => ({ ...prev, [questionIdx]: 0 }));
        setChallengeAnswers(prev => ({ ...prev, [questionIdx]: null }));
        setShowChallengeHint(prev => ({ ...prev, [questionIdx]: false }));
      }
    } catch (err) {
      console.error("Failed to regenerate question:", err);
      toast.error("Couldn't load a new question — have another try at this one!");
    } finally {
      setRegeneratingQuestion(prev => ({ ...prev, [questionIdx]: false }));
    }
  };

  const submitFreeTextAnswer = async (questionIdx: number) => {
    const question = lessonContent?.final_challenge.questions[questionIdx];
    if (!question) return;

    const key = `challenge_${questionIdx}`;
    const studentResponse = freeTextAnswers[key];
    
    if (!studentResponse || studentResponse.trim().length === 0) {
      toast.error("Please write your response first!");
      return;
    }

    const wordCount = studentResponse.trim().split(/\s+/).filter(w => w.length > 0).length;
    const minWords = question.min_words || 50;
    
    if (wordCount < minWords) {
      toast.error(`Your response needs at least ${minWords} words. You've written ${wordCount}.`);
      return;
    }

    setAssessingFreeText(prev => ({ ...prev, [key]: true }));

    try {
      const { data, error } = await supabase.functions.invoke("assess-writing", {
        body: {
          studentResponse,
          question: question.question,
          assessmentCriteria: question.assessment_criteria,
          exampleElements: question.example_elements,
          minWords: question.min_words || 50,
          maxWords: question.max_words || 200,
          maxPoints: question.points || 50,
          gradeLevel: profile?.grade_level,
          topicName: topic?.name,
        },
      });

      if (error) throw error;

      if (data?.assessment) {
        setFreeTextFeedback(prev => ({ ...prev, [key]: data.assessment }));
        setChallengeCompleted(prev => ({ ...prev, [questionIdx]: true }));
        setEarnedXp(prev => prev + (data.assessment.score || 0));
        
        // Save submission to database
        if (profile?.id) {
          const subjectName = subject ? (subject as any).name || subjectSlug : subjectSlug;
          supabase.from("submissions").insert({
            profile_id: profile.id,
            submission_type: "typed",
            subject_name: subjectName,
            topic_name: topic?.name || null,
            question: question.question,
            student_text: studentResponse,
            content_score: data.assessment.score,
            content_max_score: data.assessment.maxScore,
            content_feedback: data.assessment.feedback,
            content_overall_rating: data.assessment.overallRating,
            strengths: data.assessment.strengths || [],
            improvements: data.assessment.improvements || [],
            annotations: data.assessment.annotations || [],
          }).then(({ error: insertErr }) => {
            if (insertErr) console.error("Failed to save submission:", insertErr);
          });
        }

        // Show the feedback modal instead of proceeding immediately
        setPendingFeedbackKey(key);
        setShowFeedbackModal(true);
      }
    } catch (err) {
      console.error("Assessment error:", err);
      toast.error("Couldn't assess your writing. Please try again!");
    } finally {
      setAssessingFreeText(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleFreeTextChange = (key: string, value: string) => {
    setFreeTextAnswers(prev => ({ ...prev, [key]: value }));
  };

  const submitHandwritingAnswer = async (questionIdx: number) => {
    const question = lessonContent?.final_challenge.questions[questionIdx];
    if (!question) return;

    const key = `challenge_${questionIdx}`;
    const file = photoFiles[key];
    if (!file) {
      toast.error("Please upload a photo first!");
      return;
    }

    setAssessingFreeText(prev => ({ ...prev, [key]: true }));
    setPhotoRejectionMsg(prev => ({ ...prev, [key]: "" }));

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const imageBase64 = btoa(binary);

      const subjectName = subject ? (subject as any).name || subjectSlug : subjectSlug;

      const { data, error } = await supabase.functions.invoke("assess-handwriting", {
        body: {
          imageBase64,
          question: question.question,
          assessmentCriteria: question.assessment_criteria,
          exampleElements: question.example_elements,
          minWords: question.min_words || 50,
          maxWords: question.max_words || 200,
          maxPoints: question.points || 50,
          topicName: topic?.name,
          subjectName,
        },
      });

      if (error) throw error;

      if (data?.rejected && data?.reason === "upload_not_handwriting") {
        setPhotoRejectionMsg(prev => ({ ...prev, [key]: "That doesn't look like handwritten work — please take a photo of your written answer on paper 🖊️" }));
        setAssessingFreeText(prev => ({ ...prev, [key]: false }));
        return;
      }

      if (data?.success && data?.writing) {
        setFreeTextFeedback(prev => ({ ...prev, [key]: data.writing }));
        setHandwritingResults(prev => ({ ...prev, [key]: data.handwriting }));
        setChallengeCompleted(prev => ({ ...prev, [questionIdx]: true }));
        setEarnedXp(prev => prev + (data.writing.score || 0));
        
        // Store transcribed text as the student response for display
        setFreeTextAnswers(prev => ({ ...prev, [key]: data.handwriting.transcribed_text || "" }));

        // Save submission to database (handwriting image is already stored by assess-handwriting edge function)
        if (profile?.id) {
          const subName = subject ? (subject as any).name || subjectSlug : subjectSlug;
          supabase.from("submissions").insert({
            profile_id: profile.id,
            submission_type: "handwritten",
            subject_name: subName,
            topic_name: topic?.name || null,
            question: question.question,
            student_text: data.handwriting.transcribed_text || null,
            image_path: data.imagePath || null,
            content_score: data.writing.score,
            content_max_score: data.writing.maxScore,
            content_feedback: data.writing.feedback,
            content_overall_rating: data.writing.overallRating,
            strengths: data.writing.strengths || [],
            improvements: data.writing.improvements || [],
            annotations: data.writing.annotations || [],
            letter_formation: data.handwriting.letter_formation,
            spacing_sizing: data.handwriting.spacing_sizing,
            presentation: data.handwriting.presentation,
            composite_score: data.handwriting.composite_score,
            letter_formation_comment: data.handwriting.letter_formation_comment || null,
            spacing_sizing_comment: data.handwriting.spacing_sizing_comment || null,
            presentation_comment: data.handwriting.presentation_comment || null,
          }).then(({ error: insertErr }) => {
            if (insertErr) console.error("Failed to save submission:", insertErr);
          });
        }

        setPendingFeedbackKey(key);
        setShowFeedbackModal(true);
      }
    } catch (err) {
      console.error("Handwriting assessment error:", err);
      toast.error("Couldn't assess your handwriting. Please try again!");
    } finally {
      setAssessingFreeText(prev => ({ ...prev, [key]: false }));
    }
  };

  // ── Maths Worked Solution Submission ──
  const submitWorkedSolution = async (questionIdx: number) => {
    const question = lessonContent?.final_challenge.questions[questionIdx];
    if (!question) return;

    const key = `challenge_${questionIdx}`;
    const mode = answerMode[key] || "photo";
    let imageBase64: string | null = null;
    let inputMethod = "photographed";

    if (mode === "draw") {
      const getDataUrl = canvasGetDataUrlRef.current[key];
      const dataUrl = getDataUrl?.();
      if (!dataUrl) {
        toast.error("Please draw your working first!");
        return;
      }
      imageBase64 = dataUrl.split(",")[1]; // strip data:image/png;base64,
      inputMethod = "drawn";
    } else if (mode === "photo") {
      const file = photoFiles[key];
      if (!file) {
        toast.error("Please upload a photo first!");
        return;
      }
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      imageBase64 = btoa(binary);
      inputMethod = "photographed";
    } else {
      // Type mode fallback — not really applicable for worked_solution, but handle gracefully
      toast.error("Please use Photo or Draw mode for show-your-working questions.");
      return;
    }

    setAssessingFreeText(prev => ({ ...prev, [key]: true }));
    setPhotoRejectionMsg(prev => ({ ...prev, [key]: "" }));

    try {
      const subjectName = subject ? (subject as any).name || subjectSlug : subjectSlug;

      const { data, error } = await supabase.functions.invoke("assess-maths-working", {
        body: {
          imageBase64,
          question: question.question,
          workedSolutionType: question.worked_solution_type || "working",
          correctAnswerValue: question.correct_answer_value,
          workingStepsExpected: question.working_steps_expected,
          bonusXp: question.bonus_xp || 25,
          topicName: topic?.name,
          subjectName,
          inputMethod,
        },
      });

      if (error) throw error;

      if (data?.rejected && data?.reason === "upload_not_handwriting") {
        setPhotoRejectionMsg(prev => ({ ...prev, [key]: "That doesn't look like maths working — please show your working on paper or draw it 📐" }));
        setAssessingFreeText(prev => ({ ...prev, [key]: false }));
        return;
      }

      if (data?.success && data?.assessment) {
        setMathsWorkingFeedback(prev => ({ ...prev, [key]: data.assessment }));
        setChallengeCompleted(prev => ({ ...prev, [questionIdx]: true }));
        const points = question.points || 30;
        const bonus = data.assessment.bonus_xp_awarded || 0;
        setEarnedXp(prev => prev + points + bonus);

        setPendingMathsFeedbackKey(key);
        setShowMathsFeedbackModal(true);
      }
    } catch (err) {
      console.error("Maths working assessment error:", err);
      toast.error("Couldn't assess your working. Please try again!");
    } finally {
      setAssessingFreeText(prev => ({ ...prev, [key]: false }));
    }
  };

  const handlePhotoSelect = (key: string, file: File | null) => {
    if (!file) return;
    setPhotoFiles(prev => ({ ...prev, [key]: file }));
    setPhotoRejectionMsg(prev => ({ ...prev, [key]: "" }));
    const url = URL.createObjectURL(file);
    setPhotoPreviews(prev => ({ ...prev, [key]: url }));
  };

  const handleFeedbackModalClose = () => {
    setShowFeedbackModal(false);
    
    const questionIdx = pendingFeedbackKey ? parseInt(pendingFeedbackKey.replace('challenge_', '')) : -1;
    setPendingFeedbackKey(null);
    
    if (questionIdx >= 0 && lessonContent && questionIdx < lessonContent.final_challenge.questions.length - 1) {
      setCurrentChallengeIndex(questionIdx + 1);
    } else {
      // Bug 2 fix: Start countdown only after feedback modal is dismissed
      if (allChallengesComplete()) {
        setCompletionCountdown(3);
      }
    }
  };

  const handleMathsFeedbackModalClose = () => {
    setShowMathsFeedbackModal(false);
    
    const questionIdx = pendingMathsFeedbackKey ? parseInt(pendingMathsFeedbackKey.replace('challenge_', '')) : -1;
    setPendingMathsFeedbackKey(null);
    
    if (questionIdx >= 0 && lessonContent && questionIdx < lessonContent.final_challenge.questions.length - 1) {
      setCurrentChallengeIndex(questionIdx + 1);
    } else {
      if (allChallengesComplete()) {
        setCompletionCountdown(3);
      }
    }
  };

  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
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
      const today = getSydneyToday();

      // Fetch current profile data
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("total_xp, weekly_xp_earned, week_start_date, current_streak, last_mission_date")
        .eq("id", profile.id)
        .maybeSingle();

      // Apply subject multiplier
      const subjectSlugVal = subject?.slug || subjectSlug || "";
      const finalXp = applySubjectMultiplier(totalXp, subjectSlugVal);

      // Update profile with XP and weekly tracking
      await supabase
        .from("profiles")
        .update({
          total_xp: (currentProfile?.total_xp || 0) + finalXp,
          weekly_xp_earned: (currentProfile?.weekly_xp_earned || 0) + finalXp,
          week_start_date: currentWeekStart,
          last_mission_date: today,
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

      // Log to activity feed
      const subjectName = subject ? (subject as any).name || subjectSlug : subjectSlug;
      await supabase.from("activity_feed").insert({
        profile_id: profile.id,
        activity_type: "mission_complete",
        subject_name: subjectName,
        topic_name: topic.name,
        xp_earned: totalXp,
      });

      const newStreak = currentProfile?.current_streak || 0;
      const isStreakDay = currentProfile?.last_mission_date !== today;

      setMissionComplete(true);
      clearSessionState();
      setCelebrationData({ xp: finalXp, streak: newStreak, isStreakDay });

      // Burst confetti
      confetti({
        particleCount: 180,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#D97706", "#059669", "#0EA5E9", "#F59E0B", "#EF4444"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 50,
          origin: { y: 0.3, x: 0.2 },
          colors: ["#D97706", "#F59E0B"],
        });
        confetti({
          particleCount: 80,
          spread: 50,
          origin: { y: 0.3, x: 0.8 },
          colors: ["#059669", "#0EA5E9"],
        });
      }, 400);

      setTimeout(() => {
        navigate(`/subject/${subjectSlug}`);
      }, 4000);
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
            Authorization: `Bearer ${session?.access_token}`,
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
      // Check if next section would be a check that hasn't loaded yet
      const nextSection = lessonContent.sections[currentSectionIndex + 1];
      const nextIsPlaceholderCheck = questionsLoading && (!nextSection || nextSection.type !== "check") && currentSectionIndex === lessonContent.sections.length - 1;

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

    if (section.type === "check" && !section.question && questionsLoading) {
      // Skeleton placeholder while check questions load
      return (
        <div className="space-y-4 animate-slide-up">
          <div className="bg-card rounded-2xl p-5 border-2 border-sky/20">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="font-display font-bold text-lg text-muted-foreground">Loading question...</span>
            </div>
            <Skeleton className="h-6 w-3/4 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
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

    // Show skeleton if challenge hasn't loaded yet
    if (questionsLoading || !final_challenge.questions || final_challenge.questions.length === 0) {
      return (
        <div className="space-y-6 animate-slide-up">
          <div className="text-center">
            <span className="text-4xl block mb-2">🎯</span>
            <h2 className="text-2xl font-display font-bold text-foreground">Challenge Time!</h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Preparing your challenge...</span>
            </div>
          </div>
          <div className="bg-card rounded-2xl p-5 border-2 border-primary/20">
            <Skeleton className="h-6 w-1/2 mb-4" />
            <Skeleton className="h-6 w-3/4 mb-4" />
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
        </div>
      );
    }

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
                Challenge {currentChallengeIndex + 1} of {final_challenge.questions.length}
              </h3>
              <span className="text-sm font-medium text-primary">+{question.points || 20} XP</span>
            </div>
            <p className="font-medium text-foreground mb-4">{question.question}</p>

            {/* Free-text question */}
            {question.type === "free_text" ? (
              <div className="space-y-4">
                {question.assessment_criteria && (
                  <div className="bg-sky/10 border border-sky/20 rounded-xl p-3 text-sm">
                    <p className="font-semibold text-sky mb-2">What we're looking for:</p>
                    <ul className="list-disc list-inside text-foreground/80 space-y-1">
                      {question.assessment_criteria.map((criteria, i) => (
                        <li key={i}>{criteria}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Type / Photo toggle */}
                {!isCompleted && (
                  <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1">
                    <button
                      onClick={() => setAnswerMode(prev => ({ ...prev, [`challenge_${currentChallengeIndex}`]: "type" }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                        (answerMode[`challenge_${currentChallengeIndex}`] || "type") === "type"
                          ? "bg-card shadow-sm text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <PenTool className="w-4 h-4" /> Type answer
                    </button>
                    <button
                      onClick={() => {
                        if (profile?.subscription_tier !== "champion") {
                          toast("📷 Photo upload is a Pen Licence feature!", { icon: "🖊️", description: "Upgrade to submit handwritten answers." });
                          return;
                        }
                        setAnswerMode(prev => ({ ...prev, [`challenge_${currentChallengeIndex}`]: "photo" }));
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                        answerMode[`challenge_${currentChallengeIndex}`] === "photo"
                          ? "bg-card shadow-sm text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      <Camera className="w-4 h-4" /> Upload photo
                      {profile?.subscription_tier !== "champion" && <span className="text-xs">🖊️</span>}
                    </button>
                  </div>
                )}

                {/* Type mode */}
                {(answerMode[`challenge_${currentChallengeIndex}`] || "type") === "type" && (
                  <>
                    <div className="relative">
                      <Textarea
                        value={freeTextAnswers[`challenge_${currentChallengeIndex}`] || ""}
                        onChange={(e) => handleFreeTextChange(`challenge_${currentChallengeIndex}`, e.target.value)}
                        placeholder="Write your response here..."
                        className="min-h-[200px] resize-none"
                        disabled={isCompleted || assessingFreeText[`challenge_${currentChallengeIndex}`]}
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                        {getWordCount(freeTextAnswers[`challenge_${currentChallengeIndex}`] || "")} / {question.min_words || 50}-{question.max_words || 200} words
                      </div>
                    </div>

                    {!isCompleted && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowChallengeHint(prev => ({ ...prev, [currentChallengeIndex]: true }))}
                          className="flex-shrink-0"
                          disabled={showHint}
                        >
                          <HelpCircle className="w-4 h-4 mr-2" />
                          Get a Tip
                        </Button>
                        <Button
                          onClick={() => submitFreeTextAnswer(currentChallengeIndex)}
                          className="flex-1 h-12 text-lg font-bold rounded-xl"
                          disabled={assessingFreeText[`challenge_${currentChallengeIndex}`] || !freeTextAnswers[`challenge_${currentChallengeIndex}`]}
                        >
                          {assessingFreeText[`challenge_${currentChallengeIndex}`] ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin mr-2" />
                              Mirri is reading...
                            </>
                          ) : (
                            "Submit Writing ✍️"
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Photo mode */}
                {answerMode[`challenge_${currentChallengeIndex}`] === "photo" && !isCompleted && (
                  <div className="space-y-3">
                    {photoPreviews[`challenge_${currentChallengeIndex}`] ? (
                      <div className="relative">
                        <img
                          src={photoPreviews[`challenge_${currentChallengeIndex}`]}
                          alt="Your handwriting"
                          className="w-full rounded-xl border border-border max-h-[300px] object-contain bg-muted/30"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2 rounded-lg"
                          onClick={() => {
                            setPhotoFiles(prev => ({ ...prev, [`challenge_${currentChallengeIndex}`]: null }));
                            setPhotoPreviews(prev => ({ ...prev, [`challenge_${currentChallengeIndex}`]: "" }));
                            setPhotoRejectionMsg(prev => ({ ...prev, [`challenge_${currentChallengeIndex}`]: "" }));
                          }}
                        >
                          Change photo
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/40 transition-colors bg-muted/20">
                        <Camera className="w-10 h-10 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground font-medium">Tap to take a photo or choose from gallery</p>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoSelect(`challenge_${currentChallengeIndex}`, e.target.files?.[0] || null)}
                        />
                      </label>
                    )}

                    {photoRejectionMsg[`challenge_${currentChallengeIndex}`] && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
                        {photoRejectionMsg[`challenge_${currentChallengeIndex}`]}
                      </div>
                    )}

                    {photoPreviews[`challenge_${currentChallengeIndex}`] && (
                      <Button
                        onClick={() => submitHandwritingAnswer(currentChallengeIndex)}
                        className="w-full h-12 text-lg font-bold rounded-xl"
                        disabled={assessingFreeText[`challenge_${currentChallengeIndex}`]}
                      >
                        {assessingFreeText[`challenge_${currentChallengeIndex}`] ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Mirri is reading your handwriting... 🦮
                          </>
                        ) : (
                          "Submit Handwriting ✍️"
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {showHint && !isCompleted && (
                  <div className="bg-ochre/10 border border-ochre/20 rounded-xl p-4 animate-slide-up">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="w-5 h-5 text-ochre flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-ochre mb-1">Writing Tip:</p>
                        <p className="text-foreground/80">{question.hint}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show minimal completion indicator for free-text (detailed feedback is in modal) */}
                {isCompleted && freeTextFeedback[`challenge_${currentChallengeIndex}`] && (
                  <div className="bg-eucalyptus/10 border border-eucalyptus/20 rounded-xl p-4 text-center animate-slide-up">
                    <span className="text-3xl block mb-2">✅</span>
                    <p className="font-semibold text-eucalyptus">
                      {freeTextFeedback[`challenge_${currentChallengeIndex}`].overallRating} +{freeTextFeedback[`challenge_${currentChallengeIndex}`].score} XP
                    </p>
                  </div>
                )}
              </div>
            ) : question.type === "worked_solution" ? (
              /* Worked solution question (Maths) */
              <div className="space-y-4">
                {question.working_steps_expected && (
                  <div className="bg-sky/10 border border-sky/20 rounded-xl p-3 text-sm">
                    <p className="font-semibold text-sky mb-2">
                      {question.worked_solution_type === "chart" ? "📊 Draw a chart showing:" : "📝 Show your working:"}
                    </p>
                    <ul className="list-disc list-inside text-foreground/80 space-y-1">
                      {question.working_steps_expected.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {question.bonus_xp && (
                  <div className="bg-ochre/10 border border-ochre/20 rounded-lg px-3 py-2 text-sm text-center">
                    ⭐ Up to <span className="font-bold text-primary">+{question.bonus_xp} bonus XP</span> for clear working!
                  </div>
                )}

                {!isCompleted && (
                  <>
                    {/* Three-tab input */}
                    <Tabs
                      value={answerMode[`challenge_${currentChallengeIndex}`] || "photo"}
                      onValueChange={(v) => setAnswerMode(prev => ({ ...prev, [`challenge_${currentChallengeIndex}`]: v as "photo" | "draw" | "type" }))}
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="photo">📷 Upload photo</TabsTrigger>
                        <TabsTrigger value="draw">✏️ Draw</TabsTrigger>
                        <TabsTrigger value="type">⌨️ Type</TabsTrigger>
                      </TabsList>

                      <TabsContent value="photo" className="space-y-3 mt-3">
                        {photoPreviews[`challenge_${currentChallengeIndex}`] ? (
                          <div className="relative">
                            <img
                              src={photoPreviews[`challenge_${currentChallengeIndex}`]}
                              alt="Your working"
                              className="w-full rounded-xl border border-border max-h-[300px] object-contain bg-muted/30"
                            />
                            <Button
                              variant="outline" size="sm"
                              className="absolute top-2 right-2 rounded-lg"
                              onClick={() => {
                                setPhotoFiles(prev => ({ ...prev, [`challenge_${currentChallengeIndex}`]: null }));
                                setPhotoPreviews(prev => ({ ...prev, [`challenge_${currentChallengeIndex}`]: "" }));
                              }}
                            >
                              Change photo
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/40 transition-colors bg-muted/20">
                            <Camera className="w-10 h-10 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground font-medium">📷 Upload photo of your work</p>
                            <input
                              type="file" accept="image/*" capture="environment"
                              className="hidden"
                              onChange={(e) => handlePhotoSelect(`challenge_${currentChallengeIndex}`, e.target.files?.[0] || null)}
                            />
                          </label>
                        )}
                      </TabsContent>

                      <TabsContent value="draw" className="mt-3">
                        <DrawingCanvas
                          onCanvasReady={(getDataUrl) => {
                            canvasGetDataUrlRef.current[`challenge_${currentChallengeIndex}`] = getDataUrl;
                          }}
                          disabled={isCompleted || assessingFreeText[`challenge_${currentChallengeIndex}`]}
                        />
                      </TabsContent>

                      <TabsContent value="type" className="mt-3">
                        <Textarea
                          value={freeTextAnswers[`challenge_${currentChallengeIndex}`] || ""}
                          onChange={(e) => handleFreeTextChange(`challenge_${currentChallengeIndex}`, e.target.value)}
                          placeholder="Type your working here (use Photo or Draw for best results)..."
                          className="min-h-[200px] resize-none font-mono"
                          disabled={isCompleted || assessingFreeText[`challenge_${currentChallengeIndex}`]}
                        />
                      </TabsContent>
                    </Tabs>

                    {photoRejectionMsg[`challenge_${currentChallengeIndex}`] && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive">
                        {photoRejectionMsg[`challenge_${currentChallengeIndex}`]}
                      </div>
                    )}

                    <Button
                      onClick={() => submitWorkedSolution(currentChallengeIndex)}
                      className="w-full h-12 text-lg font-bold rounded-xl"
                      disabled={assessingFreeText[`challenge_${currentChallengeIndex}`]}
                    >
                      {assessingFreeText[`challenge_${currentChallengeIndex}`] ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Mirri is checking...
                        </>
                      ) : (
                        "Submit Working 📐"
                      )}
                    </Button>
                  </>
                )}

                {isCompleted && mathsWorkingFeedback[`challenge_${currentChallengeIndex}`] && (
                  <div className="bg-eucalyptus/10 border border-eucalyptus/20 rounded-xl p-4 text-center animate-slide-up">
                    <span className="text-3xl block mb-2">✅</span>
                    <p className="font-semibold text-eucalyptus">
                      {mathsWorkingFeedback[`challenge_${currentChallengeIndex}`].overall_rating} +{(question.points || 30) + (mathsWorkingFeedback[`challenge_${currentChallengeIndex}`].bonus_xp_awarded || 0)} XP
                    </p>
                  </div>
                )}

                {showHint && !isCompleted && (
                  <div className="bg-ochre/10 border border-ochre/20 rounded-xl p-4 animate-slide-up">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="w-5 h-5 text-ochre flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-ochre mb-1">Hint:</p>
                        <p className="text-foreground/80">{question.hint}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : regeneratingQuestion[currentChallengeIndex] ? (
              /* Regenerating question loading state */
              <div className="flex flex-col items-center justify-center py-8 gap-3 animate-fade-in">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Generating a new question…</p>
              </div>
            ) : (
              /* Multiple choice question */
              <>
                <div className="space-y-2 mb-4">
                  {question.options?.map((option, index) => {
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
              </>
            )}
          </div>
        )}

        {allDone && !missionComplete && !showFeedbackModal && !showMathsFeedbackModal && (() => {
          // Bug 2 fix: Only kick off countdown when no feedback modal is open
          // For MC-only challenges, start countdown here; for free-text/worked_solution
          // the countdown is started in handleFeedbackModalClose/handleMathsFeedbackModalClose
          if (completionCountdown === null) {
            setTimeout(() => setCompletionCountdown(3), 0);
          }
          const pct = completionCountdown !== null ? ((3 - completionCountdown) / 3) * 100 : 0;
          const r = 28;
          const circ = 2 * Math.PI * r;
          const offset = circ - (pct / 100) * circ;
          return (
            <div className="text-center space-y-4 animate-bounce-in">
              <div className="bg-eucalyptus/10 border-2 border-eucalyptus/30 rounded-2xl p-6">
                <span className="text-5xl block mb-3">🎉</span>
                <h3 className="text-xl font-display font-bold text-foreground mb-1">
                  All Challenges Mastered!
                </h3>
                <p className="text-muted-foreground mb-5">
                  You've earned <span className="font-bold text-eucalyptus">{earnedXp} XP</span> this session!
                </p>

                {/* Countdown ring */}
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                      <circle
                        cx="36" cy="36" r={r}
                        fill="none"
                        stroke="hsl(var(--eucalyptus) / 0.15)"
                        strokeWidth="6"
                      />
                      <circle
                        cx="36" cy="36" r={r}
                        fill="none"
                        stroke="hsl(var(--eucalyptus))"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 0.9s linear" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-display font-bold text-eucalyptus-dark">
                        {completionCountdown ?? 3}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Completing training…</p>
                </div>
              </div>
            </div>
          );
        })()}

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
    <>
      {/* Writing Feedback Modal */}
      {pendingFeedbackKey && freeTextFeedback[pendingFeedbackKey] && (
        <WritingFeedbackModal
          isOpen={showFeedbackModal}
          onClose={handleFeedbackModalClose}
          feedback={freeTextFeedback[pendingFeedbackKey]}
          studentResponse={freeTextAnswers[pendingFeedbackKey] || ""}
          handwritingResult={handwritingResults[pendingFeedbackKey]}
        />
      )}

      {/* Maths Working Feedback Modal */}
      {pendingMathsFeedbackKey && mathsWorkingFeedback[pendingMathsFeedbackKey] && (
        <MathsWorkingFeedbackModal
          isOpen={showMathsFeedbackModal}
          onClose={handleMathsFeedbackModalClose}
          feedback={mathsWorkingFeedback[pendingMathsFeedbackKey]}
          bonusXp={mathsWorkingFeedback[pendingMathsFeedbackKey].bonus_xp_awarded || 0}
          workedSolutionType={
            lessonContent?.final_challenge.questions[
              parseInt(pendingMathsFeedbackKey.replace('challenge_', ''))
            ]?.worked_solution_type || "working"
          }
        />
      )}

      {/* Training Complete Celebration Overlay */}
      {missionComplete && celebrationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--ochre-dark) / 0.92), hsl(var(--ochre) / 0.92), hsl(var(--ochre-light) / 0.88))", backdropFilter: "blur(8px)" }}>
          <div className="relative max-w-sm w-full mx-4 animate-bounce-in">
            {/* Card */}
            <div className="bg-card rounded-3xl p-8 text-center" style={{ boxShadow: "0 30px 80px -15px hsl(var(--ochre-dark) / 0.5)" }}>

              {/* Mirri reaction */}
              <img src={dingoLogo} alt="Mirri" className="w-20 h-20 animate-float mb-2 select-none" />
              <p className="text-sm font-body text-muted-foreground mb-4 italic">
                {celebrationData.xp >= 100
                  ? "You absolutely smashed it! 🔥"
                  : celebrationData.xp >= 60
                  ? "Ripper work, legend! 🌟"
                  : "Great effort, keep it up! 💪"}
              </p>

              {/* Headline */}
              <h2 className="text-3xl font-display font-bold text-foreground mb-6">
                Mission Complete! 🏆
              </h2>

              {/* Stats row */}
              <div className="flex gap-3 justify-center mb-6">
                {/* XP earned */}
                <div className="flex-1 rounded-2xl p-4" style={{ background: "linear-gradient(135deg, hsl(var(--ochre) / 0.12), hsl(var(--ochre-light) / 0.08))", border: "1.5px solid hsl(var(--ochre) / 0.25)" }}>
                  <div className="text-3xl font-display font-bold text-primary leading-none">+{celebrationData.xp}</div>
                  <div className="text-xs text-muted-foreground mt-1 font-body">XP earned</div>
                </div>

                {/* Streak */}
                <div className="flex-1 rounded-2xl p-4" style={{ background: "linear-gradient(135deg, hsl(0 72% 55% / 0.12), hsl(0 72% 55% / 0.06))", border: "1.5px solid hsl(0 72% 55% / 0.25)" }}>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl">🔥</span>
                    <span className="text-3xl font-display font-bold text-destructive leading-none">{celebrationData.streak}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-body">
                    {celebrationData.isStreakDay ? "Streak day!" : "Day streak"}
                  </div>
                </div>
              </div>

              {/* Returning message */}
              <p className="text-sm text-muted-foreground font-body animate-pulse-soft">
                Heading back to the dojo…
              </p>
            </div>
          </div>
        </div>
      )}

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
      <main className="flex-grow flex overflow-hidden relative">
        {/* Mobile/Tablet (below lg): floating Sensei bottom sheet */}
        {isCompact && (
          <SenseiChatDrawer
            messages={messages}
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            isChatLoading={isChatLoading}
            onSendMessage={sendMessage}
            subscriptionTier={profile?.subscription_tier}
          />
        )}

        {/* Left Column - The Training */}
        <div ref={lessonRef} className={`${isCompact ? 'w-full' : 'w-1/2'} border-r border-border overflow-y-auto scrollbar-thin p-4 md:p-6`}>
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
                <p className="text-muted-foreground">Generating your personalised training...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - The Sensei (Desktop only) */}
        {!isCompact && (
          <div className="w-1/2 flex flex-col bg-sand/30">
            <div className="flex-shrink-0 p-4 border-b border-border bg-card/50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={dingoLogo} alt="Sensei" className={`w-12 h-12 ${desktopVoice.isListening ? "animate-pulse" : ""} ${desktopVoice.isSpeaking ? "animate-bounce" : ""}`} />
                  {desktopVoice.isListening && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive animate-pulse" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-foreground">Mirri the Study Buddy</h3>
                  <p className="text-sm text-muted-foreground">Ask me for hints!</p>
                </div>
                {isChampionUser && (
                  <Button
                    variant={desktopVoiceMode ? "default" : "ghost"}
                    size="icon"
                    onClick={() => {
                      if (!desktopVoiceMode) {
                        if (desktopVoice.sttUnsupported) {
                          toast("Voice input isn't supported on this browser. Mirri can still speak her replies — or switch to text mode.", { icon: "🎙️" });
                        }
                        setDesktopVoiceMode(true);
                        desktopVoice.startListening();
                      } else {
                        setDesktopVoiceMode(false);
                        desktopVoice.stopListening();
                        desktopVoice.cancelSpeech();
                      }
                    }}
                    className="rounded-full"
                    title={desktopVoiceMode ? "Switch to text mode" : "Switch to voice mode"}
                  >
                    {desktopVoiceMode ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-grow overflow-y-auto scrollbar-thin p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
                >
                  {message.role === "assistant" && (
                    <img src={dingoLogo} alt="Sensei" className="w-8 h-8 mr-2 flex-shrink-0" />
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
                    <img src={dingoLogo} alt="Sensei" className="w-8 h-8 mr-2" />
                  <div className="chat-bubble-assistant">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="flex-shrink-0 p-4 border-t border-border bg-card/50">
              {desktopVoiceMode ? (
                <div className="flex items-center justify-center gap-3">
                  {desktopVoice.isSpeaking ? (
                    <>
                      <p className="text-sm text-muted-foreground">Mirri is talking…</p>
                      <Button size="icon" variant="destructive" onClick={desktopVoice.cancelSpeech} className="rounded-full">
                        <Square className="w-4 h-4" />
                      </Button>
                    </>
                  ) : desktopVoice.isListening ? (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                      <p className="text-sm text-muted-foreground">Listening…</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Tap the mic to start</p>
                  )}
                </div>
              ) : (
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
              )}
            </div>
          </div>
        )}
      </main>
    </div>
    </>
  );
}