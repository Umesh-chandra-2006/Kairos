import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? " nav-link-active" : ""}`;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Kairos
        </Link>
        <nav className="nav">
          <NavLink to="/" end className={linkClass}>
            Today
          </NavLink>
          <NavLink to="/streak" className={linkClass}>
            Streak
          </NavLink>
          <NavLink to="/leaderboard" className={linkClass}>
            Leaderboard
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            History
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
            Settings
          </NavLink>
        </nav>
        <div className="topbar-user">
          <span className="topbar-name">{user?.name ?? user?.email}</span>
          <button className="btn btn-ghost" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
