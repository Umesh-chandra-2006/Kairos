// Validate required environment variables at startup
function validateEnv() {
  const required = [
    "DATABASE_URL",
    "JWT_SECRET",
    "OPENROUTER_API_KEY",
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

// Call validation when this module is imported
if (typeof window === "undefined") {
  // Only validate in Node.js environment (not browser)
  try {
    validateEnv();
  } catch (error) {
    console.error("Environment validation failed:", error);
    process.exit(1);
  }
}

export const ENV = {
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "",
  openrouterApiKey: process.env.OPENROUTER_API_KEY || "",
  isProduction: process.env.NODE_ENV === "production",
};
