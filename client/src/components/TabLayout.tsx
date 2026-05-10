import { ReactNode } from "react";
import { useLocation } from "wouter";
import { Home, History, User, LogOut, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { clearToken } from "@/lib/auth";

interface TabLayoutProps {
  children: ReactNode;
  currentTab: "home" | "history" | "profile" | "practice";
}

export function TabLayout({ children, currentTab }: TabLayoutProps) {
  const [, setLocation] = useLocation();

  const tabs = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "practice", label: "Practice", icon: BookOpen, path: "/practice" },
    { id: "history", label: "History", icon: History, path: "/history" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card p-6 fixed h-full z-20">
        <div className="mb-8 px-2">
          <h1 className="text-2xl font-bold text-gradient">Kairos</h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setLocation(tab.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "scale-110" : "group-hover:scale-110 transition-transform")} />
                <span className="font-semibold">{tab.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-border">
          <button 
            onClick={() => { clearToken(); window.location.href = "/"; }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-semibold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Container */}
      <main className="flex-1 lg:pl-64 min-h-screen flex flex-col">
        <div className="flex-1 pb-20 lg:pb-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="glass border-t border-border px-4 py-2 safe-area-pb">
          <div className="flex items-center justify-around max-w-md mx-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setLocation(tab.path)}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-2 px-4 transition-all duration-300",
                    isActive ? "text-primary scale-110" : "text-muted-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabMobile"
                      className="absolute inset-0 bg-primary/10 rounded-xl -z-10"
                    />
                  )}
                  <Icon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
