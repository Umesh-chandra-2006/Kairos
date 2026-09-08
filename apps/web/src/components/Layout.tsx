import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeProvider";

const tabs = [
  { label: "Today", path: "/" },
  { label: "Practice", path: "/practice" },
  { label: "Skills", path: "/skills" },
  { label: "Progress", path: "/streak" },
  { label: "Profile", path: "/settings" },
];

export function Layout() {
  const { user } = useAuth();
  const { resolved, toggle } = useTheme();

  const initialsOf = (name: string | null | undefined, email: string | undefined) => {
    const source = name?.trim() || email || "?";
    const parts = source.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
    return (first + last).toUpperCase().slice(0, 2);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">k</span>
          <span>kairos</span>
        </Link>
        <div className="topbar-actions">
          <button
            className="icon-btn"
            onClick={toggle}
            aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {resolved === "dark" ? "☀️" : "🌙"}
          </button>
          {user ? (
            <span className="avatar" title={user.email ?? undefined}>
              {initialsOf(user.name, user.email)}
            </span>
          ) : (
            <>
              <Link to="/login" className="quiet-link">Sign in</Link>
              <Link to="/register" className="btn btn-sm">Get started</Link>
            </>
          )}
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {tabs.map(({ label, path }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}
          >
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
