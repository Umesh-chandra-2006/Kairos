import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, AlertCircle, Calendar, Sparkles, Trophy } from "lucide-react";
import { TabLayout } from "@/components/TabLayout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Answer } from "@shared/api-types";

export default function History() {
  const api = useApi();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.getHistory();
      setAnswers(data.answers || []);
    } catch (err: any) {
      setError(err.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (answers: Answer[]) => {
    const groups: { [key: string]: Answer[] } = {};
    answers.forEach((answer) => {
      if (!groups[answer.date]) {
        groups[answer.date] = [];
      }
      groups[answer.date].push(answer);
    });
    return groups;
  };

  const getScoreColor = (score: number) => {
    if (score <= 4) return "text-red-500";
    if (score <= 7) return "text-amber-500";
    return "text-green-500";
  };

  if (loading) {
    return (
      <TabLayout currentTab="history">
        <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-8">
          <Skeleton className="h-10 w-48 rounded-xl" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      </TabLayout>
    );
  }

  if (answers.length === 0) {
    return (
      <TabLayout currentTab="history">
        <div className="max-w-3xl mx-auto min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 p-8">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
            <Calendar className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gradient">Your journey starts here</h2>
            <p className="text-muted-foreground max-w-xs">Complete your first daily challenge to see your progress history.</p>
          </div>
        </div>
      </TabLayout>
    );
  }

  const grouped = groupByDate(answers);
  const sortedDates = Object.keys(grouped).sort().reverse();

  return (
    <TabLayout currentTab="history">
      <div className="max-w-3xl mx-auto space-y-12 p-4 md:p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Practice History</h1>
          <p className="text-muted-foreground font-medium">Tracking your journey to technical excellence.</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-12">
          {sortedDates.map((date, dateIdx) => (
            <motion.div 
              key={date}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: dateIdx * 0.1 }}
              className="space-y-6"
            >
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-4">
                <span className="shrink-0">{new Date(date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}</span>
                <span className="h-px bg-muted flex-1" />
              </h2>

              <div className="space-y-4">
                {grouped[date].map((answer) => (
                  <motion.div
                    key={answer.id}
                    layout
                    className="premium-card p-0 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(expandedId === answer.id ? null : answer.id)}
                      className="w-full p-6 flex items-start justify-between text-left group"
                    >
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            {answer.question?.category}
                          </span>
                          <div className={cn("flex items-center gap-1 font-bold text-xs", getScoreColor(answer.score))}>
                            <Trophy className="w-3 h-3" />
                            {answer.score}/10
                          </div>
                        </div>
                        <p className="text-lg font-bold leading-tight group-hover:text-primary transition-colors pr-8">
                          {answer.question?.text}
                        </p>
                      </div>
                      <div className="shrink-0 pt-1">
                         <ChevronDown
                          className={cn(
                            "w-6 h-6 text-muted-foreground transition-transform duration-300",
                            expandedId === answer.id ? "rotate-180" : ""
                          )}
                        />
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedId === answer.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-2 space-y-6">
                            <div className="h-px bg-muted" />
                            
                            <div className="space-y-2">
                              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Your Answer</h4>
                              <div className="p-4 glass rounded-xl text-sm leading-relaxed text-muted-foreground italic">
                                "{answer.answerText}"
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Sparkles className="w-3 h-3 text-primary" />
                                AI Evaluation
                              </h4>
                              <p className="text-sm font-medium leading-relaxed">
                                {answer.feedback}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Model Answer</h4>
                              <div className="p-4 bg-primary/5 rounded-xl text-sm leading-relaxed font-mono">
                                {answer.modelAnswer}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </TabLayout>
  );
}
