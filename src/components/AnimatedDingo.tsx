import { useEffect, useState } from "react";

export function AnimatedDingo() {
  const [isWagging, setIsWagging] = useState(true);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    // Blink every 3-5 seconds
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div className="relative w-20 h-20 md:w-24 md:h-24">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}
      >
        {/* Ears */}
        <path
          d="M25 35 L15 10 L35 25 Z"
          fill="hsl(var(--ochre))"
          className="origin-[25px_25px] animate-[ear-twitch_4s_ease-in-out_infinite]"
        />
        <path
          d="M75 35 L85 10 L65 25 Z"
          fill="hsl(var(--ochre))"
          className="origin-[75px_25px] animate-[ear-twitch_4s_ease-in-out_infinite_0.5s]"
        />
        
        {/* Inner ears */}
        <path d="M23 30 L18 15 L32 27 Z" fill="hsl(var(--ochre-light))" />
        <path d="M77 30 L82 15 L68 27 Z" fill="hsl(var(--ochre-light))" />

        {/* Face */}
        <ellipse cx="50" cy="55" rx="35" ry="32" fill="hsl(var(--ochre))" />
        
        {/* Muzzle */}
        <ellipse cx="50" cy="65" rx="20" ry="18" fill="hsl(var(--ochre-light))" />
        
        {/* Eyes */}
        <g className={isBlinking ? "opacity-0" : "opacity-100"} style={{ transition: "opacity 0.1s" }}>
          <ellipse cx="38" cy="48" rx="6" ry="7" fill="#2D1810" />
          <ellipse cx="62" cy="48" rx="6" ry="7" fill="#2D1810" />
          {/* Eye shine */}
          <circle cx="40" cy="46" r="2" fill="white" />
          <circle cx="64" cy="46" r="2" fill="white" />
        </g>
        
        {/* Closed eyes (for blinking) */}
        {isBlinking && (
          <>
            <path d="M32 48 Q38 52 44 48" stroke="#2D1810" strokeWidth="2" fill="none" />
            <path d="M56 48 Q62 52 68 48" stroke="#2D1810" strokeWidth="2" fill="none" />
          </>
        )}
        
        {/* Nose */}
        <ellipse cx="50" cy="60" rx="6" ry="4" fill="#2D1810" />
        
        {/* Mouth - happy smile */}
        <path
          d="M40 68 Q50 78 60 68"
          stroke="#2D1810"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Tongue */}
        <ellipse
          cx="50"
          cy="73"
          rx="4"
          ry="5"
          fill="#E57373"
          className={isWagging ? "animate-[tongue-wag_0.5s_ease-in-out_infinite]" : ""}
        />
      </svg>
      
      {/* Tail (separate for wagging animation) */}
      <div
        className={`absolute -right-4 top-1/2 origin-left ${isWagging ? "animate-[tail-wag_0.3s_ease-in-out_infinite]" : ""}`}
      >
        <svg width="30" height="20" viewBox="0 0 30 20">
          <path
            d="M0 10 Q15 0 28 5 Q30 10 28 15 Q15 20 0 10"
            fill="hsl(var(--ochre))"
          />
        </svg>
      </div>
    </div>
  );
}