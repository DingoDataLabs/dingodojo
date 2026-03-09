import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import dingoLogo from "@/assets/dingo-logo.png";
import { Check, Target, Clock, Star, Shield, ArrowRight, Compass, Crown, Zap, BookOpen, PenTool } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => navigate(user ? "/dashboard" : "/auth");
  const handleEnterDojo = () => navigate(user ? "/dashboard" : "/auth");

  return (
    <div className="min-h-screen bg-background">
      {/* Wavy Header - matches Dashboard */}
      <div className="relative" style={{ background: "linear-gradient(135deg, hsl(var(--ochre-dark)) 0%, hsl(var(--ochre)) 50%, hsl(var(--ochre-light)) 100%)" }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-6 pb-20 md:pb-24">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-12 md:mb-16 relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-4xl md:text-5xl animate-float">🦊</span>
              <span className="text-2xl md:text-3xl font-display font-bold text-primary-foreground drop-shadow-sm">Dingo Dojo</span>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <Button onClick={handleEnterDojo} className="rounded-xl font-semibold bg-white/20 hover:bg-white/30 text-primary-foreground border-0 backdrop-blur-sm">
                  Enter Your Dojo
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate("/auth")} className="rounded-xl font-semibold text-primary-foreground hover:bg-white/20">
                    Log in
                  </Button>
                  <Button onClick={() => navigate("/auth")} className="rounded-xl font-semibold bg-white/20 hover:bg-white/30 text-primary-foreground border-0 backdrop-blur-sm">
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </nav>

          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Star className="w-4 h-4" />
                High School Ready in 10 Minutes a Day
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-primary-foreground leading-tight mb-6 drop-shadow-sm">
                No Fuss Learning for
                <span className="block text-white/90">Aussie Kids</span>
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 leading-relaxed">
                Quick daily missions. Real curriculum. No monkey business. 
                Help your child prepare for high school with focused, 10-minute learning sessions.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="rounded-xl font-bold text-lg h-14 px-8 gap-2 bg-background text-foreground hover:bg-background/90 hover:scale-105 transition-transform"
                >
                  Start Free <ArrowRight className="w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  onClick={() => navigate("/demo")}
                  className="rounded-xl font-bold text-lg h-14 px-8 gap-2 bg-white/20 hover:bg-white/30 text-primary-foreground border-0 backdrop-blur-sm"
                >
                  <Compass className="w-5 h-5" />
                  Try Demo
                </Button>
              </div>
            </div>
            
            {/* Preview cards */}
            <div className="relative animate-slide-up stagger-2 hidden md:block">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-white/15 backdrop-blur-sm rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">📐</div>
                  <div>
                    <p className="font-semibold text-primary-foreground">Maths Mission Complete!</p>
                    <p className="text-sm text-primary-foreground/70">+25 XP earned</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/15 backdrop-blur-sm rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">📖</div>
                  <div>
                    <p className="font-semibold text-primary-foreground">English Level Up!</p>
                    <p className="text-sm text-primary-foreground/70">Now at Developing level</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/15 backdrop-blur-sm rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">🔥</div>
                  <div>
                    <p className="font-semibold text-primary-foreground">3 Week Streak!</p>
                    <p className="text-sm text-primary-foreground/70">Keep it going!</p>
                  </div>
                </div>
              </div>
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

      {/* Trust Indicators */}
      <section className="py-10 max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-secondary" />
            <span className="font-medium">NSW Curriculum Aligned</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="font-medium">Years 5-6 Focused</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            <span className="font-medium">10 Min Daily Sessions</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Learning That Actually Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            No flashy distractions. Just focused practice that builds real skills.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: <Target className="w-7 h-7 text-primary" />, title: "Focused Missions", desc: "Short, targeted lessons that respect your child's time. Complete a mission in 10 minutes or less.", bg: "bg-primary/10" },
            { icon: <Zap className="w-7 h-7 text-secondary" />, title: "AI-Powered Help", desc: "Mirri the Dingo guides your child through tricky problems with hints, not answers.", bg: "bg-secondary/10" },
            { icon: <PenTool className="w-7 h-7 text-accent" />, title: "Handwriting Feedback", desc: "Upload handwritten work and get AI feedback on letter formation, spacing, and content.", bg: "bg-accent/10" },
          ].map((f) => (
            <div key={f.title} className="bento-card p-8 text-center">
              <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center mx-auto mb-5`}>
                {f.icon}
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-3">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects */}
      <section className="py-16 max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Core Subjects
          </h2>
          <p className="text-lg text-muted-foreground">
            English & Maths lead the way, with more subjects for Champion members
          </p>
        </div>

        {/* Priority subjects */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { emoji: "📖", name: "English", gradient: "from-violet-500 to-purple-600", label: "Free" },
            { emoji: "🔢", name: "Maths", gradient: "from-blue-500 to-indigo-600", label: "Free" },
          ].map((s) => (
            <div key={s.name} className={`rounded-3xl bg-gradient-to-br ${s.gradient} p-6 md:p-8 text-center text-white shadow-elevated`}>
              <span className="text-5xl md:text-6xl block mb-3">{s.emoji}</span>
              <p className="font-display font-bold text-xl md:text-2xl">{s.name}</p>
              <span className="inline-block mt-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Secondary subjects */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { emoji: "🔬", name: "Science", gradient: "from-rose-500 to-red-600" },
            { emoji: "🌏", name: "Geography", gradient: "from-emerald-500 to-teal-600" },
            { emoji: "🏛️", name: "History", gradient: "from-amber-600 to-yellow-500" },
          ].map((s) => (
            <div key={s.name} className={`rounded-2xl bg-gradient-to-br ${s.gradient} p-4 md:p-6 text-center text-white shadow-card`}>
              <span className="text-3xl md:text-4xl block mb-2">{s.emoji}</span>
              <p className="font-display font-bold text-sm md:text-base">{s.name}</p>
              <span className="inline-block mt-1 bg-white/20 backdrop-blur-sm text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full">
                <Crown className="w-3 h-3 inline mr-1" />Champion
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 max-w-4xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Simple, Fair Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free. Upgrade when you're ready.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Explorer */}
          <div className="bento-card p-8 border-2 border-border">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Compass className="w-6 h-6 text-accent" />
                <h3 className="text-2xl font-display font-bold text-foreground">Explorer</h3>
              </div>
              <p className="text-muted-foreground">Perfect for getting started</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-display font-bold text-foreground">Free</span>
              <span className="text-muted-foreground ml-2">forever</span>
            </div>
            <ul className="space-y-3 mb-8">
              {["2 missions per day", "English & Maths", "AI tutor help", "Daily & weekly streaks"].map(item => (
                <li key={item} className="flex items-center gap-3 text-foreground">
                  <Check className="w-5 h-5 text-secondary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full h-12 rounded-xl font-semibold" onClick={handleGetStarted}>
              Get Started Free
            </Button>
          </div>

          {/* Champion */}
          <div className="bento-card p-8 border-2 border-primary/30 relative" style={{ background: "linear-gradient(135deg, hsl(var(--ochre) / 0.06), hsl(var(--ochre) / 0.12))" }}>
            <div className="absolute -top-3 right-6">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold">
                Most Popular
              </span>
            </div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-primary" />
                <h3 className="text-2xl font-display font-bold text-foreground">Champion</h3>
              </div>
              <p className="text-muted-foreground">Unlimited learning power</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-display font-bold text-foreground">$5</span>
              <span className="text-muted-foreground ml-2">AUD / month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                { text: "Unlimited missions", bold: true },
                { text: "All 5 subjects unlocked" },
                { text: "AI tutor help" },
                { text: "Exclusive badges & rewards" },
                { text: "Priority support" },
              ].map(item => (
                <li key={item.text} className="flex items-center gap-3 text-foreground">
                  <Check className="w-5 h-5 text-secondary flex-shrink-0" />
                  {item.bold ? <strong>{item.text}</strong> : item.text}
                </li>
              ))}
            </ul>
            <Button className="w-full h-12 rounded-xl font-semibold" onClick={handleGetStarted}>
              Start Champion Trial
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Use code <span className="font-bold text-primary">3MFREE</span> for 3 months free!
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center bento-card p-10 md:p-14" style={{ background: "linear-gradient(135deg, hsl(var(--ochre) / 0.08), hsl(var(--eucalyptus) / 0.08))" }}>
          <span className="text-6xl block mb-4 animate-float">🦊</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Ready to Start the Adventure?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join Aussie families getting high school ready, one mission at a time.
          </p>
          <Button 
            size="lg"
            onClick={handleGetStarted}
            className="rounded-xl font-bold text-lg h-14 px-10 gap-2 hover:scale-105 transition-transform"
          >
            Start Learning Free <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦊</span>
            <span className="font-display font-bold text-foreground">Dingo Dojo</span>
          </div>
          <p className="text-muted-foreground text-sm">
            🇦🇺 Made with ❤️ for Aussie learners
          </p>
        </div>
      </footer>
    </div>
  );
}
