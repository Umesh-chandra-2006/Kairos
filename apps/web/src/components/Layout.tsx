import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeProvider";

function initialsOf(name: string | null | undefined, email: string | undefined): string {
  const source = name?.trim() || email || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase().slice(0, 2);
}

export function Layout() {
  const { user, logout } = useAuth();
  const { resolved, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? " nav-link-active" : ""}`;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          Kairos
        </Link>
        <nav className={`nav${menuOpen ? " nav-open" : ""}`}>
          <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>
            Today
          </NavLink>
          <NavLink to="/practice" className={linkClass} onClick={() => setMenuOpen(false)}>
            Practice
          </NavLink>
          <NavLink to="/skills" className={linkClass} onClick={() => setMenuOpen(false)}>
            Skills
          </NavLink>
          <NavLink to="/streak" className={linkClass} onClick={() => setMenuOpen(false)}>
            Streak
          </NavLink>
          <NavLink to="/history" className={linkClass} onClick={() => setMenuOpen(false)}>
            History
          </NavLink>
          <NavLink to="/referral" className={linkClass} onClick={() => setMenuOpen(false)}>
            Invite
          </NavLink>
          <NavLink to="/settings" className={linkClass} onClick={() => setMenuOpen(false)}>
            Settings
          </NavLink>
        </nav>
        <div className="topbar-user">
          <button
            className="icon-btn theme-toggle"
            onClick={toggle}
            title={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle color theme"
          >
            {resolved === "dark" ? "☀️" : "🌙"}
          </button>
          <span className="avatar" title={user?.email ?? undefined}>
            {initialsOf(user?.name, user?.email)}
          </span>
          <span className="topbar-name">{user?.name ?? user?.email}</span>
          <button className="btn btn-ghost" onClick={() => void logout()}>
            Log out
          </button>
          <button
            className="icon-btn hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
      {menuOpen && <div className="nav-overlay" onClick={() => setMenuOpen(false)} />}
    </div>
  );
}
