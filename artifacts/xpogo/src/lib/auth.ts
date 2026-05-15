const TOKEN_KEY = "xpogo_admin_token";
const WRITE_KEY = "xpogo_write_token";

/* ── login-state (hash) persisted across tabs ── */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
export function isLoggedIn(): boolean {
  return !!getToken();
}

/* ── write-token (Firebase DB Secret) stored in sessionStorage only ──
   Entered at login time. Cleared when tab/session closes.
   Never included in the JS bundle — no build-time secret needed. */
export function getWriteToken(): string {
  return sessionStorage.getItem(WRITE_KEY) ?? "";
}
export function setWriteToken(token: string): void {
  sessionStorage.setItem(WRITE_KEY, token);
}
export function clearWriteToken(): void {
  sessionStorage.removeItem(WRITE_KEY);
}
