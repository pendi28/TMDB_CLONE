import { Router } from "express";
import { db, mediaTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

const TMDB_KEY  = process.env.TMDB_API_KEY ?? "";
const TMDB_BASE = "https://api.themoviedb.org/3";
const ANILIST_API = "https://graphql.anilist.co";

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // setiap 6 jam

// ── TMDB helper ───────────────────────────────────────────────────────────────

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("language", "id-ID");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`);
  return res.json() as Promise<{ results?: any[] }>;
}

// ── AniList helper ────────────────────────────────────────────────────────────

const ANIME_FIELDS = `
  id title { romaji english native }
  coverImage { large }
  bannerImage
  description(asHtml: false)
  genres averageScore popularity episodes status format
  season seasonYear countryOfOrigin
`;

async function anilistFetch(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList → ${res.status}`);
  const json = await res.json() as { data: any; errors?: unknown[] };
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// ── Fetch all data ────────────────────────────────────────────────────────────

async function fetchTmdbAnimeAndDonghua() {
  const endpoints = [
    // Anime Jepang
    { path: "/discover/tv", params: { with_genres: "16", with_original_language: "ja", sort_by: "popularity.desc" }, type: "anime" },
    { path: "/discover/tv", params: { with_genres: "16", with_original_language: "ja", sort_by: "first_air_date.desc", "first_air_date.gte": "2024-01-01", "vote_count.gte": "5" }, type: "anime" },
    { path: "/discover/tv", params: { with_genres: "16", with_original_language: "ja", sort_by: "vote_average.desc", "vote_count.gte": "100" }, type: "anime" },
    // Donghua (China)
    { path: "/discover/tv", params: { with_genres: "16", with_original_language: "zh", sort_by: "popularity.desc" }, type: "donghua" },
    { path: "/discover/tv", params: { with_genres: "16", with_original_language: "zh", sort_by: "first_air_date.desc", "first_air_date.gte": "2024-01-01", "vote_count.gte": "5" }, type: "donghua" },
    { path: "/discover/tv", params: { with_genres: "16", with_original_language: "zh", sort_by: "vote_average.desc", "vote_count.gte": "50" }, type: "donghua" },
  ];

  const seen = new Set<string>();
  const items: any[] = [];

  const results = await Promise.allSettled(
    endpoints.map(e => tmdbFetch(e.path, e.params).then(d => ({ results: d.results ?? [], type: e.type })))
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    if (r.status === "rejected") {
      logger.warn({ err: r.reason }, `TMDB endpoint failed: ${endpoints[i]!.path}`);
      continue;
    }
    for (const item of r.value.results) {
      const key = `tmdb:${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ...item, _mediaType: r.value.type });
    }
  }

  return items;
}

async function fetchAnilistData() {
  const now  = new Date();
  const m    = now.getMonth() + 1;
  const year = now.getFullYear();
  const season = m <= 3 ? "WINTER" : m <= 6 ? "SPRING" : m <= 9 ? "SUMMER" : "FALL";

  const queries = [
    { label: "trending",   vars: { sort: "TRENDING_DESC", country: null },   isAiring: false },
    { label: "popular",    vars: { sort: "POPULARITY_DESC", country: null },  isAiring: false },
    { label: "topRated",   vars: { sort: "SCORE_DESC", country: null },       isAiring: false },
    { label: "airing",     vars: { sort: "POPULARITY_DESC", country: null },  isAiring: true  },
    { label: "donghua",    vars: { sort: "POPULARITY_DESC", country: "CN" },  isAiring: false },
    { label: "donghuaNew", vars: { sort: "START_DATE_DESC", country: "CN" },  isAiring: false },
  ];

  const gqlBase = (country: string | null, status: string | null, sort: string) => `
    query($page: Int) {
      Page(page: $page, perPage: 30) {
        media(
          sort: ${sort},
          type: ANIME,
          isAdult: false
          ${country ? `, countryOfOrigin: "${country}"` : ""}
          ${status  ? `, status: ${status}` : ""}
        ) { ${ANIME_FIELDS} }
      }
    }
  `;

  const seen = new Set<number>();
  const items: any[] = [];

  const results = await Promise.allSettled(
    queries.map(q => {
      const status = q.isAiring ? "RELEASING" : null;
      return anilistFetch(gqlBase(q.vars.country, status, q.vars.sort), { page: 1 })
        .then(d => ({ media: d?.Page?.media ?? [], isAiring: q.isAiring, country: q.vars.country }));
    })
  );

  for (const r of results) {
    if (r.status === "rejected") { logger.warn({ err: r.reason }, "AniList fetch failed"); continue; }
    for (const item of r.value.media) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push({ ...item, _isAiring: r.value.isAiring });
    }
  }

  // Also fetch seasonal
  try {
    const seasonal = await anilistFetch(`
      query($page: Int, $season: MediaSeason, $year: Int) {
        Page(page: $page, perPage: 30) {
          media(sort: POPULARITY_DESC, type: ANIME, season: $season, seasonYear: $year, isAdult: false) { ${ANIME_FIELDS} }
        }
      }
    `, { page: 1, season, year });
    for (const item of seasonal?.Page?.media ?? []) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push({ ...item, _isAiring: true });
    }
  } catch (e) {
    logger.warn({ err: e }, "AniList seasonal fetch failed");
  }

  return items;
}

// ── Upsert to PostgreSQL ──────────────────────────────────────────────────────

async function upsertTmdbItems(items: any[]): Promise<number> {
  if (!items.length) return 0;

  const rows = items.map(item => ({
    source:           "tmdb" as const,
    sourceId:         item.id,
    mediaType:        item._mediaType as "anime" | "donghua",
    title:            item.name ?? item.title ?? "",
    posterUrl:        item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    backdropUrl:      item.backdrop_path ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}` : null,
    overview:         item.overview ?? null,
    score:            item.vote_average != null ? String(item.vote_average) : null,
    popularity:       Math.round(item.popularity ?? 0),
    genres:           JSON.stringify(item.genre_ids ?? []),
    originalLanguage: item.original_language ?? null,
    countryOfOrigin:  item.original_language === "zh" ? "CN" : "JP",
    status:           item.status ?? null,
    episodes:         null,
    season:           null,
    seasonYear:       null,
    format:           null,
    isAiring:         0 as const,
    updatedAt:        new Date(),
  }));

  const batchSize = 50;
  let count = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db.insert(mediaTable).values(batch).onConflictDoUpdate({
      target: [mediaTable.source, mediaTable.sourceId],
      set: {
        title:            sql`excluded.title`,
        posterUrl:        sql`excluded.poster_url`,
        backdropUrl:      sql`excluded.backdrop_url`,
        overview:         sql`excluded.overview`,
        score:            sql`excluded.score`,
        popularity:       sql`excluded.popularity`,
        genres:           sql`excluded.genres`,
        isAiring:         sql`excluded.is_airing`,
        updatedAt:        sql`now()`,
      },
    });
    count += batch.length;
  }
  return count;
}

