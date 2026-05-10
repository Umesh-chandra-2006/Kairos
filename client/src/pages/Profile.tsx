import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useApi } from "@/hooks/useApi";
import { clearToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, LogOut, ShieldCheck, Zap, Target, BookOpen, Trophy } from "lucide-react";
import { TabLayout } from "@/components/TabLayout";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Profile() {
  const { user } = useCurrentUser();
  const api = useApi();
  const [streak, setStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalAnswered: 0,
    averageScore: 0,
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [streakData, historyData] = await Promise.all([
        api.getStreak(),
        api.getHistory(),
      ]);

      setStreak(streakData);

      const answers = historyData.answers || [];
      const totalAnswered = answers.length;
      const averageScore =
        totalAnswered > 0
          ? Math.round(
              answers.reduce((sum: number, a: any) => sum + a.score, 0) / totalAnswered
            )
          : 0;

      setStats({ totalAnswered, averageScore });
    } catch (err: any) {
      setError(err.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUseFreeze = async () => {
    try {
      await api.useFreeze();
      loadProfileData();
    } catch (err: any) {
      setError(err.message || "Failed to use freeze");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <TabLayout currentTab="profile">
      <div className="max-w-3xl mx-auto space-y-8 p-4 md:p-8">
        {/* User Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="premium-card relative overflow-hidden flex flex-col md:flex-row items-center gap-6"
        >
          <div className="w-24 h-24 bg-grad-primary rounded-3xl flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-primary/20">
            {user?.name?.[0]}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-extrabold tracking-tight">{user?.name}</h2>
            <p className="text-muted-foreground font-medium">{user?.email}</p>
          </div>
          <div className="flex gap-2">
             <span className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold uppercase tracking-wider">
              {user?.role || "Member"}
            </span>
          </div>
        </motion.div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Current Streak", value: streak?.current || 0, icon: Zap, color: "text-orange-500", bg: "bg-orange-500/10" },
            { label: "Longest Streak", value: streak?.longest || 0, icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
            { label: "Total Answered", value: stats.totalAnswered, icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
            { label: "Average Score", value: `${stats.averageScore}/10`, icon: Target, color: "text-green-500", bg: "bg-green-500/10" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="premium-card text-center space-y-2 p-4"
            >
              <div className={cn("w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2", stat.bg)}>
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Streak Freeze Section */}
        {streak && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "premium-card relative overflow-hidden group",
              streak.freezesRemaining > 0 ? "bg-blue-500/5" : "opacity-75"
            )}
          >
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <ShieldCheck className="w-32 h-32 text-blue-500" />
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Streak Freeze</h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    {streak.freezesRemaining > 0 
                      ? `${streak.freezesRemaining} Freeze Available` 
                      : "No Freezes Remaining"}
                  </p>
                </div>
              </div>
              
              <p className="text-muted-foreground leading-relaxed">
                Freezes protect your streak if you miss a day. They refill automatically every Monday.
              </p>

              {streak.freezesRemaining > 0 && (
                <Button
                  onClick={handleUseFreeze}
                  className="w-full md:w-auto px-8 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20"
                >
                  Activate Freeze
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Account Actions */}
        <div className="pt-4 space-y-4">
          <Button
            onClick={() => { clearToken(); window.location.href = "/"; }}
            variant="ghost"
            className="w-full h-14 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive font-bold border-2 border-transparent hover:border-destructive/20 transition-all"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out of Kairos
          </Button>
        </div>
      </div>
    </TabLayout>
  );
}
