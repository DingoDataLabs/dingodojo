interface MirriSuggestionProps {
  message: string;
  className?: string;
}

export function MirriSuggestion({ message, className = "" }: MirriSuggestionProps) {
  return (
    <div className={`flex items-start gap-3 animate-slide-up ${className}`}>
      <div className="w-12 h-12 rounded-full bg-ochre flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
        🦊
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-md">
        <p className="text-sm text-foreground font-medium">{message}</p>
      </div>
    </div>
  );
}
