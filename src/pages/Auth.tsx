import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("Invalid email or password. Please try again!");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome back, ninja! 🥷");
          navigate("/");
        }
      } else {
        if (!firstName.trim()) {
          toast.error("Please enter your name!");
          setLoading(false);
          return;
        }
        
        const { error } = await signUp(email, password, firstName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Try logging in!");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome to Dingo Dojo! 🦊");
          navigate("/");
        }
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="text-7xl mb-4 animate-float">🦊</div>
          <h1 className="text-4xl font-display font-bold gradient-text-ochre mb-2">
            Dingo Dojo
          </h1>
          <p className="text-muted-foreground text-lg">
            {isLogin ? "Welcome back, ninja!" : "Join the training!"}
          </p>
        </div>

        {/* Auth Form */}
        <div className="bento-card bg-card p-8 animate-slide-up stagger-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-base font-semibold">
                  Your Name
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="What should we call you?"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-12 text-lg rounded-xl"
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-semibold">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-lg rounded-xl"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-semibold">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-lg rounded-xl"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary/90 transition-all duration-200 hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <span className="animate-pulse">Loading...</span>
              ) : isLogin ? (
                "Enter the Dojo 🥋"
              ) : (
                "Start Training 🎯"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-muted-foreground hover:text-primary transition-colors text-base"
            >
              {isLogin ? (
                <>
                  New here? <span className="font-semibold text-primary">Sign up!</span>
                </>
              ) : (
                <>
                  Already training? <span className="font-semibold text-primary">Log in!</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Fun footer */}
        <p className="text-center text-muted-foreground mt-6 text-sm animate-slide-up stagger-3">
          🇦🇺 Made for awesome Aussie learners!
        </p>
      </div>
    </div>
  );
}
