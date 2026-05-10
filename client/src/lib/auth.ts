// Simple JWT-based authentication

export function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

export function setToken(token: string): void {
  localStorage.setItem("auth_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("auth_token");
  window.dispatchEvent(new Event("logout"));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function login(email: string, password: string): Promise<{ token: string }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || "Login failed");
  }

  const token = data.token;
  if (!token) throw new Error("No token returned from server");
  setToken(token);
  return { token };
}
