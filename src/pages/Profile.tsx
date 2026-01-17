import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, User, Key, RefreshCw, Crown, Trash2 } from "lucide-react";

interface Profile {
  id: string;
  first_name: string | null;
  grade_level: string | null;
  subscription_tier: string;
  total_xp: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [firstName, setFirstName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("Year 5");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    // Use secure view to exclude stripe_customer_id
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
    } else if (data) {
      setProfile(data);
      setFirstName(data.first_name || "");
      setGradeLevel(data.grade_level || "Year 5");
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        grade_level: gradeLevel,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile updated! 🎉");
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const handleResetProgress = async () => {
    if (!profile) return;
    setResetting(true);

    // Delete all student progress
    const { error: progressError } = await supabase
      .from("student_progress")
      .delete()
      .eq("student_id", profile.id);

    // Delete all chat messages
    const { error: chatError } = await supabase
      .from("chat_messages")
      .delete()
      .eq("student_id", profile.id);

    // Reset profile stats
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        total_xp: 0,
        current_streak: 0,
        missions_this_week: 0,
      })
      .eq("id", profile.id);

    if (progressError || chatError || profileError) {
      toast.error("Failed to reset progress");
    } else {
      toast.success("Progress reset! Starting fresh 🌟");
      setProfile(prev => prev ? { ...prev, total_xp: 0 } : null);
    }
    setResetting(false);
  };

  const getTierBadge = (tier: string) => {
    if (tier === "champion") {
      return (
        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-ochre to-ochre-light text-primary-foreground px-3 py-1 rounded-full text-sm font-bold">
          <Crown className="w-4 h-4" />
          Champion
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm font-bold">
        Explorer
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl animate-float mb-4">🦊</div>
          <p className="text-muted-foreground text-lg animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Profile Settings
            </h1>
            <p className="text-muted-foreground">Manage your account</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Info Card */}
          <div className="bento-card bg-card p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground">Profile</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="text-sm text-muted-foreground">Subscription</p>
                  <p className="font-semibold text-foreground">{profile?.subscription_tier === "champion" ? "Champion" : "Explorer"}</p>
                </div>
                {getTierBadge(profile?.subscription_tier || "explorer")}
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                <div>
                  <p className="text-sm text-muted-foreground">Total XP</p>
                  <p className="font-semibold text-foreground">{profile?.total_xp?.toLocaleString() || 0} XP</p>
                </div>
                <span className="text-2xl">🏆</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName" className="font-semibold">Display Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Your name"
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">School Year</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Year 5">Year 5</SelectItem>
                    <SelectItem value="Year 6">Year 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full h-12 rounded-xl font-semibold"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Password Card */}
          <div className="bento-card bg-card p-6 animate-slide-up stagger-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-sky/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-sky" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground">Change Password</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="font-semibold">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-semibold">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 rounded-xl"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
                variant="outline"
                className="w-full h-12 rounded-xl font-semibold"
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>

          {/* Reset Progress Card */}
          <div className="bento-card bg-card p-6 animate-slide-up stagger-2 border-destructive/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-xl font-display font-bold text-foreground">Reset Progress</h2>
            </div>

            <p className="text-muted-foreground mb-4">
              This will delete all your XP, streaks, and learning progress. This action cannot be undone.
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full h-12 rounded-xl font-semibold gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset All Progress
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-display">Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your learning progress, XP, streaks, and chat history. 
                    You'll start from scratch as a new learner.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetProgress}
                    disabled={resetting}
                    className="bg-destructive hover:bg-destructive/90 rounded-xl"
                  >
                    {resetting ? "Resetting..." : "Yes, Reset Everything"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}