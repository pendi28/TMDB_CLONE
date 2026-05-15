/**
 * Firebase Realtime Database REST helper.
 * Write operations use the DB Secret entered at admin login (stored in sessionStorage).
 * No build-time secrets required — works standalone outside Replit.
 */

import { getWriteToken } from "@/lib/auth";
import type {
  Settings, Ad, Embed, CustomMovie, SeriesEpisode, CustomServer, BuiltinServerState,
  TmdbListResult, TmdbMovie, TmdbTvShow, TmdbSeason, TmdbFindResult, TmdbSyncItem, TmdbSyncStatus,
} from "@/lib/types";

export type { Settings, Ad, Embed, CustomMovie, SeriesEpisode, CustomServer, BuiltinServerState };

const DB = "https://apps-tmdb-default-rtdb.asia-southeast1.firebasedatabase.app";

function getSecret(): string {
  return getWriteToken() || (import.meta.env.VITE_FIREBASE_SECRET as string | undefined) || "";
}

function authUrl(path: string): string {
  const secret = getSecret();
  if (!secret) throw new Error("Firebase write token belum diset. Silakan logout dan login ulang, lalu masukkan Firebase DB Secret.");
  return `${DB}/${path}.json?auth=${secret}`;
}

export async function fbGet<T>(path: string): Promise<T | null> {
  const r = await fetch(`${DB}/${path}.json`);
  return r.ok ? (r.json() as Promise<T>) : null;
}

export async function fbSet(path: string, data: unknown): Promise<void> {
  const r = await fetch(authUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(`Firebase write gagal (${r.status}): ${JSON.stringify(err)}`);
  }
}

export async function fbPush(path: string, data: unknown): Promise<string> {
  const r = await fetch(authUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(`Firebase push gagal (${r.status}): ${JSON.stringify(err)}`);
  }
  const j = (await r.json()) as { name: string };
  return j.name;
}

