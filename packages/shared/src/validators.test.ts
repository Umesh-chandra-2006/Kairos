import { describe, expect, it } from "vitest";
import { registerPasswordHint, validateRegisterForm } from "./validators";

describe("validateRegisterForm", () => {
  it("accepts a valid registration", () => {
    expect(
      validateRegisterForm({ name: "Ada", email: "ada@example.com", password: "Password1" }),
    ).toEqual({});
  });

  it("trims the name and lowercases the email", () => {
    expect(
      validateRegisterForm({ name: "  Ada  ", email: "  Ada@Example.com ", password: "Password1" }),
    ).toEqual({});
  });

  it("rejects a too-short or too-long name", () => {
    expect(
      validateRegisterForm({ name: "A", email: "ada@example.com", password: "Password1" }).name,
    ).toMatch(/at least 2 characters/);
    expect(
      validateRegisterForm({ name: "x".repeat(121), email: "ada@example.com", password: "Password1" }).name,
    ).toMatch(/120 characters or fewer/);
  });

  it("rejects an invalid email", () => {
    expect(
      validateRegisterForm({ name: "Ada", email: "not-an-email", password: "Password1" }).email,
    ).toBe("Enter a valid email address");
  });

  it("reports the first unmet password rule", () => {
    expect(validateRegisterForm({ name: "Ada", email: "a@b.co", password: "short" }).password).toBe(
      "Password must be at least 8 characters",
    );
    expect(validateRegisterForm({ name: "Ada", email: "a@b.co", password: "PASSWORD1" }).password).toBe(
      "Password must contain a lowercase letter",
    );
    expect(validateRegisterForm({ name: "Ada", email: "a@b.co", password: "password1" }).password).toBe(
      "Password must contain an uppercase letter",
    );
    expect(validateRegisterForm({ name: "Ada", email: "a@b.co", password: "Password" }).password).toBe(
      "Password must contain a number",
    );
  });

  it("checks confirm only when provided", () => {
    expect(
      validateRegisterForm({ name: "Ada", email: "a@b.co", password: "Password1", confirm: "Password2" }).confirm,
    ).toBe("Passwords do not match");
    expect(
      validateRegisterForm({ name: "Ada", email: "a@b.co", password: "Password1", confirm: "Password1" }).confirm,
    ).toBeUndefined();
  });
});

describe("registerPasswordHint", () => {
  it("describes the required password rules", () => {
    expect(registerPasswordHint()).toContain("8+ characters");
    expect(registerPasswordHint()).toContain("uppercase");
    expect(registerPasswordHint()).toContain("number");
  });
});
