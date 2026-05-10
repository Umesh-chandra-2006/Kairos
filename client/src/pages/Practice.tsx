import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useApi } from "@/hooks/useApi";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TabLayout } from "@/components/TabLayout";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Search, ArrowRight, Zap, Target, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "DSA", "OS", "DBMS", "Networks", "OOP", "SystemDesign", "Behavioral", 
  "FullStack", "Frontend", "Backend", "HR", "Cloud", "Security", 
  "Testing", "DevOps", "Mobile", "MachineLearning", "Agile", "Product"
];

export default function Practice() {
  const [, setLocation] = useLocation();
  const api = useApi();
  const { user } = useCurrentUser();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const userTopics = user?.profileTargets ? 
    (typeof user.profileTargets === 'string' ? JSON.parse(user.profileTargets) : user.profileTargets) 
    : [];

  const filteredCategories = CATEGORIES.filter(cat => 
    cat.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const aSelected = userTopics.includes(a);
    const bSelected = userTopics.includes(b);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });

  const startPractice = async (category: string) => {
    try {
      setLoading(true);
      const data = await api.getPracticeQuestion(category);
      if (data.question) {
        setLocation(`/answer?questionId=${data.question.id}`);
      }
    } catch (err) {
      console.error("Failed to start practice:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TabLayout currentTab="practice">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-12">
        <div className="space-y-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 glass rounded-full text-sm font-bold text-primary mb-2"
          >
            <Zap className="w-4 h-4" />
            <span>Targeted Practice Sessions</span>
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            Select Your <span className="text-gradient">Battlefield</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose a specific category to sharpen your skills. {userTopics.length > 0 ? "Highlighted categories match your interests." : "No pressure, just practice."}
          </p>
        </div>

        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 bg-muted/50 border-none rounded-2xl pl-12 pr-6 font-semibold focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredCategories.map((cat, i) => {
              const isUserTopic = userTopics.includes(cat);
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <button
                    onClick={() => startPractice(cat)}
                    disabled={loading}
                    className="w-full text-left group"
                  >
                    <Card className={cn(
                      "premium-card h-full p-8 flex flex-col justify-between transition-all",
                      isUserTopic ? "border-primary/40 bg-primary/5 shadow-primary/5" : "hover:border-primary/30"
                    )}>
                      <div className="space-y-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                          isUserTopic ? "bg-primary text-white" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white"
                        )}>
                          {isUserTopic ? <Star className="w-6 h-6 fill-current" /> : <BookOpen className="w-6 h-6" />}
                        </div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold">{cat}</h3>
                          {isUserTopic && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-1 bg-primary/10 rounded-lg">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Master the core concepts of {cat} through curated challenges.
                        </p>
                      </div>
                      <div className="mt-8 flex items-center gap-2 text-primary font-bold text-sm">
                        Practice Now
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Card>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <Target className="w-16 h-16 text-muted-foreground mx-auto opacity-20" />
            <p className="text-muted-foreground font-bold">No categories match your search.</p>
          </div>
        )}
      </div>
    </TabLayout>
  );
}
