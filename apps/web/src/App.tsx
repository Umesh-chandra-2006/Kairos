import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AnswerDetail } from "./pages/AnswerDetail";
import Billing from "./pages/Billing";
import { Dashboard } from "./pages/Dashboard";
import { ForgotPassword } from "./pages/ForgotPassword";
import { History } from "./pages/History";
import { Landing } from "./pages/Landing";
import { Leaderboard } from "./pages/Leaderboard";
import { Login } from "./pages/Login";
import { Onboarding } from "./pages/Onboarding";
import { Practice } from "./pages/Practice";
import { Referral } from "./pages/Referral";
import { Register } from "./pages/Register";
import { ResetPassword } from "./pages/ResetPassword";
import { Settings } from "./pages/Settings";
import { SkillProfile } from "./pages/SkillProfile";
import { Streak } from "./pages/Streak";
import { VerifyEmail } from "./pages/VerifyEmail";

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="center-screen">Loading…</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={user && !user.profile ? <Navigate to="/onboarding" replace /> : <Dashboard />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/skills" element={<SkillProfile />} />
        <Route path="/streak" element={<Streak />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/history/:id" element={<AnswerDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/referral" element={<Referral />} />
      </Route>

      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
