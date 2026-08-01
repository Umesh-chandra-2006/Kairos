import { getEnv } from "@kairos/config";
import { Resend } from "resend";

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = getEnv().RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const c = getClient();
  if (!c) {
    console.log(`[email:dry-run] to=${message.to} subject="${message.subject}"`);
    return false;
  }
  try {
    const { error } = await c.emails.send({
      from: getEnv().EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) {
      console.error("[email] send failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send threw:", err);
    return false;
  }
}

function wrap(link: string, body: string): string {
  const brand = "Kairos — Interview Prep";
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
    <h2 style="color:#18181b;">${brand}</h2>
    <p style="color:#3f3f46;line-height:1.6;">${body}</p>
    <p><a href="${link}" style="display:inline-block;background:#18181b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Open link</a></p>
    <p style="color:#71717a;font-size:12px;">If the button does not work, copy this URL: <br/>${link}</p>
    <p style="color:#a1a1aa;font-size:12px;">If you did not request this, you can safely ignore this email.</p>
  </body></html>`;
}

export function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const link = `${getEnv().APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to,
    subject: "Verify your Kairos email",
    html: wrap(link, "Thanks for signing up! Please verify your email address to unlock your account."),
    text: `Verify your email: ${link}`,
  });
}

export function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const link = `${getEnv().APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to,
    subject: "Reset your Kairos password",
    html: wrap(link, "We received a request to reset your password. Use the link below (valid for 1 hour)."),
    text: `Reset your password: ${link}`,
  });
}
