import { useState } from "react";
import { useLocation } from "wouter";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2, Rocket, Target, Briefcase, GraduationCap, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const ROLES = [
  { id: "student", label: "Student", icon: GraduationCap },
  { id: "professional", label: "Professional", icon: Briefcase }
];

const LEVELS = ["Beginner", "Intermediate", "Advanced"];
const TOPICS = [
  "DSA", "OS", "DBMS", "Networks", "OOP", "SystemDesign", "Behavioral", 
  "FullStack", "Frontend", "Backend", "HR", "Cloud", "Security", 
  "Testing", "DevOps", "Mobile", "MachineLearning", "Agile", "Product"
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { refetch } = useCurrentUser();
  const api = useApi();
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [notificationTime, setNotificationTime] = useState("09:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleSubmit = async () => {
    if (!role || !level) {
      setError("Please select role and level");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await api.completeOnboarding({
        role: role.toLowerCase(),
        level: level.toLowerCase(),
        targets: selectedTopics,
        notificationTime,
      });
      await refetch();
      setLocation("/");
    } catch (err: any) {
      setError(err.message || "Failed to complete onboarding");
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl w-full"
      >
        <Card className="premium-card p-8 md:p-12 space-y-10 relative overflow-hidden">
          <div className="text-center space-y-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-grad-primary text-white shadow-xl shadow-primary/20 mb-4"
            >
              <Rocket className="w-8 h-8" />
            </motion.div>
            <h1 className="text-4xl font-black tracking-tight text-gradient">Set Your Course</h1>
            <p className="text-muted-foreground font-medium">Personalize your Kairos experience for better results.</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-2xl flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5" />
                <p className="font-semibold">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-10">
            {/* Step 1: Role */}
            <div className="space-y-4">
              <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
                Your Current Role
              </label>
              <div className="grid grid-cols-2 gap-4">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  const isActive = role === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300",
                        isActive
                          ? "border-primary bg-primary/5 shadow-xl shadow-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Level */}
            <div className="space-y-4">
              <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
                Experience Level
              </label>
              <div className="flex flex-wrap gap-3">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={cn(
                      "px-6 py-3 rounded-xl border-2 font-bold transition-all duration-300",
                      level === l
                        ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Topics */}
            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                  Practice Topics
                </label>
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Multiple allowed</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TOPICS.map((topic) => {
                  const isActive = selectedTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      onClick={() => toggleTopic(topic)}
                      className={cn(
                        "px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 text-center",
                        isActive
                          ? "border-green-500 bg-green-500/5 text-green-600 shadow-lg shadow-green-500/5"
                          : "border-border text-muted-foreground hover:border-green-500/30"
                      )}
                    >
                      {isActive && <Target className="w-4 h-4" />}
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Notification */}
            <div className="space-y-4">
              <label className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-1">
                Daily Reminder
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={notificationTime}
                  onChange={(e) => setNotificationTime(e.target.value)}
                  className="w-full h-14 bg-muted border-none rounded-2xl px-6 font-bold text-lg focus:ring-2 focus:ring-primary/50 transition-all"
                  disabled={loading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ⏰
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || !role || !level}
              className="w-full h-16 text-xl font-bold bg-grad-primary shadow-2xl shadow-primary/20 hover:shadow-primary/40 transition-all rounded-2xl group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  Building Profile...
                </>
              ) : (
                <>
                  Blast Off
                  <ChevronRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
