import { AnimatedDingo } from "./AnimatedDingo";

interface MirriSuggestionProps {
  message: string;
  className?: string;
}

export function MirriSuggestion({ message, className = "" }: MirriSuggestionProps) {
  return (
    <div className={`flex items-end gap-2 ${className}`}>
      {/* Dingo mascot */}
      <div className="flex-shrink-0 -mb-1">
        <AnimatedDingo />
      </div>
      
      {/* Speech bubble */}
      <div className="relative flex-1 max-w-lg">
        {/* Speech bubble tail pointing to dingo */}
        <div 
          className="absolute -left-3 bottom-4 w-0 h-0"
          style={{
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: '12px solid hsl(var(--card))',
            filter: 'drop-shadow(-2px 0 2px rgba(0,0,0,0.05))',
          }}
        />
        <div 
          className="absolute -left-[11px] bottom-4 w-0 h-0"
          style={{
            borderTop: '7px solid transparent',
            borderBottom: '7px solid transparent',
            borderRight: '10px solid hsl(var(--border))',
          }}
        />
        
        {/* Bubble content */}
        <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-4 shadow-md relative">
          <p className="text-base md:text-lg text-foreground font-medium leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
