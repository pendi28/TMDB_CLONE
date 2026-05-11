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
  trending:      (type = "all", window = "week", page = 1) =>
    tmdbFetch<any>(`/trending/${type}/${window}`, { page }),
  popularMovies: (page = 1) => tmdbFetch<any>("/movie/popular", { page }),
  popularTv:     (page = 1) => tmdbFetch<any>("/tv/popular",    { page }),
  topMovies:     (page = 1) => tmdbFetch<any>("/movie/top_rated", { page }),
  topTv:         (page = 1) => tmdbFetch<any>("/tv/top_rated",   { page }),
  movieDetail:   (id: number) => tmdbFetch<any>(`/movie/${id}`, { append_to_response: "credits,similar,videos" }),
  tvDetail:      (id: number) => tmdbFetch<any>(`/tv/${id}`,    { append_to_response: "credits,similar,seasons,videos" }),
  tvSeason:      (id: number, season: number) => tmdbFetch<any>(`/tv/${id}/season/${season}`),
  search:        (query: string, page = 1) => tmdbFetch<any>("/search/multi", { query, page }),
  find:          (query: string, type: "movie" | "series" = "movie") =>
    tmdbFetch<any>(`/search/${type === "series" ? "tv" : "movie"}`, { query }),
  findByImdb:    (imdbId: string) =>
    tmdbFetch<any>(`/find/${imdbId}`, { external_source: "imdb_id" }),
  discover:      (type: "movie" | "tv", genreId: number, page = 1) =>
    tmdbFetch<any>(`/discover/${type}`, { with_genres: genreId, page, sort_by: "popularity.desc" }),

  // ── Kategori Khusus ────────────────────────────────────────────────
  // Donghua: Animasi (genre 16) dari China (bahasa zh)
  donghua: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 16,
      with_original_language: "zh",
      sort_by: "popularity.desc",
      page,
    }),

  // Anime: Animasi (genre 16) dari Jepang (bahasa ja)
  anime: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 16,
      with_original_language: "ja",
      sort_by: "popularity.desc",
      page,
    }),

  // Drama Korea: Drama (genre 18) dari Korea (bahasa ko)
  dramaKorea: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 18,
      with_original_language: "ko",
      sort_by: "popularity.desc",
      page,
    }),

  // Drama China: Drama (genre 18) dari China (bahasa zh)
  dramaChina: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 18,
      with_original_language: "zh",
      sort_by: "popularity.desc",
      page,
    }),
};
