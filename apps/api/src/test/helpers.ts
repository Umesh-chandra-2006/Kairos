import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app";

let app: Express | null = null;

export function getApp(): Express {
  if (!app) app = createApp();
  return app;
}

/** Registers a throwaway user and returns auth tokens + user body. */
export async function registerUser(email: string, name = "Test User") {
  const res = await request(getApp())
    .post("/api/auth/register")
    .send({ name, email, password: "Passw0rd!", device: "mobile" })
    .expect(200);
  const body = res.body as {
    accessToken: string;
    refreshToken: string;
    user: { id: number; email: string };
  };
  return body;
}

export function uniqueEmail(prefix = "user"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@test.dev`;
}
