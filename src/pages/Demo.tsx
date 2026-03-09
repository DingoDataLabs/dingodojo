import { useState } from "react";
import { useNavigate } from "react-router-dom";
import dingoLogo from "@/assets/dingo-logo.png";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame, Trophy, Zap, Compass, Crown, Star, Play, PenTool } from "lucide-react";
import { ProgressRing } from "@/components/ProgressRing";
import { TopicCard } from "@/components/TopicCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mock data for demo experience
const demoSubjects = [
  { id: "1", name: "English", slug: "english", emoji: "📖", color: "violet" },
  { id: "2", name: "Maths", slug: "maths", emoji: "🔢", color: "blue" },
  { id: "3", name: "Science & Technology", slug: "science-technology", emoji: "🔬", color: "rose" },
  { id: "4", name: "Geography", slug: "geography", emoji: "🌏", color: "emerald" },
  { id: "5", name: "History", slug: "history", emoji: "🏛️", color: "amber" },
];

const prioritySubjects = ["english", "maths"];

const demoSubjectXps: Record<string, number> = {
  "1": 180,
  "2": 245,
  "3": 75,
  "4": 320,
  "5": 50,
};

const demoTopics = {
  maths: [
    { id: "t1", name: "Fractions & Decimals", slug: "fractions", emoji: "🔢", description: null, xp: 125, weeklyXp: 25 },
    { id: "t2", name: "Place Value", slug: "place-value", emoji: "📊", description: null, xp: 75, weeklyXp: 0 },
    { id: "t3", name: "Multiplication", slug: "multiplication", emoji: "✖️", description: null, xp: 45, weeklyXp: 20 },
    { id: "t4", name: "Division", slug: "division", emoji: "➗", description: null, xp: 0, weeklyXp: 0 },
  ],
  english: [
    { id: "t5", name: "Reading Comprehension", slug: "reading", emoji: "📖", description: null, xp: 180, weeklyXp: 0 },
    { id: "t6", name: "Grammar & Punctuation", slug: "grammar", emoji: "✏️", description: null, xp: 0, weeklyXp: 0 },
    { id: "t7", name: "Creative Writing", slug: "writing", emoji: "🖊️", description: null, xp: 0, weeklyXp: 0 },
  ],
  "science-technology": [
    { id: "t8", name: "Living World", slug: "living-world", emoji: "🌿", description: null, xp: 50, weeklyXp: 25 },
    { id: "t9", name: "Physical World", slug: "physical-world", emoji: "⚡", description: null, xp: 25, weeklyXp: 0 },
  ],
  geography: [
    { id: "t10", name: "Australia's Neighbours", slug: "neighbours", emoji: "🗺️", description: null, xp: 320, weeklyXp: 0 },
    { id: "t11", name: "Environments", slug: "environments", emoji: "🏔️", description: null, xp: 0, weeklyXp: 0 },
  ],
  history: [
    { id: "t12", name: "First Australians", slug: "first-australians", emoji: "🪃", description: null, xp: 50, weeklyXp: 25 },
    { id: "t13", name: "Colonial Australia", slug: "colonial", emoji: "⚓", description: null, xp: 0, weeklyXp: 0 },
  ],
};

