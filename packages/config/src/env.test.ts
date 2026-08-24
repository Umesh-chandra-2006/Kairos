import { describe, expect, it } from "vitest";
import { corsOrigins, loadEnv } from "./env";

const base = {
  DATABASE_URL: "mysql://user:pass@localhost:3307/kairos",
  JWT_SECRET: "0123456789abcdef0123456789abcdef", // exactly 32 characters
};

describe("loadEnv", () => {
  it("applies defaults for optional and unset variables", () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.APP_URL).toBe("http://localhost:5173");
    expect(env.OPENROUTER_CACHE_TTL_SEC).toBe(86_400);
    expect(env.JWT_ACCESS_TTL).toBe("15m");
    expect(env.NODE_ENV).toMatch(/^(development|test|production)$/);
  });

  it("coerces numeric strings", () => {
    const env = loadEnv({ ...base, PORT: "9000", RATE_LIMIT_MAX: "5", OPENROUTER_TIMEOUT_MS: "1000" });
    expect(env.PORT).toBe(9000);
    expect(env.RATE_LIMIT_MAX).toBe(5);
    expect(env.OPENROUTER_TIMEOUT_MS).toBe(1000);
  });

  it("honors explicit overrides over process.env", () => {
    const env = loadEnv({
      ...base,
      NODE_ENV: "production",
      REDIS_URL: "redis://localhost:6379",
      OPENROUTER_API_KEY: "sk-override",
      RESEND_API_KEY: "re_override",
    });
    expect(env.NODE_ENV).toBe("production");
    expect(env.OPENROUTER_API_KEY).toBe("sk-override");
  });

  it("requires REDIS_URL, OPENROUTER_API_KEY and RESEND_API_KEY in production", () => {
    expect(() => loadEnv({ ...base, NODE_ENV: "production", REDIS_URL: "redis://localhost:6379" })).toThrow(
      /OPENROUTER_API_KEY.*required in production.*RESEND_API_KEY.*required in production/s,
    );
    expect(() =>
      loadEnv({ ...base, NODE_ENV: "production", REDIS_URL: "", OPENROUTER_API_KEY: "sk-x", RESEND_API_KEY: "re_x" }),
    ).toThrow(/REDIS_URL.*required in production/);
  });

  it("throws a descriptive error when a required variable is missing", () => {
    expect(() => loadEnv({ ...base, DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
  });

  it("throws when JWT_SECRET is shorter than 32 characters", () => {
    expect(() => loadEnv({ ...base, JWT_SECRET: "short" })).toThrow(/at least 32 characters/);
  });
});

describe("corsOrigins", () => {
  it("splits and trims a comma-separated origin list", () => {
    const env = loadEnv({ ...base, CORS_ORIGINS: "http://a.test,  http://b.test ,http://c.test" });
    expect(corsOrigins(env)).toEqual(["http://a.test", "http://b.test", "http://c.test"]);
  });
});
