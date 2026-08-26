import { Link } from "react-router-dom";

export function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <span className="landing-brand">Kairos</span>
        <div className="landing-nav-links">
          <Link to="/login" className="btn btn-secondary btn-sm">Log in</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <h1>Ace your next interview.<br />One question a day.</h1>
        <p className="landing-sub">Daily AI-powered interview prep across DSA, OS, DBMS, Networks, and more.</p>
        <div className="landing-cta">
          <Link to="/register" className="btn btn-primary btn-lg">Start practicing</Link>
          <span className="landing-free">Free forever. No credit card.</span>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-feature-card">
          <span className="feature-icon-lg">📝</span>
          <h3>Daily questions</h3>
          <p>One fresh question every day, tailored to your skill level and weak areas.</p>
        </div>
        <div className="landing-feature-card">
          <span className="feature-icon-lg">🎙️</span>
          <h3>Voice practice</h3>
          <p>Record your answer and get instant AI feedback on clarity, depth, and delivery.</p>
        </div>
        <div className="landing-feature-card">
          <span className="feature-icon-lg">📊</span>
          <h3>Skills radar</h3>
          <p>Track your progress across 10 dimensions with a visual skill profile.</p>
        </div>
        <div className="landing-feature-card">
          <span className="feature-icon-lg">🧠</span>
          <h3>Adaptive difficulty</h3>
          <p>Questions get harder as you improve, easier when you need practice.</p>
        </div>
        <div className="landing-feature-card">
          <span className="feature-icon-lg">🔥</span>
          <h3>Streak tracking</h3>
          <p>Build consistency with daily streaks and a leaderboard.</p>
        </div>
        <div className="landing-feature-card">
          <span className="feature-icon-lg">💡</span>
          <h3>Follow-ups</h3>
          <p>Get personalized follow-up questions targeting your weak areas.</p>
        </div>
      </section>

      <section className="landing-pricing">
        <h2>Simple pricing</h2>
        <div className="landing-plans">
          <div className="landing-plan">
            <h3>Free</h3>
            <div className="landing-price">₹0</div>
            <ul>
              <li>3 evaluations / day</li>
              <li>10 voice minutes / day</li>
              <li>Skills tracking</li>
              <li>Daily streaks</li>
            </ul>
            <Link to="/register" className="btn btn-secondary">Get started</Link>
          </div>
          <div className="landing-plan landing-plan-featured">
            <h3>Pro</h3>
            <div className="landing-price">₹9.99<span>/mo</span></div>
            <ul>
              <li>Unlimited evaluations</li>
              <li>Unlimited voice</li>
              <li>Full skills analytics</li>
              <li>Priority support</li>
            </ul>
            <Link to="/register" className="btn btn-primary">Start free trial</Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span>Kairos &copy; {new Date().getFullYear()}</span>
        <span>Made for students, by students.</span>
      </footer>
    </div>
  );
}
