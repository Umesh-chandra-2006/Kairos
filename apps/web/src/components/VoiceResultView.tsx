import type { Band, EvaluationResult } from "@kairos/shared";

const BAND_LABEL: Record<Band, string> = {
  needs_work: "Needs work",
  solid: "Solid",
  strong: "Strong",
};

function bandClass(band: Band): string {
  return band === "strong" ? "band-strong" : band === "solid" ? "band-solid" : "band-needs";
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return "";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Renders a canonical Evaluation Contract v1 result for a voice submission:
 * dimension bands with provenance hints, strengths/weaknesses, and exactly
 * one next action.
 */
export function VoiceResultView({
  result,
  transcript,
}: {
  result: EvaluationResult;
  transcript: string | null;
}) {
  const d = result.delivery;
  return (
    <div className="stack">
      <div className="card">
        <div className="row-between">
          <div>
            <span className={`band-tag ${bandClass(result.overallBand)}`}>{BAND_LABEL[result.overallBand]}</span>
            <span className="muted"> overall</span>
          </div>
          <span className="muted">{formatDuration(d.durationMs)} answer</span>
        </div>

        <div className="dim-grid">
          <div className="dim-cell">
            <span className="muted">Content</span>
            <span className={`band-tag ${bandClass(result.content.band)}`}>{BAND_LABEL[result.content.band]}</span>
          </div>
          <div className="dim-cell">
            <span className="muted">Structure</span>
            <span className={`band-tag ${bandClass(result.structure.band)}`}>{BAND_LABEL[result.structure.band]}</span>
          </div>
          <div className="dim-cell">
            <span className="muted">Delivery</span>
            <span className={`band-tag ${bandClass(d.band)}`}>{BAND_LABEL[d.band]}</span>
          </div>
        </div>

        <p className="muted delivery-metrics">
          {Math.round(d.speechRate)} wpm · {d.fillerRate.toFixed(1)} fillers/min ·{" "}
          {Math.round(d.speakingRatio * 100)}% speaking time · {d.pauses.count} pauses
        </p>

        <div className="next-action">
          <strong>Next step:</strong> {result.nextAction.instruction}
        </div>
      </div>

      {(result.content.strengths.length > 0 || result.content.weaknesses.length > 0) && (
        <div className="card">
          {result.content.strengths.length > 0 && (
            <>
              <h3 className="section-title">What worked</h3>
              <ul className="plain-list">
                {result.content.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {result.content.weaknesses.length > 0 && (
            <>
              <h3 className="section-title">What to improve</h3>
              <ul className="plain-list">
                {result.content.weaknesses.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {transcript && (
        <details className="card transcript-card">
          <summary>Your transcript</summary>
          <p>{transcript}</p>
        </details>
      )}
    </div>
  );
}
