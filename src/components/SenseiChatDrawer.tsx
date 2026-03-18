import { useState, useRef, useEffect, useCallback } from "react";
import dingoLogo from "@/assets/dingo-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTrigger } from "@/components/ui/drawer";
import { Send, Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import { useMirriVoice } from "@/hooks/useMirriVoice";
import { VoiceModeInput } from "@/components/VoiceModeInput";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SenseiChatDrawerProps {
  messages: ChatMessage[];
  inputMessage: string;
  setInputMessage: (value: string) => void;
  isChatLoading: boolean;
  onSendMessage: () => void;
  subscriptionTier?: string;
}

export function SenseiChatDrawer({
  messages,
  inputMessage,
  setInputMessage,
  isChatLoading,
  onSendMessage,
  subscriptionTier,
}: SenseiChatDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const prevLoadingRef = useRef(isChatLoading);

  const isChampion = subscriptionTier === "champion";

  const handleTranscript = useCallback((text: string) => {
    setInputMessage(text);
    setTimeout(() => onSendMessage(), 100);
  }, [setInputMessage, onSendMessage]);

  const handleSpeakingChange = useCallback(() => {}, []);

  const voice = useMirriVoice({
    isChampion,
    onTranscript: handleTranscript,
    onSpeakingChange: handleSpeakingChange,
  });

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsCompact(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Auto-speak when streaming completes in voice mode
  useEffect(() => {
    if (prevLoadingRef.current && !isChatLoading && voiceMode) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.content) {
        voice.speak(lastMsg.content);
      }
    }
    prevLoadingRef.current = isChatLoading;
  }, [isChatLoading, messages, voiceMode]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
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

  const headerContent = (
    <div className="flex items-center gap-3">
      <div className="relative">
        <img
          src={dingoLogo}
          alt="Sensei"
          className={`w-10 h-10 ${voice.isSpeaking ? "animate-bounce" : ""}`}
        />
      </div>
      <div className="flex-1">
        <span className="font-display font-bold text-foreground">
          Mirri the Study Buddy
        </span>
        <p className="text-sm text-muted-foreground">Ask me for hints!</p>
      </div>
    </div>
  );

  const inputArea = voiceMode ? (
    <VoiceModeInput
      isListening={voice.isListening}
      isSpeaking={voice.isSpeaking}
      isChatLoading={isChatLoading}
      onPushToTalk={handlePushToTalk}
      onSwitchToText={switchToTextMode}
    />
  ) : (
    <div className="flex gap-2">
      <Input
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        placeholder="Ask Sensei a question..."
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

  const chatContent = (
    <>
      <div className="flex-grow overflow-y-auto scrollbar-thin p-4 space-y-4 bg-sand/30">
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
        {isChatLoading && (
          <div className="flex justify-start animate-slide-up">
            <img src={dingoLogo} alt="Sensei" className="w-8 h-8 mr-2" />
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
    </>
  );

  const triggerButton = (
    <Button
      size="icon"
      className="w-14 h-14 rounded-full bg-ochre hover:bg-ochre-dark shadow-lg"
    >
      <img src={dingoLogo} alt="Sensei" className="w-8 h-8" />
    </Button>
  );

  if (isCompact) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        {!isOpen && (
          <div className="absolute -top-10 right-0 bg-card border border-border rounded-2xl rounded-br-sm px-3 py-2 shadow-lg max-w-[160px]">
            <p className="text-xs text-muted-foreground">Need help?</p>
          </div>
        )}
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
          <DrawerContent className="max-h-[85vh] flex flex-col">
            <DrawerHeader className="p-4 border-b border-border bg-card/50">
              {headerContent}
            </DrawerHeader>
            {chatContent}
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="fixed top-16 right-4 z-40 flex items-start gap-2">
      {!isOpen && (
        <div className="bg-card border border-border rounded-2xl rounded-tr-sm px-3 py-2 shadow-lg animate-slide-up max-w-[180px]">
          <p className="text-xs text-muted-foreground">Need help? Ask Sensei!</p>
        </div>
      )}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border bg-card/50">
            {headerContent}
          </SheetHeader>
          {chatContent}
        </SheetContent>
      </Sheet>
    </div>
  );
}
