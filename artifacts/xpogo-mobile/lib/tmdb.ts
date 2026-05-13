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
  nowPlaying:    (page = 1) => tmdbFetch<any>("/movie/now_playing", { page }),
  upcoming:      (page = 1) => tmdbFetch<any>("/movie/upcoming", { page }),
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
  donghuaAiring: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 16, with_original_language: "zh",
      sort_by: "popularity.desc", with_status: "0", page,
    }),
  donghuaTopRated: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 16, with_original_language: "zh",
      sort_by: "vote_average.desc", "vote_count.gte": 50, page,
    }),

  // ── Anime Jepang ────────────────────────────────────────────────
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

  // ── Drama Asia ──────────────────────────────────────────────────
  dramaKorea: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 18, with_original_language: "ko",
      sort_by: "popularity.desc", page,
    }),
  dramaKoreaNew: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 18, with_original_language: "ko",
      sort_by: "first_air_date.desc",
      "first_air_date.gte": "2024-01-01",
      "vote_count.gte": 5, page,
    }),
  dramaChina: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 18, with_original_language: "zh",
      sort_by: "popularity.desc", page,
    }),
  dramaTaiwan: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_original_language: "zh",
      sort_by: "popularity.desc",
      with_origin_country: "TW", page,
    }),
  dramaThailand: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_original_language: "th",
      sort_by: "popularity.desc", page,
    }),
  dramaIndonesia: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_original_language: "id",
      sort_by: "popularity.desc", page,
    }),
  dramaJapan: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_genres: 18, with_original_language: "ja",
      sort_by: "popularity.desc", page,
    }),
  dramaPhilippines: (page = 1) =>
    tmdbFetch<any>("/discover/tv", {
      with_original_language: "tl",
      sort_by: "popularity.desc", page,
    }),

  // ── Film Asia ───────────────────────────────────────────────────
  filmKorea: (page = 1) =>
    tmdbFetch<any>("/discover/movie", {
      with_original_language: "ko",
      sort_by: "popularity.desc", page,
    }),
  filmChina: (page = 1) =>
    tmdbFetch<any>("/discover/movie", {
      with_original_language: "zh",
      sort_by: "popularity.desc", page,
    }),
  filmJepang: (page = 1) =>
    tmdbFetch<any>("/discover/movie", {
      with_original_language: "ja",
      sort_by: "popularity.desc", page,
    }),
  filmThailand: (page = 1) =>
    tmdbFetch<any>("/discover/movie", {
      with_original_language: "th",
      sort_by: "popularity.desc", page,
    }),
  bollywood: (page = 1) =>
    tmdbFetch<any>("/discover/movie", {
      with_original_language: "hi",
      sort_by: "popularity.desc", page,
    }),
  filmIndonesia: (page = 1) =>
    tmdbFetch<any>("/discover/movie", {
      with_original_language: "id",
      sort_by: "popularity.desc", page,
    }),
};
