import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ErrorBanner } from "../components/forms";
import { ShareCard } from "../components/ShareCard";

interface SkillDimension {
  skillId: string;
  name: string;
  score: number;
  confidence: number;
  evidenceCount: number;
  trend: string;
  category: string;
  description: string;
}

const CANVAS_SIZE = 280;
const CENTER = CANVAS_SIZE / 2;
const MAX_RADIUS = 110;

function RadarChart({ skills }: { skills: SkillDimension[] }) {
  if (skills.length === 0) return null;
  const n = skills.length;
  const angleStep = (2 * Math.PI) / n;

  const points = skills.map((s, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const r = (s.score / 10) * MAX_RADIUS;
    return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
  });

  const gridLevels = [2, 4, 6, 8, 10];

  return (
    <svg viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`} className="radar-chart">
      {gridLevels.map((level) => {
        const r = (level / 10) * MAX_RADIUS;
        return (
          <polygon
            key={level}
            points={Array.from({ length: n }, (_, i) => {
              const angle = -Math.PI / 2 + i * angleStep;
              return `${CENTER + r * Math.cos(angle)},${CENTER + r * Math.sin(angle)}`;
            }).join(" ")}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
            opacity="0.5"
          />
        );
      })}
      {skills.map((_, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={CENTER + MAX_RADIUS * Math.cos(angle)}
            y2={CENTER + MAX_RADIUS * Math.sin(angle)}
            stroke="var(--border)"
            strokeWidth="1"
            opacity="0.3"
          />
        );
      })}
      <polygon
        points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="rgba(79, 70, 229, 0.15)"
        stroke="var(--brand-1)"
        strokeWidth="2"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--brand-1)" />
      ))}
      {skills.map((s, i) => {
        const angle = -Math.PI / 2 + i * angleStep;
        const labelR = MAX_RADIUS + 22;
        const x = CENTER + labelR * Math.cos(angle);
        const y = CENTER + labelR * Math.sin(angle);
        const anchor = Math.abs(angle) < 0.1 || Math.abs(angle + Math.PI) < 0.1 ? "middle" : angle > -Math.PI / 2 && angle < Math.PI / 2 ? "start" : "end";
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className="radar-label">
            {s.name.length > 12 ? s.name.slice(0, 11) + "…" : s.name}
          </text>
        );
      })}
    </svg>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const map: Record<string, { icon: string; cls: string }> = {
    improving: { icon: "↑", cls: "trend-up" },
    declining: { icon: "↓", cls: "trend-down" },
    stable: { icon: "→", cls: "trend-stable" },
  };
  const { icon, cls } = map[trend] ?? map.stable!;
  return <span className={`trend-badge ${cls}`}>{icon}</span>;
}

export function SkillProfile() {
  const [skills, setSkills] = useState<SkillDimension[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    api
      .get<{ skills: SkillDimension[] }>("/api/skills/profile")
      .then(({ skills: s }) => setSkills(s))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load skill profile"))
      .finally(() => setLoading(false));
    api.me().then(({ user }) => { setUserName(user.name ?? ""); }).catch(() => {});
    api.streak().then(({ streak: s }) => setStreak(s.current)).catch(() => {});
  }, []);

  if (loading) return <div className="card"><span className="spinner" /> Loading skill profile…</div>;
  if (error) return <div className="card"><ErrorBanner message={error} /></div>;
  if (skills.length === 0) return <div className="card"><p className="muted">Complete some practice questions to see your skill profile.</p></div>;

  return (
    <div className="stack">
      <div className="card card-center">
        <h2 className="card-title">Your Skill Profile</h2>
        <RadarChart skills={skills} />
      </div>

      <div className="card">
        <h2 className="card-title">Skill Breakdown</h2>
        <div className="skill-list">
          {skills.map((s) => (
            <div key={s.skillId} className="skill-row">
              <div className="skill-info">
                <span className="skill-name">{s.name}</span>
                <span className="skill-category tag tag-sm">{s.category}</span>
              </div>
              <div className="skill-score-bar">
                <div className="score-track">
                  <div className="score-fill" style={{ width: `${(s.score / 10) * 100}%` }} />
                </div>
                <span className="skill-score">{s.score.toFixed(1)}</span>
                <TrendBadge trend={s.trend} />
              </div>
              <p className="skill-desc muted">{s.description}</p>
            </div>
          ))}
        </div>
      </div>

      <ShareCard name={userName} streak={streak} skills={skills} />
    </div>
  );
}
