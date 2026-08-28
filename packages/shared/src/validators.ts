/** Client-side validation mirroring the zod schemas in schemas/auth.ts.
 * Kept dependency-free so web and mobile can share it without bundling zod. */

export interface RegisterFormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors registerSchema (name/email/password) plus an optional confirm check. */
export function validateRegisterForm(input: {
  name: string;
  email: string;
  password: string;
  confirm?: string;
}): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  const name = input.name.trim();
  if (name.length < 2) errors.name = "Name must be at least 2 characters";
  else if (name.length > 120) errors.name = "Name must be 120 characters or fewer";

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address";

  const pw = input.password;
  if (pw.length < 8) errors.password = "Password must be at least 8 characters";
  else if (pw.length > 128) errors.password = "Password must be 128 characters or fewer";
  else {
    if (!/[a-z]/.test(pw)) errors.password = "Password must contain a lowercase letter";
    else if (!/[A-Z]/.test(pw)) errors.password = "Password must contain an uppercase letter";
    else if (!/[0-9]/.test(pw)) errors.password = "Password must contain a number";
  }

  if (input.confirm !== undefined && input.confirm !== pw) errors.confirm = "Passwords do not match";

  return errors;
}

export function registerPasswordHint(): string {
  return "8+ characters with a lowercase letter, an uppercase letter and a number.";
}

export type PasswordStrength = "empty" | "weak" | "fair" | "medium" | "strong";

export interface PasswordCondition {
  key: string;
  label: string;
  met: boolean;
}

/** Live conditions used for the password checklist (must mirror validateRegisterForm). */
export function passwordConditions(password: string): PasswordCondition[] {
  return [
    { key: "length", label: "At least 8 characters", met: password.length >= 8 },
    { key: "lower", label: "A lowercase letter", met: /[a-z]/.test(password) },
    { key: "upper", label: "An uppercase letter", met: /[A-Z]/.test(password) },
    { key: "digit", label: "A number", met: /[0-9]/.test(password) },
  ];
}

/** 0-4 score mirroring the count of met conditions; used for the strength bar. */
export function passwordStrength(password: string): PasswordStrength {
  if (!password) return "empty";
  const met = passwordConditions(password).filter((c) => c.met).length;
  if (met <= 1) return "weak";
  if (met === 2) return "fair";
  if (met === 3) return "medium";
  return "strong";
}
