import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Flame, X, Check, UserPlus, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FriendProfile {
  id: string;
  first_name: string | null;
  total_xp: number;
  daily_streak: number;
  grade_level: string | null;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
}

interface ActivityEntry {
  id: string;
  profile_id: string;
  activity_type: string;
  subject_name: string | null;
  topic_name: string | null;
  xp_earned: number;
  badge_name: string | null;
  badge_emoji: string | null;
  created_at: string;
}

interface SearchResult {
  id: string;
  first_name: string | null;
  total_xp: number;
  grade_level: string | null;
}

interface DojoCrewProps {
  profileId: string | null;
  firstName: string | null;
  totalXp: number;
  dailyStreak: number;
}

const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-secondary/20 text-secondary",
  "bg-accent/20 text-accent",
  "bg-destructive/20 text-destructive",
  "bg-ochre/20 text-ochre-dark",
  "bg-sky/20 text-sky-dark",
];

function getAvatarColor(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function AvatarInitial({ name, id }: { name: string | null; id: string }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${getAvatarColor(id)}`}>
      {initial}
    </div>
  );
}

export function DojoCrew({ profileId, firstName, totalXp, dailyStreak }: DojoCrewProps) {
  const [view, setView] = useState<"leaderboard" | "activity">("leaderboard");
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<FriendProfile[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileId) fetchFriendships();
  }, [profileId]);

  useEffect(() => {
    if (view === "activity" && profileId) fetchActivity();
  }, [view, profileId, friendships]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => searchUsers(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchFriendships = async () => {
    try {
      const { data: fships } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);

      if (fships) {
        setFriendships(fships);
        const accepted = fships.filter(f => f.status === "accepted");
        const friendIds = accepted.map(f =>
          f.requester_id === profileId ? f.addressee_id : f.requester_id
        );

        if (friendIds.length > 0) {
          const { data: profiles } = await supabase
            .from("user_profiles")
            .select("id, first_name, total_xp, daily_streak, grade_level")
            .in("id", friendIds);
          if (profiles) setFriendProfiles(profiles as FriendProfile[]);
        } else {
          setFriendProfiles([]);
        }
      }
    } catch (err) {
      console.error("Error fetching friendships:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivity = async () => {
    if (!profileId) return;
    const accepted = friendships.filter(f => f.status === "accepted");
    const friendIds = accepted.map(f =>
      f.requester_id === profileId ? f.addressee_id : f.requester_id
    );
    const allIds = [profileId, ...friendIds];

    const { data } = await supabase
      .from("activity_feed")
      .select("*")
      .in("profile_id", allIds)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setActivities(data as ActivityEntry[]);
  };

  const searchUsers = async (query: string) => {
    setSearching(true);
    try {
      const { data } = await supabase
        .from("user_profiles")
        .select("id, first_name, total_xp, grade_level")
        .ilike("first_name", `%${query}%`)
        .neq("id", profileId)
        .limit(5);

      if (data) {
        // Filter out existing friends/pending
        const existingIds = new Set(
          friendships.flatMap(f => [f.requester_id, f.addressee_id])
        );
        setSearchResults(
          (data as SearchResult[]).filter(u => !existingIds.has(u.id!))
        );
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (addresseeId: string) => {
    const { error } = await supabase.from("friendships").insert({
      requester_id: profileId!,
      addressee_id: addresseeId,
      status: "pending",
    });
    if (error) {
      toast.error("Couldn't send request");
      return;
    }
    toast.success("Friend request sent! 🤝");
    setSearchResults(prev => prev.filter(u => u.id !== addresseeId));
    fetchFriendships();
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    toast.success("Friend added! 🎉");
    fetchFriendships();
  };

  const declineOrRemove = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    fetchFriendships();
  };

  const pendingIncoming = friendships.filter(
    f => f.status === "pending" && f.addressee_id === profileId
  );

  // Leaderboard: me + friends sorted by XP
  const leaderboard: FriendProfile[] = [
    { id: profileId!, first_name: firstName, total_xp: totalXp, daily_streak: dailyStreak, grade_level: null },
    ...friendProfiles,
  ].sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0));

  // Map profile id to name for activity feed
  const profileNames: Record<string, string> = {
    [profileId!]: firstName || "You",
  };
  friendProfiles.forEach(f => {
    if (f.id) profileNames[f.id] = f.first_name || "Friend";
  });

  const formatActivity = (a: ActivityEntry) => {
    if (a.activity_type === "mission_complete") {
      return `completed ${a.topic_name || "a mission"}${a.xp_earned ? ` · +${a.xp_earned} XP` : ""} ${a.subject_name ? "" : "🥋"}`;
    }
    if (a.activity_type === "badge_earned") {
      return `earned ${a.badge_name || "a badge"} ${a.badge_emoji || "🏅"}`;
    }
    return "leveled up! 🎉";
  };

  if (loading) {
    return (
      <div className="bento-card animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">🏆 Dojo Crew</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground animate-pulse">Loading crew...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bento-card animate-slide-up h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2">
          🏆 Dojo Crew
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setView("leaderboard")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              view === "leaderboard"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setView("activity")}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              view === "activity"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Activity
          </button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 scrollbar-thin">
        {view === "leaderboard" ? (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Find a friend by name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm rounded-xl"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  {searchResults.map(user => (
                    <div key={user.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors">
                      <AvatarInitial name={user.first_name} id={user.id!} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.first_name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{user.grade_level} · {(user.total_xp || 0).toLocaleString()} XP</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => sendFriendRequest(user.id!)}
                        className="h-7 px-2 text-xs gap-1"
                      >
                        <UserPlus className="w-3 h-3" /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leaderboard */}
            {leaderboard.length <= 1 && friendProfiles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No crew yet! Search above to add friends 👆
              </p>
            ) : (
              <div className="space-y-1">
                {leaderboard.map((entry, idx) => {
                  const isMe = entry.id === profileId;
                  const friendship = !isMe
                    ? friendships.find(
                        f =>
                          f.status === "accepted" &&
                          (f.requester_id === entry.id || f.addressee_id === entry.id)
                      )
                    : null;

                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-2 p-2 rounded-xl transition-colors group ${
                        isMe ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                        {idx + 1}
                      </span>
                      <AvatarInitial name={entry.first_name} id={entry.id!} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {entry.first_name || "Unknown"} {isMe && <span className="text-muted-foreground">(you)</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-foreground">{(entry.total_xp || 0).toLocaleString()} XP</span>
                        {(entry.daily_streak || 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-destructive">
                            <Flame className="w-3 h-3" />
                            {entry.daily_streak}
                          </span>
                        )}
                      </div>
                      {friendship && (
                        <button
                          onClick={() => declineOrRemove(friendship.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pending incoming */}
            {pendingIncoming.length > 0 && (
              <div className="pt-2 border-t border-border space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1">
                  Pending Requests
                </p>
                {pendingIncoming.map(req => {
                  const requesterProfile = friendProfiles.find(f => f.id === req.requester_id);
                  return (
                    <PendingRequestRow
                      key={req.id}
                      requesterId={req.requester_id}
                      friendshipId={req.id}
                      onAccept={acceptRequest}
                      onDecline={declineOrRemove}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Activity View */
          <div className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No activity yet — complete a mission to get started! 🥋
              </p>
            ) : (
              activities.map(a => (
                <div key={a.id} className="flex items-start gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors">
                  <AvatarInitial name={profileNames[a.profile_id] || "?"} id={a.profile_id} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{profileNames[a.profile_id] || "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{formatActivity(a)}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for pending requests that fetches the requester's name
function PendingRequestRow({
  requesterId,
  friendshipId,
  onAccept,
  onDecline,
}: {
  requesterId: string;
  friendshipId: string;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("user_profiles")
      .select("first_name")
      .eq("id", requesterId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setName((data as any).first_name);
      });
  }, [requesterId]);

  return (
    <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/30">
      <AvatarInitial name={name} id={requesterId} />
      <p className="flex-1 text-sm font-medium truncate">{name || "Loading..."}</p>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAccept(friendshipId)}
          className="h-7 w-7 p-0 text-eucalyptus hover:text-eucalyptus"
        >
          <Check className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDecline(friendshipId)}
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
