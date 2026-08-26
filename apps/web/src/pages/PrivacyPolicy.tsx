import { Link } from "react-router-dom";

export function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <Link to="/" className="legal-back">&larr; Back to Kairos</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: August 26, 2026</p>

        <h2>1. Introduction</h2>
        <p>Kairos ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our interview preparation platform.</p>

        <h2>2. Information We Collect</h2>
        <h3>2.1 Account Information</h3>
        <p>Name, email address, and password (stored in hashed form). If you sign up via Google, we receive your name and email from Google's OAuth service.</p>

        <h3>2.2 Usage Data</h3>
        <p>Practice answers, voice recordings, evaluation results, skill scores, streaks, and interaction patterns with the Service.</p>

        <h3>2.3 Device Information</h3>
        <p>Browser type, operating system, device type, and IP address (used for rate limiting and abuse prevention only).</p>

        <h3>2.4 Consent Records</h3>
        <p>We log your consent choices (cookie consent, data processing consent) with timestamps and IP addresses as required by GDPR.</p>

        <h2>3. How We Use Your Information</h2>
        <ul>
          <li>To provide and maintain the Service</li>
          <li>To generate personalized AI feedback on your answers</li>
          <li>To track your skill progress and learning patterns</li>
          <li>To send daily reminders and weekly summaries (if enabled)</li>
          <li>To prevent abuse and ensure security</li>
          <li>To improve the Service through aggregated, anonymized analytics</li>
        </ul>

        <h2>4. AI and Data Processing</h2>
        <p>Your answers are sent to AI language models (via OpenRouter) for evaluation. These providers process your data solely to generate feedback and do not use it to train their models. We do not sell your personal data to any third party.</p>

        <h2>5. Data Sharing</h2>
        <p>We do not sell, trade, or rent your personal information. We may share data with:</p>
        <ul>
          <li>Service providers who assist in operating the Service (hosting, email, payments)</li>
          <li>Law enforcement when required by law</li>
        </ul>

        <h2>6. Data Retention</h2>
        <p>We retain your data for as long as your account is active. When you delete your account, we permanently remove your personal data within 30 days, except where required by law.</p>

        <h2>7. Your Rights (GDPR)</h2>
        <p>If you are in the European Economic Area, you have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to or restrict processing</li>
          <li>Data portability</li>
          <li>Withdraw consent at any time</li>
        </ul>
        <p>Exercise these rights via the Settings page or by emailing <a href="mailto:privacy@kairos.app">privacy@kairos.app</a>.</p>

        <h2>8. Data Security</h2>
        <p>We implement industry-standard security measures including encrypted transit (TLS), hashed passwords (bcrypt), rate limiting, and input validation. No system is 100% secure, but we take reasonable measures to protect your data.</p>

        <h2>9. Cookies</h2>
        <p>We use only essential cookies (authentication, session, theme preference). We do not use tracking cookies or third-party analytics cookies without your consent.</p>

        <h2>10. Children's Privacy</h2>
        <p>The Service is not intended for children under 16. We do not knowingly collect data from children under 16.</p>

        <h2>11. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the Service.</p>

        <h2>12. Contact</h2>
        <p>Questions about this policy? Email <a href="mailto:privacy@kairos.app">privacy@kairos.app</a>.</p>
      </div>
    </div>
  );
}
