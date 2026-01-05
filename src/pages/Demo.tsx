import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Flame, Trophy, Zap, Compass } from "lucide-react";
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
  { id: "1", name: "Maths", slug: "maths", emoji: "🔢", color: "sky" },
  { id: "2", name: "English", slug: "english", emoji: "📝", color: "eucalyptus" },
  { id: "3", name: "Science & Technology", slug: "science-technology", emoji: "🔬", color: "sky" },
  { id: "4", name: "Geography", slug: "geography", emoji: "🌏", color: "eucalyptus" },
  { id: "5", name: "History", slug: "history", emoji: "🏛️", color: "ochre" },
];

const demoSubjectXps: Record<string, number> = {
  "1": 245,
  "2": 180,
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

export default function Demo() {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showSignupDialog, setShowSignupDialog] = useState(false);

  const getSubjectCardClass = (color: string) => {
    switch (color) {
      case "eucalyptus":
        return "subject-card-eucalyptus";
      case "sky":
        return "subject-card-sky";
      default:
        return "subject-card-ochre";
    }
  };

  const getHeaderGradient = (color: string) => {
    switch (color) {
      case "eucalyptus":
        return "from-eucalyptus to-eucalyptus-light";
      case "sky":
        return "from-sky to-sky-light";
      default:
        return "from-ochre to-ochre-light";
    }
  };

  const handleTopicClick = () => {
    setShowSignupDialog(true);
  };

  const currentSubject = selectedSubject 
    ? demoSubjects.find(s => s.slug === selectedSubject)
    : null;

  const currentTopics = selectedSubject 
    ? demoTopics[selectedSubject as keyof typeof demoTopics] || []
    : [];

  if (selectedSubject && currentSubject) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header
          className={`bg-gradient-to-r ${getHeaderGradient(currentSubject.color)} text-primary-foreground p-6 pb-12 animate-slide-up`}
        >
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => setSelectedSubject(null)}
              className="mb-4 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 -ml-2"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Demo Dojo
            </Button>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-6xl">{currentSubject.emoji}</span>
                <div>
                  <h1 className="text-3xl md:text-4xl font-display font-bold">
                    {currentSubject.name}
                  </h1>
                  <p className="opacity-80 text-lg">
                    {currentTopics.length} topics to master
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-primary-foreground/10 rounded-2xl px-4 py-2">
                <Trophy className="w-5 h-5" />
                <span className="font-display font-bold text-xl">
                  {demoSubjectXps[currentSubject.id]?.toLocaleString() || 0} XP
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Topics List */}
        <main className="max-w-4xl mx-auto p-4 md:p-6 -mt-6">
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

        {/* Signup Dialog */}
        <Dialog open={showSignupDialog} onOpenChange={setShowSignupDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="text-5xl text-center mb-4 animate-float">🦊</div>
              <DialogTitle className="text-center text-2xl font-display">
                Ready to Start Training?
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                Sign up for free to unlock your first 5 missions per week and start your learning journey!
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button 
                onClick={() => navigate("/auth")} 
                className="rounded-xl h-12 font-semibold"
              >
                Sign Up Free 🚀
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSignupDialog(false)}
                className="rounded-xl"
              >
                Keep Exploring
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="text-5xl animate-float">🦊</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                Welcome to the Demo Dojo!
              </h1>
              <p className="text-muted-foreground">Explore how Dingo Dojo works</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="rounded-xl gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
        </header>

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
            <Button 
              onClick={() => navigate("/auth")} 
              className="rounded-xl gap-2"
            >
              Sign Up Free
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Training Streak */}
          <div className="stats-card flex items-center gap-4 animate-slide-up stagger-1">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Flame className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Training Streak</p>
              <p className="text-3xl font-display font-bold text-foreground">
                3<span className="text-lg ml-1">weeks</span>
              </p>
            </div>
          </div>

          {/* Missions This Week */}
          <div className="stats-card flex items-center gap-4 animate-slide-up stagger-2">
            <ProgressRing
              progress={60}
              size={56}
              strokeWidth={5}
              colorClass="stroke-ochre"
            >
              <Zap className="w-5 h-5 text-ochre" />
            </ProgressRing>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Missions This Week</p>
              <p className="text-2xl font-display font-bold text-foreground">3/5</p>
              <p className="text-xs font-medium text-ochre">2 more to secure streak!</p>
            </div>
          </div>

          {/* Total XP */}
          <div className="stats-card flex items-center gap-4 animate-slide-up stagger-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium">Total XP</p>
              <p className="text-3xl font-display font-bold text-foreground">
                870<span className="text-lg ml-1">XP</span>
              </p>
            </div>
          </div>
        </div>

        {/* Subject Cards */}
        <section className="animate-slide-up stagger-4">
          <h2 className="text-xl font-display font-bold mb-4 text-foreground">
            Choose Your Training 🎯
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {demoSubjects.map((subject, index) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject.slug)}
                className={`bento-card ${getSubjectCardClass(subject.color)} text-left p-8 min-h-[180px] flex flex-col justify-between transition-all active:scale-[0.98]`}
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                <div>
                  <span className="text-5xl mb-4 block">{subject.emoji}</span>
                  <h3 className="text-3xl font-display font-bold mb-2">{subject.name}</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 opacity-80">
                    <span className="text-sm font-medium">Start training</span>
                    <span className="text-lg">→</span>
                  </div>
                  {demoSubjectXps[subject.id] > 0 && (
                    <span className="bg-primary-foreground/20 rounded-full px-3 py-1 text-sm font-medium">
                      {demoSubjectXps[subject.id].toLocaleString()} XP
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Signup Dialog */}
        <Dialog open={showSignupDialog} onOpenChange={setShowSignupDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="text-5xl text-center mb-4 animate-float">🦊</div>
              <DialogTitle className="text-center text-2xl font-display">
                Ready to Start Training?
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                Sign up for free to unlock your first 5 missions per week and start your learning journey!
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              <Button 
                onClick={() => navigate("/auth")} 
                className="rounded-xl h-12 font-semibold"
              >
                Sign Up Free 🚀
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSignupDialog(false)}
                className="rounded-xl"
              >
                Keep Exploring
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}