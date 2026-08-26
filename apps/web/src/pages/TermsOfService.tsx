import { Link } from "react-router-dom";

export function TermsOfService() {
  return (
    <div className="legal-page">
      <div className="legal-content">
        <Link to="/" className="legal-back">&larr; Back to Kairos</Link>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: August 26, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using Kairos ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>Kairos is an AI-powered interview preparation platform that provides daily practice questions, voice practice, skill tracking, and personalized feedback. The Service is provided "as is" and may be modified or discontinued at any time.</p>

        <h2>3. Eligibility</h2>
        <p>You must be at least 16 years old to use the Service. By using the Service, you represent that you meet this age requirement.</p>

        <h2>4. Account Registration</h2>
        <p>You must provide accurate and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</p>

        <h2>5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose</li>
          <li>Attempt to gain unauthorized access to any part of the Service</li>
          <li>Interfere with or disrupt the Service or servers</li>
          <li>Use automated systems to access the Service without permission</li>
          <li>Share your account credentials with others</li>
        </ul>

        <h2>6. Intellectual Property</h2>
        <p>The Service, including its content, features, and design, is owned by Kairos and protected by copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>

        <h2>7. User Content</h2>
        <p>When you submit answers, recordings, or other content to the Service, you grant Kairos a non-exclusive, worldwide, royalty-free license to use, modify, and display that content solely for the purpose of operating and improving the Service.</p>

        <h2>8. AI-Generated Content</h2>
        <p>The Service uses artificial intelligence to generate feedback, evaluations, and suggestions. AI-generated content is provided for educational purposes only and should not be considered professional career advice.</p>

        <h2>9. Subscription and Payment</h2>
        <p>Free tier access is subject to daily usage limits. Pro subscriptions are processed through Razorpay. You may cancel your subscription at any time. Refunds are handled in accordance with applicable law.</p>

        <h2>10. Disclaimer of Warranties</h2>
        <p>The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or that it will achieve any particular result.</p>

        <h2>11. Limitation of Liability</h2>
        <p>To the maximum extent permitted by law, Kairos shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</p>

        <h2>12. Termination</h2>
        <p>We may suspend or terminate your access to the Service at any time, with or without cause, with or without notice. Upon termination, your right to use the Service ceases immediately.</p>

        <h2>13. Changes to Terms</h2>
        <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

        <h2>14. Contact</h2>
        <p>Questions about these Terms? Email us at <a href="mailto:support@kairos.app">support@kairos.app</a>.</p>
      </div>
    </div>
  );
}
