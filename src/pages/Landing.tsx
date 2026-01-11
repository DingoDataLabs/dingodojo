import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Zap, Target, Clock, Star, Shield, ArrowRight, Compass, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const handleEnterDojo = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ochre/5 via-transparent to-eucalyptus/5" />
        <div className="max-w-6xl mx-auto px-4 py-6">
          <nav className="flex items-center justify-between mb-16 relative z-10">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🦊</span>
              <span className="text-2xl font-display font-bold text-foreground">Dingo Dojo</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Button onClick={handleEnterDojo} className="rounded-xl font-semibold">
                  Enter Your Dojo
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate("/auth")} className="rounded-xl font-semibold">
                    Log in
                  </Button>
                  <Button onClick={() => navigate("/auth")} className="rounded-xl font-semibold">
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </nav>

          <div className="grid lg:grid-cols-2 gap-12 items-center py-12 lg:py-20">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 bg-eucalyptus/10 text-eucalyptus px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Star className="w-4 h-4" />
                High School Ready in 10 Minutes a Day
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight mb-6">
                No Fuss Learning for
                <span className="gradient-text-ochre block">Aussie Kids</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Quick daily missions. Real curriculum. No monkey business. 
                Help your child prepare for high school with focused, 10-minute learning sessions.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="rounded-xl font-bold text-lg h-14 px-8 gap-2 hover:scale-105 transition-transform"
                >
                  Start Free <ArrowRight className="w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate("/demo")}
                  className="rounded-xl font-bold text-lg h-14 px-8 gap-2"
                >
                  <Compass className="w-5 h-5" />
                  Try Demo
                </Button>
              </div>
            </div>
            
            <div className="relative animate-slide-up stagger-2">
              <div className="relative bg-gradient-to-br from-card to-muted rounded-3xl p-8 shadow-elevated">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-background rounded-2xl shadow-soft">
                    <div className="w-12 h-12 rounded-xl bg-eucalyptus/20 flex items-center justify-center text-2xl">📐</div>
                    <div>
                      <p className="font-semibold text-foreground">Maths Mission Complete!</p>
                      <p className="text-sm text-muted-foreground">+25 XP earned</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background rounded-2xl shadow-soft">
                    <div className="w-12 h-12 rounded-xl bg-sky/20 flex items-center justify-center text-2xl">🔬</div>
                    <div>
                      <p className="font-semibold text-foreground">Science Level Up!</p>
                      <p className="text-sm text-muted-foreground">Now at Developing level</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-background rounded-2xl shadow-soft">
                    <div className="w-12 h-12 rounded-xl bg-ochre/20 flex items-center justify-center text-2xl">🔥</div>
                    <div>
                      <p className="font-semibold text-foreground">3 Week Streak!</p>
                      <p className="text-sm text-muted-foreground">Keep it going!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Trust Indicators */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-eucalyptus" />
              <span className="font-medium">NSW Curriculum Aligned</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-ochre" />
              <span className="font-medium">Years 5-6 Focused</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky" />
              <span className="font-medium">10 Min Daily Sessions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Learning That Actually Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No flashy distractions. No endless scrolling. Just focused practice that builds real skills.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bento-card bg-card p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-ochre/10 flex items-center justify-center text-4xl mx-auto mb-6">
                <Target className="w-8 h-8 text-ochre" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-3">Focused Missions</h3>
              <p className="text-muted-foreground">
                Short, targeted lessons that respect your child's time. Complete a mission in 10 minutes or less.
              </p>
            </div>

            <div className="bento-card bg-card p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-eucalyptus/10 flex items-center justify-center text-4xl mx-auto mb-6">
                <Zap className="w-8 h-8 text-eucalyptus" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-3">AI-Powered Help</h3>
              <p className="text-muted-foreground">
                Mirri the Dingo guides your child through tricky problems with hints, not answers.
              </p>
            </div>

            <div className="bento-card bg-card p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-sky/10 flex items-center justify-center text-4xl mx-auto mb-6">
                <Shield className="w-8 h-8 text-sky" />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-3">Real Curriculum</h3>
              <p className="text-muted-foreground">
                Content aligned to NSW Stage 3 curriculum. Prepare for high school with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subjects Preview */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Five Core Subjects
            </h2>
            <p className="text-xl text-muted-foreground">
              Comprehensive coverage for high school readiness
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { emoji: "🔢", name: "Maths", color: "sky" },
              { emoji: "📝", name: "English", color: "eucalyptus" },
              { emoji: "🔬", name: "Science", color: "sky" },
              { emoji: "🌏", name: "Geography", color: "eucalyptus" },
              { emoji: "🏛️", name: "History", color: "ochre" },
            ].map((subject) => (
              <div 
                key={subject.name}
                className="bento-card bg-card p-6 text-center hover:border-primary/30 border-2 border-transparent transition-all"
              >
                <span className="text-4xl block mb-3">{subject.emoji}</span>
                <p className="font-display font-bold text-foreground">{subject.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Simple, Fair Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free. Upgrade when you're ready.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Explorer - Free */}
            <div className="bento-card bg-card p-8 border-2 border-border">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Compass className="w-6 h-6 text-sky" />
                  <h3 className="text-2xl font-display font-bold text-foreground">Explorer</h3>
                </div>
                <p className="text-muted-foreground">Perfect for getting started</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-display font-bold text-foreground">Free</span>
                <span className="text-muted-foreground ml-2">forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-foreground">
                  <Check className="w-5 h-5 text-eucalyptus" />
                  2 missions per day
                </li>
                <li className="flex items-center gap-3 text-foreground">
                  <Check className="w-5 h-5 text-eucalyptus" />
                  English & Maths
                </li>
                <li className="flex items-center gap-3 text-foreground">
                  <Check className="w-5 h-5 text-eucalyptus" />
                  AI tutor help
                </li>
                <li className="flex items-center gap-3 text-foreground">
                  <Check className="w-5 h-5 text-eucalyptus" />
                  Daily & weekly streaks
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl font-semibold"
                onClick={handleGetStarted}
              >
                Get Started Free
              </Button>
            </div>

            {/* Champion - Pro */}
            <div className="bento-card bg-gradient-to-br from-ochre/5 to-ochre/10 p-8 border-2 border-ochre/30 relative">
              <div className="absolute -top-3 right-6">
                <span className="bg-ochre text-primary-foreground px-4 py-1 rounded-full text-sm font-bold">
                  Most Popular
                </span>
              </div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-6 h-6 text-ochre" />
                  <h3 className="text-2xl font-display font-bold text-foreground">Champion</h3>
                </div>
                <p className="text-muted-foreground">Unlimited learning power</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-display font-bold text-foreground">$5</span>
                <span className="text-muted-foreground ml-2">AUD / month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-3 text-foreground">
                  <Check className="w-5 h-5 text-eucalyptus" />
                  <strong>Unlimited</strong> missions
                </li>
                <li className="flex items-center gap-3 text-foreground">
                  <Check className="w-5 h-5 text-eucalyptus" />
                  All 5 subjects unlocked
                </li>
                <li className="flex items-center gap-3 text-foreground">
                  <Check className="w-5 h-5 text-eucalyptus" />
                  AI tutor help
                </li>
                <li className="flex items-center gap-3 text-foreground">
                  <Check className="w-5 h-5 text-eucalyptus" />
                  Exclusive badges & rewards
                </li>
                <li className="flex items-center gap-3 text-foreground">
                  <Check className="w-5 h-5 text-eucalyptus" />
                  Priority support
                </li>
              </ul>
              <Button 
                className="w-full h-12 rounded-xl font-semibold"
                onClick={handleGetStarted}
              >
                Start Champion Trial
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Use code <span className="font-bold text-ochre">3MFREE</span> for 3 months free!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-ochre/10 via-transparent to-eucalyptus/10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <span className="text-6xl">🦊</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            Ready to Start the Adventure?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of Aussie families getting high school ready, one mission at a time.
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
      <footer className="py-12 px-4 border-t border-border">
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