async function upsertAnilistItems(items: any[]): Promise<number> {
  if (!items.length) return 0;

  const rows = items.map(item => {
    const isCN = item.countryOfOrigin === "CN" || item.countryOfOrigin === "TW";
    return {
      source:           "anilist" as const,
      sourceId:         item.id,
      mediaType:        (isCN ? "donghua" : "anime") as "anime" | "donghua",
      title:            item.title?.english ?? item.title?.romaji ?? "",
      titleRomaji:      item.title?.romaji ?? null,
      titleNative:      item.title?.native ?? null,
      posterUrl:        item.coverImage?.large ?? null,
      backdropUrl:      item.bannerImage ?? null,
      overview:         item.description?.replace(/<[^>]*>/g, "") ?? null,
      score:            item.averageScore != null ? String(item.averageScore / 10) : null,
      popularity:       item.popularity ?? null,
      genres:           JSON.stringify(item.genres ?? []),
      originalLanguage: isCN ? "zh" : "ja",
      countryOfOrigin:  item.countryOfOrigin ?? (isCN ? "CN" : "JP"),
      status:           item.status ?? null,
      episodes:         item.episodes ?? null,
      season:           item.season ?? null,
      seasonYear:       item.seasonYear ?? null,
      format:           item.format ?? null,
      isAiring:         item._isAiring ? 1 : 0,
      updatedAt:        new Date(),
    };
  });

  const batchSize = 50;
  let count = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await db.insert(mediaTable).values(batch).onConflictDoUpdate({
      target: [mediaTable.source, mediaTable.sourceId],
      set: {
        title:        sql`excluded.title`,
        titleRomaji:  sql`excluded.title_romaji`,
        titleNative:  sql`excluded.title_native`,
        posterUrl:    sql`excluded.poster_url`,
        backdropUrl:  sql`excluded.backdrop_url`,
        overview:     sql`excluded.overview`,
        score:        sql`excluded.score`,
        popularity:   sql`excluded.popularity`,
        genres:       sql`excluded.genres`,
        status:       sql`excluded.status`,
        episodes:     sql`excluded.episodes`,
        season:       sql`excluded.season`,
        seasonYear:   sql`excluded.season_year`,
        isAiring:     sql`excluded.is_airing`,
        updatedAt:    sql`now()`,
      },
    });
    count += batch.length;
  }
  return count;
}