const getSubjectTheme = (slug: string) => {
  switch (slug) {
    case "english":
      return { gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/30" };
    case "maths":
      return { gradient: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/30" };
    case "geography":
      return { gradient: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/30" };
    case "history":
      return { gradient: "from-amber-600 to-yellow-500", glow: "shadow-amber-600/30" };
    case "science-technology":
      return { gradient: "from-rose-500 to-red-600", glow: "shadow-rose-500/30" };
    default:
      return { gradient: "from-ochre to-ochre-light", glow: "shadow-ochre/30" };
  }
};

export default function Demo() {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showSignupDialog, setShowSignupDialog] = useState(false);

  const handleTopicClick = () => {
    setShowSignupDialog(true);
  };

  const currentSubject = selectedSubject
    ? demoSubjects.find((s) => s.slug === selectedSubject)
    : null;

  const currentTopics = selectedSubject
    ? demoTopics[selectedSubject as keyof typeof demoTopics] || []
    : [];

  // Subject detail view
  if (selectedSubject && currentSubject) {
    const theme = getSubjectTheme(currentSubject.slug);
    return (
      <div className="min-h-screen bg-background">
        {/* Wavy Header */}
        <div className="relative" style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}>
          <div className={`bg-gradient-to-br ${theme.gradient}`}>
            <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 pb-16">
              <Button
                variant="ghost"
                onClick={() => setSelectedSubject(null)}
                className="mb-4 text-white/80 hover:text-white hover:bg-white/10 -ml-2"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Demo Dojo
              </Button>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-6xl">{currentSubject.emoji}</span>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-white drop-shadow-sm">
                      {currentSubject.name}
                    </h1>
                    <p className="text-white/80 text-lg">
                      {currentTopics.length} topics to master
                    </p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2">
                  <Trophy className="w-5 h-5 text-white" />
                  <span className="font-display font-bold text-xl text-white">
                    {demoSubjectXps[currentSubject.id]?.toLocaleString() || 0} XP
                  </span>
                </div>
              </div>
            </div>
            {/* Wavy bottom edge */}
            <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0]">
              <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-[30px] md:h-[44px]">
                <path d="M0,30 C200,55 400,5 600,30 C800,55 1000,5 1200,30 L1200,60 L0,60 Z" className="fill-background" />
              </svg>
            </div>
          </div>
        </div>

        {/* Topics List */}
        <main className="max-w-4xl mx-auto p-4 md:p-6 -mt-2">
          <div className="space-y-3">
            {currentTopics.map((topic, index) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                xpEarned={topic.xp}
                weeklyXp={topic.weeklyXp}
                onClick={handleTopicClick}
                animationDelay={`${0.05 * (index + 1)}s`}
              />
            ))}
          </div>
        </main>

        <SignupDialog open={showSignupDialog} onOpenChange={setShowSignupDialog} navigate={navigate} />
      </div>
    );
  }

  // Main demo dashboard
  return (
    <div className="min-h-screen bg-background">
      {/* Wavy Header — matches real Dashboard */}
      <div className="relative" style={{ background: "linear-gradient(135deg, hsl(var(--ochre-light)) 0%, hsl(var(--ochre)) 50%, hsl(var(--ochre-dark)) 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-4 md:pt-6 lg:pt-8 pb-14">
          <header className="flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-4">
              <img src={dingoLogo} alt="Dingo Dojo" className="w-24 h-24 animate-float" />
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground drop-shadow-sm">
                  G'day, Explorer!
                </h1>
                <p className="text-primary-foreground/75">Year 5 • Demo Dojo</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="rounded-xl gap-2 text-primary-foreground hover:bg-white/20"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </header>
        </div>
        {/* Wavy bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-[0]">
          <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-[30px] md:h-[44px]">
            <path d="M0,30 C200,55 400,5 600,30 C800,55 1000,5 1200,30 L1200,60 L0,60 Z" className="fill-background" />
          </svg>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-8">
        {/* Demo Banner */}
        <div className="mb-6 bento-card bg-gradient-to-r from-sky/10 to-eucalyptus/10 border-2 border-sky/20 animate-slide-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky/20 flex items-center justify-center">
                <Compass className="w-5 h-5 text-sky" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Demo Mode</p>
                <p className="text-sm text-muted-foreground">
                  This is a preview of what your Dojo could look like!
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/auth")} className="rounded-xl gap-2">
              Sign Up Free
            </Button>
          </div>
        </div>

        {/* Stats Row — 4 cards matching Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {/* Weekly Streak */}
          <div className="stats-card flex items-center gap-3 animate-slide-up stagger-1">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Flame className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Weekly Streak</p>
              <p className="text-2xl font-display font-bold text-foreground">
                3 <span className="text-sm font-normal text-muted-foreground">weeks</span>
              </p>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="stats-card animate-slide-up stagger-2">
            <div className="flex items-center gap-2 mb-2">
              <ProgressRing progress={60} size={40} strokeWidth={4} colorClass="stroke-ochre">
                <Zap className="w-3.5 h-3.5 text-ochre" />
              </ProgressRing>
              <div>
                <p className="text-xs text-muted-foreground font-medium">This Week's Progress</p>
                <p className="text-lg font-display font-bold text-foreground">300 / 500 XP</p>
              </div>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted mb-2">
              <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: "60%" }} />
            </div>
            <div className="space-y-0.5 mb-1">
              <p className="text-[10px] text-muted-foreground">📖 English: 120 XP (2 missions)</p>
              <p className="text-[10px] text-muted-foreground">🔢 Maths: 180 XP (3 missions)</p>
            </div>
            <p className="text-xs font-medium text-foreground">2 more missions to hit your goal!</p>
          </div>

          {/* Total XP */}
          <div className="stats-card flex items-center gap-3 animate-slide-up stagger-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total XP</p>
              <p className="text-2xl font-display font-bold text-foreground">870</p>
            </div>
          </div>

          {/* Handwriting */}
          <div className="stats-card flex items-center gap-3 animate-slide-up stagger-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
              <PenTool className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Handwriting</p>
              <p className="text-2xl font-display font-bold text-foreground">
                3.8<span className="text-sm ml-0.5">/5</span>
              </p>
            </div>
          </div>
        </div>

        {/* Start Mission Button */}
        <section className="mb-8 animate-slide-up stagger-5">
          <button
            onClick={handleTopicClick}
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-ochre via-amber-500 to-ochre-light p-1 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="relative flex items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-ochre via-amber-500 to-ochre-light px-6 py-5 md:py-6">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
                  <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xl md:text-2xl font-display font-bold text-white drop-shadow-sm">Start Mission</h3>
                  <p className="text-white/90 text-sm md:text-base font-medium">Try a new topic to build skills</p>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end relative z-10">
                <span className="text-white/80 text-xs font-medium uppercase tracking-wide">Next up</span>
                <span className="text-white font-display font-bold text-lg">Fractions & Decimals</span>
              </div>
              <Zap className="w-6 h-6 text-white/80 animate-pulse relative z-10" />
            </div>
          </button>
        </section>

        {/* Subject Cards */}
        <section className="animate-slide-up stagger-6">
          <h2 className="text-xl font-display font-bold mb-5 text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 text-ochre" />
            Choose Your Training
          </h2>

          {/* Priority Subjects — English & Maths (flip cards) */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {demoSubjects
              .filter((s) => prioritySubjects.includes(s.slug))
              .sort((a, b) => prioritySubjects.indexOf(a.slug) - prioritySubjects.indexOf(b.slug))
              .map((subject, index) => {
                const theme = getSubjectTheme(subject.slug);
                const xp = demoSubjectXps[subject.id] || 0;

                return (
                  <div
                    key={subject.id}
                    className="flip-card h-48 md:h-56 perspective-1000"
                    style={{ animationDelay: `${0.05 * (index + 1)}s` }}
                  >
                    <div
                      onClick={() => setSelectedSubject(subject.slug)}
                      role="button"
                      tabIndex={0}
                      className="flip-card-inner w-full h-full relative transition-transform duration-500 transform-style-3d cursor-pointer group"
                    >
                      <div className={`flip-card-front absolute inset-0 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white flex flex-col items-center justify-center p-5 backface-hidden shadow-lg ${theme.glow}`}>
                        <span className="text-6xl md:text-7xl mb-3 drop-shadow-lg">{subject.emoji}</span>
                        <h3 className="text-lg md:text-xl font-display font-bold text-center leading-tight drop-shadow-sm">{subject.name}</h3>
                        {xp > 0 && (
                          <p className="mt-2 text-sm text-white/80 font-semibold">{xp.toLocaleString()} XP</p>
                        )}
                      </div>
                      <div className="flip-card-back absolute inset-0 rounded-2xl bg-card border-2 border-primary/20 flex flex-col items-center justify-center p-5 backface-hidden rotate-y-180 shadow-lg">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center mb-3 shadow-md`}>
                          <Zap className="w-7 h-7 text-white" />
                        </div>
                        <p className="font-display font-bold text-xl text-foreground">
                          {xp > 0 ? `${xp.toLocaleString()} XP` : "Start Fresh!"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 mb-3">
                          {xp > 0 ? "Keep building your skills" : "Begin your journey"}
                        </p>
                        <span className={`px-5 py-2 rounded-full bg-gradient-to-r ${theme.gradient} text-white text-sm font-bold shadow-md`}>
                          Train →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Other Subjects (smaller flip cards with Champion lock) */}
          <div className="grid grid-cols-3 gap-3">
            {demoSubjects
              .filter((s) => !prioritySubjects.includes(s.slug))
              .map((subject, index) => {
                const theme = getSubjectTheme(subject.slug);
                const locked = true; // All non-priority locked in demo

                return (
                  <div
                    key={subject.id}
                    className="flip-card h-32 md:h-36 perspective-1000"
                    style={{ animationDelay: `${0.05 * (index + 3)}s` }}
                  >
                    <div
                      onClick={handleTopicClick}
                      role="button"
                      tabIndex={0}
                      className="flip-card-inner w-full h-full relative transition-transform duration-500 transform-style-3d cursor-pointer group"
                    >
                      <div className={`flip-card-front absolute inset-0 rounded-2xl bg-gradient-to-br ${theme.gradient} text-white flex flex-col items-center justify-center p-3 backface-hidden shadow-md ${theme.glow} opacity-60`}>
                        <span className="text-4xl md:text-5xl mb-2 drop-shadow-lg">{subject.emoji}</span>
                        <h3 className="text-sm md:text-base font-display font-bold text-center leading-tight drop-shadow-sm">{subject.name}</h3>
                        <div className="absolute top-2 right-2 w-6 h-6 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                          <Crown className="w-3.5 h-3.5 text-yellow-300" />
                        </div>
                      </div>
                      <div className="flip-card-back absolute inset-0 rounded-2xl bg-card border-2 border-muted flex flex-col items-center justify-center p-3 backface-hidden rotate-y-180 shadow-md">
                        <Crown className="w-8 h-8 text-amber-500 mb-1" />
                        <p className="font-display font-bold text-xs text-foreground mb-1">Champion Only</p>
                        <Button
                          onClick={(e) => { e.stopPropagation(); navigate("/auth"); }}
                          size="sm"
                          className="text-xs rounded-lg h-7 px-2"
                        >
                          Sign Up
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>

      <SignupDialog open={showSignupDialog} onOpenChange={setShowSignupDialog} navigate={navigate} />
    </div>
  );
}

function SignupDialog({ open, onOpenChange, navigate }: { open: boolean; onOpenChange: (v: boolean) => void; navigate: (path: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <img src={dingoLogo} alt="Sensei" className="w-20 h-20 animate-float" />
          </div>
          <DialogTitle className="text-center text-2xl font-display">
            Ready to Start Training?
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            Sign up for free to unlock your first 2 missions per day and start your learning journey!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={() => navigate("/auth")} className="rounded-xl h-12 font-semibold">
            Sign Up Free 🚀
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Keep Exploring
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
