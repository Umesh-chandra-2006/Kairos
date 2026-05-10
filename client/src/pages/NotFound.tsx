import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full mx-4"
      >
        <div className="premium-card text-center space-y-8 py-12">
          <div className="relative inline-block">
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 4, repeat: Infinity }}
              className="relative z-10 w-24 h-24 bg-destructive/10 rounded-3xl flex items-center justify-center mx-auto"
            >
              <AlertCircle className="h-12 w-12 text-destructive" />
            </motion.div>
            <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full -z-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-8xl font-black tracking-tighter text-gradient opacity-20">404</h1>
            <h2 className="text-3xl font-extrabold tracking-tight -mt-10 relative z-20">
              Lost in Time
            </h2>
            <p className="text-muted-foreground font-medium text-lg px-8">
              This moment doesn't exist yet, or it's already passed us by. 
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center px-8">
            <Button
              onClick={() => setLocation("/")}
              size="lg"
              className="bg-grad-primary h-14 rounded-2xl px-8 font-bold shadow-xl shadow-primary/20"
            >
              <Home className="w-5 h-5 mr-3" />
              Return Home
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.history.back()}
              className="h-14 rounded-2xl px-8 font-bold border-2"
            >
              <ArrowLeft className="w-5 h-5 mr-3" />
              Go Back
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
