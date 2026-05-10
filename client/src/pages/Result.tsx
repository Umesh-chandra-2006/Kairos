import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown, Sparkles, CheckCircle2, Trophy, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TabLayout } from "@/components/TabLayout";
import type { SubmitAnswerResponse } from "@shared/api-types";

export default function Result() {
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [expandedModel, setExpandedModel] = useState(false);
  const [streakAnimated, setStreakAnimated] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("lastResult");
    if (stored) {
      setResult(JSON.parse(stored));
      setTimeout(() => setStreakAnimated(true), 300);
    }
  }, []);

  if (!result) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">No results found</h2>
          <p className="text-muted-foreground">Complete today's challenge to see your score.</p>
        </div>
        <Button onClick={() => setLocation("/")} size="lg" className="rounded-2xl">
          Back to Home
        </Button>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score <= 4) return "text-red-500";
    if (score <= 7) return "text-amber-500";
    return "text-green-500";
  };

  return (
    <TabLayout currentTab="home">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
        <div className="text-center space-y-4 py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 text-green-600 mb-2"
          >
            <CheckCircle2 className="w-12 h-12" />
          </motion.div>
          <h1 className="text-4xl font-extrabold tracking-tight">Great Work!</h1>
          <p className="text-muted-foreground font-medium">Evaluation complete. Here's how you performed.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Score Card */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="premium-card text-center flex flex-col justify-center gap-4 py-10"
          >
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Overall Score</p>
            <div className="relative inline-block">
               <span className={cn("text-7xl font-black", getScoreColor(result.score))}>
                {result.score}
              </span>
              <span className="text-2xl font-bold text-muted-foreground">/10</span>
            </div>
            <div className="flex justify-center gap-1">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-2 h-2 rounded-full",
                    i < result.score ? "bg-primary" : "bg-muted"
                  )} 
                />
              ))}
            </div>
          </motion.div>

          {/* Streak Card */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="premium-card bg-orange-500/5 border-orange-500/10 text-center flex flex-col justify-center gap-4 py-10 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy className="w-20 h-20 text-orange-500" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-orange-600/70">Streak Status</p>
            <div className="flex items-center justify-center gap-3">
              <motion.div
                animate={streakAnimated ? { 
                  scale: [1, 1.3, 1],
                  rotate: [0, 10, -10, 0]
                } : {}}
                className="text-5xl"
              >
                🔥
              </motion.div>
              <span className="text-5xl font-black text-orange-600">
                {result.streak?.current || 0}
              </span>
            </div>
            <p className="text-sm font-bold text-orange-600/80">Day Streak</p>
          </motion.div>
        </div>

        {/* Feedback Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="premium-card space-y-4"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold">Expert Feedback</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed text-lg">
            {result.feedback}
          </p>
        </motion.div>

        {/* Model Answer (Collapsible) */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="overflow-hidden border-none shadow-none bg-transparent">
            <button
              onClick={() => setExpandedModel(!expandedModel)}
              className="w-full premium-card flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-xl font-bold">Perfect Response</h3>
              </div>
              <ChevronDown
                className={cn(
                  "w-6 h-6 text-muted-foreground transition-transform duration-300",
                  expandedModel ? "rotate-180" : "group-hover:translate-y-1"
                )}
              />
            </button>
            <AnimatePresence>
              {expandedModel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-8 glass-premium rounded-2xl bg-primary/5">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-lg italic">
                      "{result.modelAnswer}"
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <Button
            onClick={() => {
              sessionStorage.removeItem("lastResult");
              setLocation("/");
            }}
            size="lg"
            className="flex-1 h-14 text-lg font-bold bg-grad-primary rounded-2xl shadow-xl shadow-primary/20"
          >
            Finish Today
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-14 rounded-2xl border-2 font-bold flex items-center gap-2"
            onClick={() => {
              navigator.clipboard.writeText(`I just scored ${result.score}/10 on Kairos today! 🚀`);
              alert("Score copied to clipboard!");
            }}
          >
            <Share2 className="w-5 h-5" />
            Share Result
          </Button>
        </div>
      </div>
    </TabLayout>
  );
}
