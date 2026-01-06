import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Send, Loader2, MessageCircle, X } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MirriChatDrawerProps {
  messages: ChatMessage[];
  inputMessage: string;
  setInputMessage: (value: string) => void;
  isChatLoading: boolean;
  onSendMessage: () => void;
}

export function MirriChatDrawer({
  messages,
  inputMessage,
  setInputMessage,
  isChatLoading,
  onSendMessage,
}: MirriChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <>
      {/* Floating Mirri button with speech bubble */}
      <div className="fixed top-16 right-4 z-40 flex items-start gap-2">
        {/* Speech bubble hint */}
        {!isOpen && (
          <div className="bg-card border border-border rounded-2xl rounded-tr-sm px-3 py-2 shadow-lg animate-slide-up max-w-[180px]">
            <p className="text-xs text-muted-foreground">
              Need help? Tap to chat with me! 🦊
            </p>
          </div>
        )}
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="w-14 h-14 rounded-full bg-ochre hover:bg-ochre-dark shadow-lg"
            >
              <span className="text-2xl">🦊</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
            <SheetHeader className="p-4 border-b border-border bg-card/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-ochre flex items-center justify-center text-2xl">
                  🦊
                </div>
                <div className="flex-1">
                  <SheetTitle className="font-display font-bold text-foreground">
                    Mirri the Study Buddy
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground">Ask me for hints!</p>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-grow overflow-y-auto scrollbar-thin p-4 space-y-4 bg-sand/30">
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
              {isChatLoading && (
                <div className="flex justify-start animate-slide-up">
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

            <div className="flex-shrink-0 p-4 bg-card border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask Mirri a question..."
                  onKeyPress={handleKeyPress}
                  disabled={isChatLoading}
                  className="flex-1 rounded-xl"
                />
                <Button
                  onClick={onSendMessage}
                  disabled={!inputMessage.trim() || isChatLoading}
                  size="icon"
                  className="rounded-xl w-12 h-10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
