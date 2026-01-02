import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Sparkles, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface Topic {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  description: string | null;
}

interface LessonContent {
  title: string;
  emoji: string;
  fun_fact: string;
  lesson_text: string;
  challenge_question: {
    type: string;
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Profile {
  id: string;
  total_xp: number;
}

export default function TrainingSession() {
  const { subjectSlug, topicSlug } = useParams<{ subjectSlug: string; topicSlug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [topic, setTopic] = useState<Topic | null>(null);
  const [lessonContent, setLessonContent] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Challenge state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [missionComplete, setMissionComplete] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "G'day! I'm Mirri, your study buddy! 🦘 Read through the lesson on the left, and ask me anything if you get stuck. Let's learn together!",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      .select("id, total_xp")
      .eq("user_id", user?.id)
      .maybeSingle();
    
    if (data) setProfile(data);
  };

  const fetchTopicAndLesson = async () => {
    try {
      // Fetch topic
      const { data: topicData, error: topicError } = await supabase
        .from("topics")
        .select("*")
        .eq("slug", topicSlug)
        .maybeSingle();

      if (topicError || !topicData) {
        console.error("Topic error:", topicError);
        navigate("/");
        return;
      }

      setTopic(topicData);

      // Check for existing generated module
      const { data: moduleData } = await supabase
        .from("generated_modules")
        .select("content_json")
        .eq("topic_id", topicData.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (moduleData?.content_json) {
        setLessonContent(moduleData.content_json as unknown as LessonContent);
        setLoading(false);
      } else {
        // Generate new lesson
        await generateLesson(topicData);
      }
    } catch (err) {
      console.error("Error:", err);
      setLoading(false);
    }
  };

  const generateLesson = async (topicData: Topic) => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson", {
        body: { topicName: topicData.name, topicEmoji: topicData.emoji },
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

  const handleAnswerSelect = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const checkAnswer = () => {
    if (selectedAnswer === null) {
      toast.error("Pick an answer first!");
      return;
    }
    setShowResult(true);

    const isCorrect = selectedAnswer === lessonContent?.challenge_question.correct_answer;
    if (isCorrect) {
      toast.success("Brilliant! That's correct! 🎉");
    } else {
      toast.error("Not quite, but keep trying! 💪");
    }
  };

  const completeMission = async () => {
    if (!profile || !topic) return;

    try {
      // Add XP
      await supabase
        .from("profiles")
        .update({ total_xp: (profile.total_xp || 0) + 50 })
        .eq("id", profile.id);

      // Mark progress
      await supabase.from("student_progress").upsert({
        student_id: profile.id,
        topic_id: topic.id,
        is_completed: true,
        xp_earned: 50,
      }, {
        onConflict: "student_id,topic_id",
      });

      setMissionComplete(true);

      // Confetti! 🎉
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#D97706", "#059669", "#0EA5E9", "#F59E0B"],
      });

      toast.success("+50 XP earned! You're amazing! 🏆");

      // Navigate back after celebration
      setTimeout(() => {
        navigate(`/subject/${subjectSlug}`);
      }, 2500);
    } catch (err) {
      console.error("Error completing mission:", err);
      toast.error("Something went wrong!");
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsChatLoading(true);

    try {
      const chatMessages = [
        ...messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) !== 0), // Exclude initial greeting
        { role: "user" as const, content: userMessage },
      ];

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
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Chat failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
                setMessages((prev) => {
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
      setMessages((prev) => [
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-float mb-4">{generating ? "✨" : "📖"}</div>
          <p className="text-muted-foreground text-lg animate-pulse">
            {generating ? "Creating your lesson..." : "Loading..."}
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
        </div>
        <div className="xp-badge">+50 XP</div>
      </header>

      {/* Split View */}
      <main className="flex-grow flex overflow-hidden">
        {/* Left Column - The Mission */}
        <div className="w-1/2 border-r border-border overflow-y-auto scrollbar-thin p-4 md:p-6">
          {lessonContent ? (
            <div className="space-y-6 max-w-xl mx-auto animate-slide-up">
              {/* Title */}
              <div className="text-center">
                <span className="text-5xl block mb-3">{lessonContent.emoji}</span>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  {lessonContent.title}
                </h2>
              </div>

              {/* Fun Fact */}
              <div className="fun-fact-card">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-sky flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground text-sm mb-1">Fun Fact!</p>
                    <p className="text-foreground/80">{lessonContent.fun_fact}</p>
                  </div>
                </div>
              </div>

              {/* Lesson Text */}
              <div className="bg-card rounded-2xl p-5 border border-border">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                  {lessonContent.lesson_text}
                </p>
              </div>

              {/* Challenge */}
              <div className="bg-card rounded-2xl p-5 border-2 border-primary/20">
                <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                  🎯 Challenge Time!
                </h3>
                <p className="font-medium text-foreground mb-4">
                  {lessonContent.challenge_question.question}
                </p>

                <div className="space-y-2 mb-4">
                  {lessonContent.challenge_question.options.map((option, index) => {
                    const isCorrect = index === lessonContent.challenge_question.correct_answer;
                    const isSelected = selectedAnswer === index;

                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={showResult}
                        className={`w-full p-4 rounded-xl text-left font-medium transition-all ${
                          showResult
                            ? isCorrect
                              ? "bg-eucalyptus text-eucalyptus-foreground"
                              : isSelected
                              ? "bg-destructive text-destructive-foreground"
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

                {!showResult && (
                  <Button
                    onClick={checkAnswer}
                    className="w-full h-12 text-lg font-bold rounded-xl"
                    disabled={selectedAnswer === null}
                  >
                    Check Answer
                  </Button>
                )}

                {showResult && (
                  <div className="space-y-4">
                    <div className="bg-muted p-4 rounded-xl">
                      <p className="text-foreground">
                        {lessonContent.challenge_question.explanation}
                      </p>
                    </div>

                    {!missionComplete && (
                      <Button
                        onClick={completeMission}
                        className="w-full h-14 text-lg font-bold rounded-xl bg-eucalyptus hover:bg-eucalyptus-dark gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Complete Mission! 🎉
                      </Button>
                    )}

                    {missionComplete && (
                      <div className="text-center p-4 animate-bounce-in">
                        <p className="text-2xl font-display font-bold text-eucalyptus">
                          🏆 Mission Complete! 🏆
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Generating your lesson...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - The Sensei */}
        <div className="w-1/2 flex flex-col bg-sand/30">
          {/* Sensei Header */}
          <div className="flex-shrink-0 p-4 border-b border-border bg-card/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-ochre flex items-center justify-center text-2xl">
                🦊
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground">Mirri the Study Buddy</h3>
                <p className="text-sm text-muted-foreground">Here to help!</p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
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
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="flex-shrink-0 p-4 border-t border-border bg-card/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask Mirri anything..."
                className="flex-grow h-12 rounded-xl text-base"
                disabled={isChatLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-12 w-12 rounded-xl"
                disabled={isChatLoading || !inputMessage.trim()}
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