export async function fbPatch(path: string, data: unknown): Promise<void> {
  const r = await fetch(authUrl(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(`Firebase patch gagal (${r.status}): ${JSON.stringify(err)}`);
  }
}

export async function fbDelete(path: string): Promise<void> {
  const r = await fetch(authUrl(path), { method: "DELETE" });
  if (!r.ok) throw new Error(`Firebase delete gagal (${r.status})`);
}

function objToArr<T extends { id?: string }>(obj: Record<string, T> | null): T[] {
  if (!obj) return [];
  return Object.entries(obj).map(([id, v]) => ({ ...v, id }));
}

export async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ── Layout types ─────────────────────────────────────────── */

/** A single placed section in a layout */
export interface LayoutSection {
  id: string;
  enabled: boolean;
  order: number;
  config?: {
    title?: string;
    showMore?: boolean;
    itemCount?: number;
    bgColor?: string;
  };
}

/** Navigation link (web navbar) */
export interface NavLink {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
}

/** Full web layout configuration */
export interface WebLayoutConfig {
  sections: LayoutSection[];
  heroStyle: "full" | "compact" | "minimal";
  posterSize: "small" | "medium" | "large";
  showNavSearch: boolean;
  navLinks: NavLink[];
  footerText: string;
  primaryColor?: string;
}

/** Full APK layout configuration */
export interface ApkLayoutConfig {
  sections: LayoutSection[];
  posterSize: "small" | "medium" | "large";
  primaryColor?: string;
  showBottomNav: boolean;
  bottomNavStyle: "standard" | "floating" | "minimal";
}

/**
 * Top-level layout config stored at Firebase `layout/`.
 * Supports both new (web/apk split) and legacy (rows[]) formats.
 */
export interface LayoutConfig {
  web?: WebLayoutConfig;
  apk?: ApkLayoutConfig;
  /* legacy fields — kept for backward compat */
  heroStyle?: "full" | "compact" | "minimal";
  showHero?: boolean;
  showNavSearch?: boolean;
  rows?: LayoutRow[];
  navLinks?: NavLink[];
  footerText?: string;
  posterSize?: "small" | "medium" | "large";
}

/** Legacy row type */
export interface LayoutRow {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

/* ── Firebase helpers ────────────────────────────────────── */

export const fb = {
  getSettings: () => fbGet<Settings>("settings"),
  setSettings: (d: Partial<Settings>) => fbSet("settings", d),

  getEmbeds:   async (): Promise<Embed[]> => objToArr(await fbGet<Record<string, Embed>>("embeds")),
  addEmbed:    (d: Omit<Embed, "id">) => fbPush("embeds", d),
  updateEmbed: (id: string, d: Partial<Embed>) => fbPatch(`embeds/${id}`, d),
  deleteEmbed: (id: string) => fbDelete(`embeds/${id}`),

  getAds:    async (): Promise<Ad[]> => objToArr(await fbGet<Record<string, Ad>>("ads")),
  addAd:     (d: Omit<Ad, "id">) => fbPush("ads", d),
  updateAd:  (id: string, d: Partial<Ad>) => fbPatch(`ads/${id}`, d),
  deleteAd:  (id: string) => fbDelete(`ads/${id}`),

  getCustomMovies:   async (): Promise<CustomMovie[]> => objToArr(await fbGet<Record<string, CustomMovie>>("custom_movies")),
  addCustomMovie:    (d: Omit<CustomMovie, "id">) => fbPush("custom_movies", d),
  updateCustomMovie: (id: string, d: Partial<CustomMovie>) => fbPatch(`custom_movies/${id}`, d),
  deleteCustomMovie: (id: string) => fbDelete(`custom_movies/${id}`),

  getSeriesEpisodes: async (): Promise<SeriesEpisode[]> =>
    objToArr(await fbGet<Record<string, SeriesEpisode>>("series_episodes")),
  getEpisodesForSeries: async (tmdbId: number): Promise<SeriesEpisode[]> => {
    const all = objToArr(await fbGet<Record<string, SeriesEpisode>>("series_episodes"));
    return all.filter((e) => e.tmdbId === tmdbId && e.active);
  },
  addSeriesEpisode:    (d: Omit<SeriesEpisode, "id">) => fbPush("series_episodes", d),
  updateSeriesEpisode: (id: string, d: Partial<SeriesEpisode>) => fbPatch(`series_episodes/${id}`, d),
  deleteSeriesEpisode: (id: string) => fbDelete(`series_episodes/${id}`),

  getCustomServers: async (): Promise<CustomServer[]> =>
    objToArr(await fbGet<Record<string, CustomServer>>("custom_servers")),
  addCustomServer:    (d: Omit<CustomServer, "id">) => fbPush("custom_servers", d),
  updateCustomServer: (id: string, d: Partial<CustomServer>) => fbPatch(`custom_servers/${id}`, d),
  deleteCustomServer: (id: string) => fbDelete(`custom_servers/${id}`),

  getBuiltinServerStates: () => fbGet<BuiltinServerState>("builtin_server_states"),
  setBuiltinServerState: (id: string, active: boolean) =>
    fbSet(`builtin_server_states/${id}`, active),

  getPasswordHash: () => fbGet<string>("admin/passwordHash"),
  setPasswordHash: (hash: string) => fbSet("admin/passwordHash", hash),

  getTmdbSyncStatus: () => fbGet<TmdbSyncStatus>("tmdb_sync_status"),
  getTmdbSyncItems: async (): Promise<TmdbSyncItem[]> => {
    const raw = await fbGet<Record<string, TmdbSyncItem>>("tmdb_sync");
    return raw ? Object.values(raw) : [];
  },

  getLayout: () => fbGet<LayoutConfig>("layout"),
  setLayout: (d: LayoutConfig) => fbSet("layout", d),
};

export type { TmdbListResult, TmdbMovie, TmdbTvShow, TmdbSeason, TmdbFindResult, TmdbSyncItem, TmdbSyncStatus };
