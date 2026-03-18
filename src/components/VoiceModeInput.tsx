import { Button } from "@/components/ui/button";
import { Mic, Keyboard } from "lucide-react";

interface VoiceModeInputProps {
  isListening: boolean;
  isSpeaking: boolean;
  isChatLoading: boolean;
  onPushToTalk: () => void;
  onSwitchToText: () => void;
}

export function VoiceModeInput({
  isListening,
  isSpeaking,
  isChatLoading,
  onPushToTalk,
  onSwitchToText,
}: VoiceModeInputProps) {
  const showRespondingLabel = isChatLoading || isSpeaking;

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {showRespondingLabel && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {isSpeaking ? "Mirri is talking… tap to interrupt" : "Mirri is responding…"}
        </p>
      )}
      {isListening && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
          Listening…
        </p>
      )}
      <div className="flex items-center gap-3">
        <Button
          onClick={onPushToTalk}
          disabled={isChatLoading && !isSpeaking}
          size="icon"
          variant={isListening ? "destructive" : "default"}
          className={`rounded-full w-16 h-16 shadow-lg transition-all ${
            isListening ? "ring-4 ring-destructive/30 scale-105" : ""
          }`}
        >
          <Mic className="w-7 h-7" />
        </Button>
        <Button
          onClick={onSwitchToText}
          variant="ghost"
          size="icon"
          className="rounded-full"
          title="Switch to text mode"
        >
          <Keyboard className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
