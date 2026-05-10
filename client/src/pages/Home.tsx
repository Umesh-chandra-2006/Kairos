import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Zap, ArrowRight, Sparkles, Trophy, Calendar, Target, Loader2 } from "lucide-react";
import { TabLayout } from "@/components/TabLayout";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Home() {
  const [, setLocation] = useLocation();
  const api = useApi();
  const [data, setData] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getTodayQuestion(), api.getStreak()]).then(
      ([questionData, streakData]) => {
        setData(questionData);
        setStreak(streakData);
        setLoading(false);
      }
    ).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
         <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const question = data?.question;
  const alreadyAnswered = data?.alreadyAnswered;

  return (
    <TabLayout currentTab="home">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-12">
        {/* Hero Section */}
        <section className="relative pt-12 pb-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-primary/5 blur-3xl rounded-full -z-10" />
          
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm font-bold text-primary mb-4"
            >
              <Sparkles className="w-4 h-4" />
              <span>Today's Challenge is Live</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-black tracking-tight"
            >
              Master Your <span className="text-gradient">Potential</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl text-muted-foreground font-medium"
            >
              Join 5,000+ engineers practicing daily technical scenarios. 
              Build the habit, ace the interview.
            </motion.p>
          </div>
        </section>

        {/* Daily Action Card */}
        {question && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", damping: 20 }}
          >
            <Card className="premium-card p-0 overflow-hidden border-none shadow-2xl">
              <div className="grid md:grid-cols-5 h-full">
                <div className="md:col-span-3 p-8 md:p-12 space-y-8">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest">
                        {question.category}
                      </span>
                      <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-bold uppercase tracking-widest">
                        {question.difficulty}
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold leading-tight">
                      {question.text}
                    </h2>
                  </div>

                  <div className="flex items-center gap-6">
                    <Button
                      size="lg"
                      onClick={() => setLocation(alreadyAnswered ? "/result" : "/answer")}
                      className="h-14 px-10 text-lg font-bold bg-grad-primary rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all group"
                    >
                      {alreadyAnswered ? "View Analysis" : "Start Practicing"}
                      <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    
                    {!alreadyAnswered && (
                      <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
                        <Target className="w-5 h-5" />
                        <span className="text-sm font-semibold">15 min effort</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 bg-grad-primary p-8 md:p-12 flex flex-col justify-center items-center text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16 blur-2xl" />
                  
                  <div className="relative z-10 text-center space-y-4">
                     <motion.div 
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-7xl mb-2"
                    >
                      🔥
                    </motion.div>
                    <div className="space-y-1">
                      <span className="text-5xl font-black">{streak?.current || 0}</span>
                      <p className="text-lg font-bold opacity-80 uppercase tracking-widest">Day Streak</p>
                    </div>
                    <div className="pt-4 border-t border-white/20">
                      <p className="text-sm font-medium opacity-70">
                        Best: {streak?.longest || 0} days
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 pb-12">
          {[
            { icon: Calendar, title: "Daily Ritual", desc: "One high-impact question every single morning." },
            { icon: Zap, title: "AI Insights", desc: "Get instant feedback powered by expert interviewers." },
            { icon: Trophy, title: "Skill Growth", desc: "Track your progress across core categories." },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="premium-card p-6 flex items-start gap-4"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </TabLayout>
  );
}
