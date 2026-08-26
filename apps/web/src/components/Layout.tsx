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
          <NavLink to="/practice" className={linkClass}>
            Practice
          </NavLink>
          <NavLink to="/skills" className={linkClass}>
            Skills
          </NavLink>
          <NavLink to="/streak" className={linkClass}>
            Streak
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            History
          </NavLink>
          <NavLink to="/settings" className={linkClass}>
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
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
