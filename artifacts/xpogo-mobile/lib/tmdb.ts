import Constants from "expo-constants";

const KEY =
  (Constants.expoConfig?.extra?.tmdbKey as string) ||
  process.env.EXPO_PUBLIC_TMDB_KEY ||
  "";
const BASE = "https://api.themoviedb.org/3";

export async function tmdbFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams({ api_key: KEY, language: "id-ID" });
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
  const r = await fetch(`${BASE}${path}?${qs}`);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json();
}

export const tmdb = {
  // ── Trending (anime & donghua) ───────────────────────────────────
  trendingAnime: (window: "day" | "week" = "week", page = 1) =>
    tmdbFetch<any>("/trending/tv/" + window, { page }),

  // ── Donghua (Animasi China) ──────────────────────────────────────
  donghua: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 16, with_original_language: "zh",
      sort_by: "popularity.desc", page,
    }),
  donghuaNew: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 16, with_original_language: "zh",
      sort_by: "first_air_date.desc",
      "first_air_date.gte": "2024-01-01",
      "vote_count.gte": 5, page,
    }),
  donghuaTopRated: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 16, with_original_language: "zh",
      sort_by: "vote_average.desc", "vote_count.gte": 50, page,
    }),
  donghuaAiring: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 16, with_original_language: "zh",
      sort_by: "popularity.desc", with_status: "0", page,
    }),

  // ── Anime Jepang ─────────────────────────────────────────────────
  anime: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 16, with_original_language: "ja",
      sort_by: "popularity.desc", page,
    }),
  animeNew: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 16, with_original_language: "ja",
      sort_by: "first_air_date.desc",
      "first_air_date.gte": "2024-01-01",
      "vote_count.gte": 5, page,
    }),
  animeTopRated: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 16, with_original_language: "ja",
      sort_by: "vote_average.desc", "vote_count.gte": 100, page,
    }),

  // ── Search & Detail ──────────────────────────────────────────────
  search: (query: string, page = 1) =>
    tmdbFetch<any>("/search/multi", { query, page }),
  tvDetail: (id: number) =>
    tmdbFetch<any>(`/tv/${id}`, { append_to_response: "credits,similar,seasons,videos" }),
  findByImdb: (imdbId: string) =>
    tmdbFetch<any>(`/find/${imdbId}`, { external_source: "imdb_id" }),
};
