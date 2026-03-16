import { useState, useEffect, useRef, useCallback } from "react";
import dingoLogo from "@/assets/dingo-logo.png";

const SCENE_DURATIONS = [4000, 3000, 4500, 4200, 5500, 5200, 5000];
const SCENE_LABELS = [
  "Dashboard",
  "Generating lesson",
  "Lesson content",
  "Challenge question",
  "Camera submission",
  "Mirri's feedback",
  "Rank upgrade",
];

// Tap ripple delays per scene (-1 = no ripple)
const RIPPLE_DELAYS = [2200, -1, -1, 2500, 2500, 3500, -1];

interface HeroDemoPhoneProps {
  activeScene: number;
  onSceneChange: (scene: number) => void;
}

export default function HeroDemoPhone({ activeScene, onSceneChange }: HeroDemoPhoneProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [ripple, setRipple] = useState<{ x: number; y: number; label: string } | null>(null);
  const [rippleKey, setRippleKey] = useState(0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const scheduleNext = useCallback((currentScene: number) => {
    clearTimers();
    const duration = SCENE_DURATIONS[currentScene];
    const rippleDelay = RIPPLE_DELAYS[currentScene];

    if (rippleDelay >= 0) {
      const rt = setTimeout(() => {
        fireRipple(currentScene);
      }, rippleDelay);
      timersRef.current.push(rt);
    }

    const t = setTimeout(() => {
      const next = (currentScene + 1) % 7;
      onSceneChange(next);
    }, duration);
    timersRef.current.push(t);
  }, [clearTimers, onSceneChange]);

  useEffect(() => {
    scheduleNext(activeScene);
    return clearTimers;
  }, [activeScene, scheduleNext, clearTimers]);

  const fireRipple = (scene: number) => {
    // Positions are percentages of screen dimensions
    const positions: Record<number, { x: number; y: number; label: string }> = {
      0: { x: 50, y: 82, label: "👆 Start Mission" },
      3: { x: 72, y: 78, label: "👆 Upload photo" },
      4: { x: 50, y: 88, label: "👆 Capture" },
      5: { x: 50, y: 90, label: "👆 Claim XP" },
    };
    const pos = positions[scene];
    if (pos) {
      setRipple(pos);
      setRippleKey(k => k + 1);
      setTimeout(() => setRipple(null), 1200);
    }
  };

  const headerOchre = (
    <div
      className="relative px-3 pt-3 pb-4"
      style={{ background: "linear-gradient(135deg, hsl(var(--ochre-dark)), hsl(var(--ochre)), hsl(var(--ochre-light)))" }}
    >
      <div className="flex items-center gap-2">
        <img src={dingoLogo} alt="" className="w-6 h-6 rounded-full" />
        <div className="min-w-0">
          <p className="text-[9px] font-bold text-primary-foreground leading-tight truncate" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative select-none" style={{ width: 260, height: 520 }}>
      {/* Phone body */}
      <div
        className="absolute inset-0 rounded-[44px] p-[6px]"
        style={{ background: "#1c1410" }}
      >
        {/* Notch */}
        <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-20 h-[14px] rounded-b-xl z-20" style={{ background: "#1c1410" }} />

        {/* Screen */}
        <div
          ref={screenRef}
          className="relative w-full h-full rounded-[32px] overflow-hidden bg-background"
        >
          {/* Scene 0 — Dashboard */}
          <SceneWrapper active={activeScene === 0}>
            <div
              className="px-3 pt-5 pb-4"
              style={{ background: "linear-gradient(135deg, hsl(var(--ochre-dark)), hsl(var(--ochre)), hsl(var(--ochre-light)))" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <img src={dingoLogo} alt="" className="w-7 h-7 rounded-full" />
                <div>
                  <p className="text-[10px] font-bold text-primary-foreground leading-tight">G'day, Alex!</p>
                  <p className="text-[7px] text-primary-foreground/70">Year 5 · The Dojo</p>
                </div>
              </div>
            </div>
            {/* Wavy edge */}
            <svg viewBox="0 0 260 12" className="w-full -mt-[1px] block" preserveAspectRatio="none">
              <path d="M0,6 C65,12 130,0 195,6 C220,9 240,4 260,6 L260,12 L0,12 Z" className="fill-background" />
            </svg>
            <div className="px-3 pt-1">
              {/* Stats 2x2 */}
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {[
                  { icon: "🥋", label: "Dojo Rank", val: "Orange Belt", sub: "1,906 XP" },
                  { icon: "⚡", label: "This Week", val: "0 / 600 XP", sub: "Keep training!" },
                  { icon: "🔥", label: "Streak", val: "1w", sub: "Best: 0w" },
                  { icon: "✍️", label: "Handwriting", val: "3.0/5", sub: "" },
                ].map(t => (
                  <div key={t.label} className="bg-card rounded-xl p-2 shadow-soft border border-border/40">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="text-[10px]">{t.icon}</span>
                      <span className="text-[7px] text-muted-foreground font-semibold">{t.label}</span>
                    </div>
                    <p className="text-[9px] font-bold text-foreground leading-tight">{t.val}</p>
                    {t.sub && <p className="text-[6px] text-muted-foreground">{t.sub}</p>}
                  </div>
                ))}
              </div>
              {/* Start Mission */}
              <div
                className="rounded-2xl p-3 flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, hsl(var(--ochre)), hsl(var(--ochre-light)))" }}
              >
                <div className="w-7 h-7 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                  <span className="text-primary-foreground text-xs">▶</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-primary-foreground">Start Mission</p>
                  <p className="text-[7px] text-primary-foreground/70">Just 94 XP to level up!</p>
                </div>
                <span className="text-primary-foreground text-xs">⚡</span>
              </div>
            </div>
          </SceneWrapper>

          {/* Scene 1 — Generating */}
          <SceneWrapper active={activeScene === 1}>
            <div
              className="px-3 pt-5 pb-3"
              style={{ background: "linear-gradient(135deg, hsl(var(--ochre-dark)), hsl(var(--ochre)), hsl(var(--ochre-light)))" }}
            >
              <div className="flex items-center gap-2">
                <img src={dingoLogo} alt="" className="w-6 h-6 rounded-full" />
                <div>
                  <p className="text-[9px] font-bold text-primary-foreground">English — Creative Writing</p>
                  <p className="text-[7px] text-primary-foreground/70">Generating...</p>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center" style={{ paddingTop: 100 }}>
              <span className="text-4xl animate-pulse-soft">✨</span>
              <p className="text-[10px] text-muted-foreground mt-3 text-center px-6">Creating your personalised lesson...</p>
            </div>
          </SceneWrapper>

          {/* Scene 2 — Lesson content */}
          <SceneWrapper active={activeScene === 2}>
            <div
              className="px-3 pt-5 pb-3 relative"
              style={{ background: "linear-gradient(135deg, hsl(var(--ochre-dark)), hsl(var(--ochre)), hsl(var(--ochre-light)))" }}
            >
              <div className="flex items-center gap-2">
                <img src={dingoLogo} alt="" className="w-6 h-6 rounded-full" />
                <div>
                  <p className="text-[9px] font-bold text-primary-foreground">English — Creative Writing</p>
                  <p className="text-[7px] text-primary-foreground/70">Extending level</p>
                </div>
              </div>
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[8px] font-bold px-2 py-0.5 rounded-full">
                +50 XP
              </div>
            </div>
            <div className="px-3 pt-3 space-y-2">
              <div className="text-center">
                <span className="text-2xl">✍️</span>
                <p className="text-[10px] font-bold text-foreground leading-tight mt-1">
                  Crafting Gripping Narratives: Beyond the Basics
                </p>
              </div>
              {/* Fun fact */}
              <div className="rounded-xl p-2" style={{ background: "hsl(var(--sky) / 0.1)", border: "1.5px dashed hsl(var(--sky) / 0.35)" }}>
                <p className="text-[7px] font-bold" style={{ color: "hsl(var(--sky))" }}>✦ Fun Fact</p>
                <p className="text-[7px] text-muted-foreground">Australian authors like Morris Gleitzman use sensory detail to bring the bush to life!</p>
              </div>
              {/* Dots */}
              <div className="flex justify-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted" />
                <div className="w-1.5 h-1.5 rounded-full bg-muted" />
              </div>
              <p className="text-[8px] font-bold text-foreground">1. The Hook</p>
              <p className="text-[7px] text-muted-foreground leading-tight">
                A strong opening grabs the reader's attention immediately. Think about starting with action, a question, or an unusual image.
              </p>
            </div>
          </SceneWrapper>

          {/* Scene 3 — Challenge question */}
          <SceneWrapper active={activeScene === 3}>
            <div
              className="px-3 pt-5 pb-3 relative"
              style={{ background: "linear-gradient(135deg, hsl(var(--ochre-dark)), hsl(var(--ochre)), hsl(var(--ochre-light)))" }}
            >
              <div className="flex items-center gap-2">
                <img src={dingoLogo} alt="" className="w-6 h-6 rounded-full" />
                <div>
                  <p className="text-[9px] font-bold text-primary-foreground">English — Creative Writing</p>
                  <p className="text-[7px] text-primary-foreground/70">Challenge</p>
                </div>
              </div>
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[8px] font-bold px-2 py-0.5 rounded-full">
                +50 XP
              </div>
            </div>
            <div className="px-3 pt-3">
              <div className="rounded-2xl border border-primary/25 bg-card p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[8px] font-bold text-muted-foreground">Question 3 of 3</p>
                  <span className="text-[7px] font-bold text-primary">+50 XP</span>
                </div>
                <p className="text-[9px] font-bold text-foreground leading-tight">
                  Write a short story opening set in the Australian bush. Use at least two senses.
                </p>
                <div className="rounded-lg p-2" style={{ background: "hsl(var(--sky) / 0.1)" }}>
                  <p className="text-[7px] text-muted-foreground">📝 Marked on: setting, sensory detail, hook</p>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button className="flex-1 rounded-lg py-2 text-[8px] font-semibold bg-muted text-muted-foreground">
                    ✏️ Type answer
                  </button>
                  <button className="flex-1 rounded-lg py-2 text-[8px] font-bold bg-primary text-primary-foreground">
                    📷 Upload photo
                  </button>
                </div>
              </div>
            </div>
          </SceneWrapper>

          {/* Scene 4 — Camera */}
          <SceneWrapper active={activeScene === 4}>
            <div className="absolute inset-0 flex flex-col" style={{ background: "linear-gradient(160deg, #9b845e, #b5986a 50%, #8a7350)" }}>
              {/* Viewfinder label */}
              <p className="text-[8px] text-white/75 text-center mt-6 mb-2">Align your handwritten work</p>
              {/* Paper with viewfinder */}
              <div className="flex-1 flex items-center justify-center px-6 relative">
                {/* Corner brackets */}
                <CornerBrackets />
                {/* Focus rect */}
                <FocusRect active={activeScene === 4} />
                {/* Paper */}
                <div
                  className="bg-white rounded-lg p-4 w-full shadow-elevated"
                  style={{ transform: "rotate(-2deg)" }}
                >
                  <p className="text-[8px] font-bold text-foreground mb-2">Creative Writing — My Story</p>
                  <svg viewBox="0 0 180 60" className="w-full">
                    <path d="M5,8 C25,4 45,12 65,8 C85,4 105,11 125,7 C145,3 160,10 175,6" fill="none" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M5,20 C30,16 50,24 75,19 C100,14 120,22 145,18 C160,15 170,21 175,17" fill="none" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M5,32 C20,28 40,36 60,31 C80,26 100,34 130,30 C150,27 165,33 175,29" fill="none" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M5,44 C25,40 50,48 75,43 C95,39 115,46 140,42 C155,39 165,44 175,41" fill="none" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M5,56 C20,52 40,58 60,54 C75,51 85,55 95,53" fill="none" stroke="#aaa" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              {/* Camera bar */}
              <div className="pb-6 pt-3 flex items-center justify-center gap-8" style={{ background: "rgba(0,0,0,0.4)" }}>
                <span className="text-white/60 text-sm">⊠</span>
                {/* Shutter */}
                <div className="w-12 h-12 rounded-full border-[3px] border-white flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-white" />
                </div>
                <span className="text-white/60 text-sm">↻</span>
              </div>
              {/* Flash overlay */}
              <CameraFlash active={activeScene === 4} />
            </div>
          </SceneWrapper>

          {/* Scene 5 — Feedback */}
          <SceneWrapper active={activeScene === 5}>
            <div
              className="px-3 pt-5 pb-3 relative"
              style={{ background: "linear-gradient(135deg, hsl(var(--ochre-dark)), hsl(var(--ochre)), hsl(var(--ochre-light)))" }}
            >
              <div className="flex items-center gap-2">
                <img src={dingoLogo} alt="" className="w-6 h-6 rounded-full" />
                <div>
                  <p className="text-[9px] font-bold text-primary-foreground">Mirri's Feedback</p>
                  <p className="text-[7px] text-primary-foreground/70">Creative Writing</p>
                </div>
              </div>
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[8px] font-bold px-2 py-0.5 rounded-full">
                +80 XP
              </div>
            </div>
            <div className="px-3 pt-3 space-y-2">
              {/* Stars */}
              <div className="text-center">
                <div className="flex justify-center gap-0.5">
                  {[1, 2, 3, 4].map(i => (
                    <span key={i} className="text-sm" style={{ color: "hsl(var(--ochre))" }}>★</span>
                  ))}
                  <span className="text-sm text-muted-foreground">★</span>
                </div>
                <p className="text-[9px] font-bold text-foreground mt-1">Excellent work!</p>
              </div>
              {/* Feedback rows */}
              <div className="bg-card rounded-xl p-2.5 space-y-2 border border-border/40">
                {[
                  { color: "hsl(var(--eucalyptus))", text: "Vivid Australian setting — the garden felt real and atmospheric." },
                  { color: "hsl(var(--eucalyptus))", text: "Strong use of 'show, don't tell' throughout the piece." },
                  { color: "hsl(var(--ochre-light))", text: "Try expanding your middle section with more sensory detail." },
                ].map((row, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ background: row.color }} />
                    <p className="text-[7px] text-foreground leading-tight">{row.text}</p>
                  </div>
                ))}
              </div>
              {/* XP bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[7px] text-muted-foreground">
                  <span>1,906 → 1,986 XP</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <XPBar active={activeScene === 5} />
                </div>
              </div>
              {/* Claim button */}
              <button
                className="w-full rounded-xl py-2 text-[9px] font-bold text-primary-foreground"
                style={{ background: "linear-gradient(135deg, hsl(var(--ochre)), hsl(var(--ochre-light)))" }}
              >
                Claim +80 XP →
              </button>
            </div>
          </SceneWrapper>

          {/* Scene 6 — Rank up */}
          <SceneWrapper active={activeScene === 6}>
            <div
              className="px-3 pt-5 pb-3"
              style={{ background: "linear-gradient(135deg, hsl(var(--eucalyptus-dark)), hsl(var(--eucalyptus)), hsl(var(--eucalyptus-light)))" }}
            >
              <div className="flex items-center gap-2">
                <img src={dingoLogo} alt="" className="w-6 h-6 rounded-full" />
                <div>
                  <p className="text-[9px] font-bold text-primary-foreground">Rank up!</p>
                  <p className="text-[7px] text-primary-foreground/70">New belt unlocked 🎉</p>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-4" style={{ paddingTop: 40 }}>
              <RankUpBadge active={activeScene === 6} />
              <p className="text-[12px] font-display font-bold text-foreground mt-3">Green Belt</p>
              <p className="text-[8px] text-muted-foreground mb-3">You've levelled up!</p>
              <XPCounter active={activeScene === 6} />
              {/* Progress bar */}
              <div className="w-full mt-3 space-y-1">
                <div className="flex justify-between text-[7px] text-muted-foreground">
                  <span>Green Belt</span>
                  <span>Blue Belt</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <RankBar active={activeScene === 6} />
                </div>
              </div>
              {/* Celebration emojis */}
              <CelebrationEmojis active={activeScene === 6} />
            </div>
          </SceneWrapper>

          {/* Tap ripple */}
          {ripple && (
            <div
              key={rippleKey}
              className="absolute w-8 h-8 rounded-full pointer-events-none z-30"
              style={{
                left: `${ripple.x}%`,
                top: `${ripple.y}%`,
                transform: "translate(-50%, -50%)",
                background: "hsl(var(--ochre) / 0.35)",
                animation: "tap-ripple 600ms ease-out forwards",
              }}
            />
          )}

          {/* Scene dots */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20">
            {SCENE_DURATIONS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: activeScene === i ? 6 : 4,
                  height: activeScene === i ? 6 : 4,
                  background: activeScene === i ? "hsl(var(--ochre))" : "hsl(var(--muted-foreground) / 0.3)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Ripple label */}
      {ripple && (
        <div
          key={`label-${rippleKey}`}
          className="absolute -bottom-6 left-0 right-0 text-center text-xs text-muted-foreground"
          style={{ animation: "fade-label 1.2s ease-out forwards" }}
        >
          {ripple.label}
        </div>
      )}

      <style>{`
        @keyframes tap-ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.7; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        @keyframes fade-label {
          0%, 70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes camera-flash {
          0% { opacity: 0; }
          30% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes rank-spring {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
        @keyframes float-emoji {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-60px) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function SceneWrapper({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex flex-col transition-opacity duration-[400ms] ease-in-out"
      style={{ opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none" }}
    >
      {children}
    </div>
  );
}

function CornerBrackets() {
  const style = "absolute w-5 h-5 border-white/70";
  return (
    <>
      <div className={`${style} top-0 left-4 border-t-2 border-l-2`} />
      <div className={`${style} top-0 right-4 border-t-2 border-r-2`} />
      <div className={`${style} bottom-0 left-4 border-b-2 border-l-2`} />
      <div className={`${style} bottom-0 right-4 border-b-2 border-r-2`} />
    </>
  );
}

function FocusRect({ active }: { active: boolean }) {
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    if (!active) { setCaptured(false); return; }
    const t = setTimeout(() => setCaptured(true), 2500);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div
      className="absolute inset-6 rounded-lg transition-colors duration-300 pointer-events-none z-10"
      style={{
        border: `2px solid ${captured ? "hsl(var(--eucalyptus))" : "hsl(var(--ochre))"}`,
      }}
    />
  );
}

function CameraFlash({ active }: { active: boolean }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!active) { setFlash(false); return; }
    const t = setTimeout(() => setFlash(true), 2600);
    return () => clearTimeout(t);
  }, [active]);

  if (!flash) return null;
  return (
    <div
      className="absolute inset-0 bg-white pointer-events-none z-20"
      style={{ animation: "camera-flash 250ms ease-out forwards" }}
    />
  );
}

function XPBar({ active }: { active: boolean }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!active) { setWidth(0); return; }
    const t = setTimeout(() => setWidth(79), 50);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div
      className="h-full rounded-full"
      style={{
        width: `${width}%`,
        background: "linear-gradient(90deg, hsl(var(--ochre)), hsl(var(--ochre-light)))",
        transition: "width 1.3s ease-out",
      }}
    />
  );
}

function RankUpBadge({ active }: { active: boolean }) {
  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
      style={{
        background: "linear-gradient(135deg, hsl(var(--eucalyptus)), hsl(var(--eucalyptus-light)))",
        animation: active ? "rank-spring 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" : "none",
        transform: active ? undefined : "scale(0)",
      }}
    >
      🥋
    </div>
  );
}

function XPCounter({ active }: { active: boolean }) {
  const [xp, setXp] = useState(1906);

  useEffect(() => {
    if (!active) { setXp(1906); return; }
    let current = 1906;
    const target = 1986;
    const interval = setInterval(() => {
      current += 1;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      setXp(current);
    }, 22);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <p className="text-[11px] font-bold text-muted-foreground">
      <span className="text-lg font-display text-foreground">{xp.toLocaleString()}</span> XP
    </p>
  );
}

function RankBar({ active }: { active: boolean }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!active) { setWidth(0); return; }
    const t = setTimeout(() => setWidth(79), 300);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div
      className="h-full rounded-full"
      style={{
        width: `${width}%`,
        background: "linear-gradient(90deg, hsl(var(--eucalyptus)), hsl(var(--eucalyptus-light)))",
        transition: "width 1.3s ease-out",
      }}
    />
  );
}

function CelebrationEmojis({ active }: { active: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) { setShow(false); return; }
    const t = setTimeout(() => setShow(true), 400);
    return () => clearTimeout(t);
  }, [active]);

  if (!show) return null;

  const emojis = ["🎉", "⭐", "🔥", "✨", "🏆"];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {emojis.map((e, i) => (
        <span
          key={i}
          className="absolute text-lg"
          style={{
            left: `${15 + i * 16}%`,
            bottom: "30%",
            animation: `float-emoji 1.5s ease-out ${i * 0.15}s forwards`,
          }}
        >
          {e}
        </span>
      ))}
    </div>
  );
}

export { SCENE_LABELS };
