import { useState, useRef, useEffect, useCallback } from "react";
import dingoLogo from "@/assets/dingo-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface HomeworkHelpDrawerProps {
  gradeLevel?: string;
}

export function HomeworkHelpDrawer({ gradeLevel }: HomeworkHelpDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: inputMessage.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInputMessage("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/homework-help`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
    } catch (err) {
      console.error("Homework help error:", err);
      toast.error("Something went wrong. Try again!");
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, isLoading, messages, gradeLevel]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
            <img src={dingoLogo} alt="Mirri" className="w-12 h-12" />
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
