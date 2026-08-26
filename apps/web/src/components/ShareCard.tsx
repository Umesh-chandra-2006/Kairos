interface SkillDimension {
  name: string;
  score: number;
}

interface ShareCardProps {
  name: string;
  streak: number;
  skills: SkillDimension[];
}

export function ShareCard({ name, streak, skills }: ShareCardProps) {
  const topSkills = skills
    .filter((s) => s.score >= 0.6)
    .slice(0, 3)
    .map((s) => s.name);
  const weakSkills = skills
    .filter((s) => s.score < 0.5)
    .slice(0, 2)
    .map((s) => s.name);

  const shareText = [
    `I'm on a ${streak}-day interview prep streak on Kairos! 🔥`,
    topSkills.length ? `Strong in: ${topSkills.join(", ")}` : "",
    weakSkills.length ? `Working on: ${weakSkills.join(", ")}` : "",
    "Practice daily at kairos.app",
  ]
    .filter(Boolean)
    .join("\n");

  const encoded = encodeURIComponent(shareText);
  const url = "https://kairos.app";

  return (
    <div className="share-card">
      <div className="share-card-inner">
        <div className="share-card-brand">Kairos</div>
        <div className="share-card-name">{name}</div>
        <div className="share-card-streak">{streak} day streak 🔥</div>
        {topSkills.length > 0 && (
          <div className="share-card-skills">
            <span className="share-card-label">Strong:</span> {topSkills.join(" · ")}
          </div>
        )}
        {weakSkills.length > 0 && (
          <div className="share-card-skills">
            <span className="share-card-label">Growing:</span> {weakSkills.join(" · ")}
          </div>
        )}
      </div>
      <div className="share-actions">
        <a
          href={`https://twitter.com/intent/tweet?text=${encoded}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          Share on Twitter
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          Share on LinkedIn
        </a>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigator.clipboard.writeText(shareText)}
        >
          Copy text
        </button>
      </div>
    </div>
  );
}
