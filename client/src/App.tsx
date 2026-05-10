import { useEffect as useEffectHook, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Answer from "./pages/Answer";
import Result from "./pages/Result";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import Practice from "./pages/Practice";
import { useCurrentUser } from "./hooks/useCurrentUser";
import Login from "./components/Login";
import LoadingScreen from "./components/LoadingScreen";

function Router() {
  const { user, isLoaded } = useCurrentUser();
  const [location, setLocation] = useLocation();

  useEffectHook(() => {
    const onLogout = () => {
      window.location.href = "/"; // Force reload to clear state
    };
    window.addEventListener("logout", onLogout);
    return () => window.removeEventListener("logout", onLogout);
  }, []);

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <Login onLogin={() => window.location.reload()} />
      </div>
    );
  }

  // Redirect to onboarding if not completed
  if (!user.onboarded && location !== "/onboarding") {
    setLocation("/onboarding");
    return null;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/answer" component={Answer} />
      <Route path="/result" component={Result} />
      <Route path="/history" component={History} />
      <Route path="/profile" component={Profile} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/practice" component={Practice} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RouterWrapper() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function App() {
  return <RouterWrapper />;
}

export default App;
