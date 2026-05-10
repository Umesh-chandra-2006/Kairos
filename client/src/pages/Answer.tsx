import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, ArrowLeft, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { TabLayout } from "@/components/TabLayout";
import type { Question as QuestionType } from "@shared/api-types";

export default function Answer() {
  const [, setLocation] = useLocation();
  const api = useApi();
  const [question, setQuestion] = useState<QuestionType | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Use URLSearchParams correctly
  const queryParams = new URLSearchParams(window.location.search);
  const questionId = queryParams.get("questionId");

  useEffect(() => {
    loadQuestion();
  }, [questionId]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      setError("");
      
      if (questionId) {
        const data = await api.getQuestion(questionId);
        setQuestion(data.question);
      } else {
        const data = await api.getTodayQuestion();
        if (data.alreadyAnswered) {
          setLocation("/result");
          return;
        }
        setQuestion(data.question);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load question");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const qId = questionId || question?.id;
    if (!qId) return;

    try {
      setSubmitting(true);
      setError("");
      const result = await api.submitAnswer({
        questionId: qId,
        answerText,
      });
      // Store result in session storage for Result screen
      sessionStorage.setItem("lastResult", JSON.stringify(result));
      setLocation("/result");
    } catch (err: any) {
      setError(err.message || "Failed to submit answer");
      setSubmitting(false);
    }
  };

  const charCount = answerText.length;
  const minChars = 20;
  const isValid = charCount >= minChars;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TabLayout currentTab="home">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="rounded-full hover:bg-accent"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-muted-foreground">Practice Session</h1>
        </div>

        {question && (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                  {question.category}
                </span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  question.difficulty === "easy" ? "bg-green-500/10 text-green-600" :
                  question.difficulty === "medium" ? "bg-amber-500/10 text-amber-600" :
                  "bg-red-500/10 text-red-600"
                )}>
                  {question.difficulty}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                {question.text}
              </h2>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl"
                >
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-destructive font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Your Response
                </label>
                <div className={cn(
                  "text-xs font-medium transition-colors",
                  isValid ? "text-green-600" : "text-amber-600"
                )}>
                  {charCount} / {minChars} characters
                </div>
              </div>
              
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-grad-primary rounded-2xl blur opacity-10 group-focus-within:opacity-30 transition-opacity duration-500" />
                <Textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Draft your answer here. Focus on clarity and technical accuracy..."
                  className="relative min-h-[300px] glass-premium border-none focus-visible:ring-0 text-lg leading-relaxed p-6 rounded-2xl resize-none"
                  disabled={submitting}
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="w-full h-14 text-lg font-bold bg-grad-primary shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all rounded-2xl group"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  AI is evaluating...
                </>
              ) : (
                <>
                  Submit Response
                  <Send className="ml-3 w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </TabLayout>
  );
}