// ── Main sync ─────────────────────────────────────────────────────────────────

let lastSyncStatus: Record<string, unknown> = { status: "never_synced" };

export async function runSync(): Promise<Record<string, unknown>> {
  logger.info("Sync started: TMDB + AniList → PostgreSQL");
  const startedAt = Date.now();

  const [tmdbItems, anilistItems] = await Promise.allSettled([
    fetchTmdbAnimeAndDonghua(),
    fetchAnilistData(),
  ]);

  const tmdbData    = tmdbItems.status    === "fulfilled" ? tmdbItems.value    : [];
  const anilistData = anilistItems.status === "fulfilled" ? anilistItems.value : [];

  if (tmdbItems.status    === "rejected") logger.error({ err: tmdbItems.reason },    "TMDB fetch error");
  if (anilistItems.status === "rejected") logger.error({ err: anilistItems.reason }, "AniList fetch error");

  const [tmdbCount, anilistCount] = await Promise.all([
    upsertTmdbItems(tmdbData),
    upsertAnilistItems(anilistData),
  ]);

  const duration = Date.now() - startedAt;

  lastSyncStatus = {
    status:       "ok",
    lastSyncAt:   new Date().toISOString(),
    durationMs:   duration,
    tmdbUpserted: tmdbCount,
    anilistUpserted: anilistCount,
    total:        tmdbCount + anilistCount,
  };

  logger.info(lastSyncStatus, "Sync complete");
  return lastSyncStatus;
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

let schedulerStarted = false;

export function startSyncScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // Jalankan pertama kali setelah 15 detik server start
  setTimeout(() => {
    runSync().catch((e: unknown) => logger.error({ err: e }, "Initial sync failed"));
  }, 15_000);

  // Ulangi setiap 6 jam
  setInterval(() => {
    runSync().catch((e: unknown) => logger.error({ err: e }, "Scheduled sync failed"));
  }, SYNC_INTERVAL_MS);

  logger.info(`Sync scheduler started — interval: ${SYNC_INTERVAL_MS / 3_600_000}h`);
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/sync/status
router.get("/sync/status", (_req, res) => {
  res.json(lastSyncStatus);
});

// POST /api/sync/run — trigger manual (background)
router.post("/sync/run", requireAuth, (_req, res) => {
  runSync().catch((e: unknown) => logger.error({ err: e }, "Manual sync error"));
  res.json({ message: "Sync berjalan di background. Pantau di GET /api/sync/status" });
});

// POST /api/sync/run-now — trigger manual (await)
router.post("/sync/run-now", requireAuth, async (_req, res) => {
  try {
    const result = await runSync();
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
