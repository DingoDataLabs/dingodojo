import { useState, useRef, useEffect, useCallback } from "react";
import dingoLogo from "@/assets/dingo-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Send, Loader2, MessageCircle, Mic } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMirriVoice } from "@/hooks/useMirriVoice";
import { VoiceModeInput } from "@/components/VoiceModeInput";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface HomeworkHelpDrawerProps {
  gradeLevel?: string;
  subscriptionTier?: string;
}

export function HomeworkHelpDrawer({ gradeLevel, subscriptionTier }: HomeworkHelpDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamingCompleteRef = useRef(false);
  const latestAssistantRef = useRef("");

  const isChampion = subscriptionTier === "champion";

  const sendMessageRef = useRef<(text: string) => void>(() => {});

  const handleTranscript = useCallback((text: string) => {
    setInputMessage(text);
    setTimeout(() => {
      sendMessageRef.current(text);
    }, 100);
  }, []);

  const handleSpeakingChange = useCallback(() => {}, []);

  const voice = useMirriVoice({
    isChampion,
    onTranscript: handleTranscript,
    onSpeakingChange: handleSpeakingChange,
  });

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // When streaming completes and voice mode is on, speak the response
  useEffect(() => {
    if (streamingCompleteRef.current && voiceMode && latestAssistantRef.current && !isLoading) {
      streamingCompleteRef.current = false;
      voice.speak(latestAssistantRef.current);
    }
  }, [isLoading, voiceMode]);

  const sendMessageWithText = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInputMessage("");
    setIsLoading(true);
    streamingCompleteRef.current = false;
    latestAssistantRef.current = "";

    let assistantContent = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-tutor`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          gradeLevel,
        }),
      });

      if (resp.status === 429) {
        toast.error("Too many requests — try again in a moment!");
        setIsLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("AI credits exhausted.");
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        throw new Error("Failed to start stream");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              const currentContent = assistantContent;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: currentContent } : m);
                }
                return [...prev, { role: "assistant", content: currentContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      latestAssistantRef.current = assistantContent;
      streamingCompleteRef.current = true;
    } catch (err) {
      console.error("Homework help error:", err);
      toast.error("Something went wrong. Try again!");
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, isLoading, messages, gradeLevel]);

  // Keep ref in sync so voice callback always uses latest version
  sendMessageRef.current = sendMessageWithText;

  const sendMessage = useCallback(() => {
    sendMessageWithText(inputMessage);
  }, [inputMessage, sendMessageWithText]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePushToTalk = () => {
    if (voice.isSpeaking) {
      voice.cancelSpeech();
      voice.startListening();
    } else if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening();
    }
  };

  const switchToVoiceMode = () => {
    if (voice.sttUnsupported) {
      toast("Voice input isn't supported on this browser. Mirri can still speak her replies — or switch to text mode.", { icon: "🎙️" });
    }
    setVoiceMode(true);
  };

  const switchToTextMode = () => {
    setVoiceMode(false);
    voice.stopListening();
    voice.cancelSpeech();
  };

  const inputArea = voiceMode ? (
    <VoiceModeInput
      isListening={voice.isListening}
      isSpeaking={voice.isSpeaking}
      isChatLoading={isLoading}
      onPushToTalk={handlePushToTalk}
      onSwitchToText={switchToTextMode}
    />
  ) : (
    <div className="flex gap-2">
      <Input
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        placeholder="What do you need help with?"
        onKeyPress={handleKeyPress}
        disabled={isLoading}
        className="flex-1 rounded-xl"
      />
      <Button
        onClick={sendMessage}
        disabled={!inputMessage.trim() || isLoading}
        size="icon"
        className="rounded-xl w-12 h-10"
      >
        <Send className="w-4 h-4" />
      </Button>
      {isChampion && (
        <Button
          onClick={switchToVoiceMode}
          variant="ghost"
          size="icon"
          className="rounded-xl w-12 h-10"
          title="Switch to voice mode"
        >
          <Mic className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl text-primary-foreground hover:bg-white/20 w-12 h-12"
        >
          <MessageCircle className="w-10 h-10" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border bg-card/50">
          <div className="flex items-center gap-3">
            <img src={dingoLogo} alt="Mirri" className={`w-12 h-12 ${voice.isSpeaking ? "animate-bounce" : ""}`} />
            <div className="flex-1">
              <SheetTitle className="font-display font-bold text-foreground">
                Mirri — Homework Help
              </SheetTitle>
              <p className="text-sm text-muted-foreground">I'll help you figure it out! 🦘</p>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-grow overflow-y-auto scrollbar-thin p-4 space-y-4 bg-sand/30">
          {messages.length === 0 && (
            <div className="text-center py-8 animate-slide-up">
              <img src={dingoLogo} alt="Mirri" className="w-16 h-16 mx-auto mb-3 animate-float" />
              <p className="text-muted-foreground text-sm font-medium">
                G'day! Need help with homework? 📚
              </p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Ask me about any subject — I'll guide you to the answer!
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
            >
              {message.role === "assistant" && (
                <img src={dingoLogo} alt="Mirri" className="w-8 h-8 mr-2 flex-shrink-0" />
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
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start animate-slide-up">
              <img src={dingoLogo} alt="Mirri" className="w-8 h-8 mr-2" />
              <div className="chat-bubble-assistant">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="flex-shrink-0 p-4 bg-card border-t border-border">
          {inputArea}
        </div>
      </SheetContent>
    </Sheet>
  );
}
