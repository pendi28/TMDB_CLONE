import type {
  TmdbListResult, TmdbMovie, TmdbTvShow, TmdbSeason, TmdbFindResult,
} from "@/lib/types";

export type { TmdbListResult, TmdbMovie, TmdbTvShow, TmdbSeason, TmdbFindResult };

const KEY = import.meta.env.VITE_TMDB_KEY as string | undefined ?? "";
const BASE = "https://api.themoviedb.org/3";

export async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const qs = new URLSearchParams({ api_key: KEY, language: "id-ID" });
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
  const r = await fetch(`${BASE}${path}?${qs}`);
  if (!r.ok) throw new Error(`TMDB ${r.status}`);
  return r.json() as Promise<T>;
}

export const tmdb = {
  trending:     (type = "all", window = "week", page = 1) =>
    tmdbFetch<TmdbListResult>(`/trending/${type}/${window}`, { page }),
  popularMovies: (page = 1) => tmdbFetch<TmdbListResult>("/movie/popular", { page }),
  topMovies:     (page = 1) => tmdbFetch<TmdbListResult>("/movie/top_rated", { page }),
  nowPlaying:    (page = 1) => tmdbFetch<TmdbListResult>("/movie/now_playing", { page }),
  upcoming:      (page = 1) => tmdbFetch<TmdbListResult>("/movie/upcoming", { page }),
  popularTv:     (page = 1) => tmdbFetch<TmdbListResult>("/tv/popular", { page }),
  topTv:         (page = 1) => tmdbFetch<TmdbListResult>("/tv/top_rated", { page }),
  airingToday:   (page = 1) => tmdbFetch<TmdbListResult>("/tv/airing_today", { page }),
  onTv:          (page = 1) => tmdbFetch<TmdbListResult>("/tv/on_the_air", { page }),
  peoplePopular: (page = 1) => tmdbFetch<TmdbListResult>("/person/popular", { page }),
  movieDetail:   (id: number) =>
    tmdbFetch<TmdbMovie>(`/movie/${id}`, { append_to_response: "credits,similar,videos" }),
  tvDetail:      (id: number) =>
    tmdbFetch<TmdbTvShow>(`/tv/${id}`, { append_to_response: "credits,similar,seasons,videos" }),
  tvSeason:      (id: number, season: number) =>
    tmdbFetch<TmdbSeason>(`/tv/${id}/season/${season}`),
  search:        (query: string, page = 1) =>
    tmdbFetch<TmdbListResult>("/search/multi", { query, page }),
  findByImdb:    (imdbId: string) =>
    tmdbFetch<TmdbFindResult>(`/find/${imdbId}`, { external_source: "imdb_id" }),

  // ── Donghua (Animasi China) ──────────────────────────────────────
  donghua: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "zh",
      with_genres: 16, sort_by: "popularity.desc",
    }),
  donghuaNew: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "zh",
      with_genres: 16, sort_by: "first_air_date.desc",
      "first_air_date.gte": "2024-01-01", "vote_count.gte": 5,
    }),
  donghuaTopRated: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "zh",
      with_genres: 16, sort_by: "vote_average.desc", "vote_count.gte": 50,
    }),

  // ── Anime Jepang ────────────────────────────────────────────────
  anime: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "ja",
      with_genres: 16, sort_by: "popularity.desc",
    }),
  animeNew: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "ja",
      with_genres: 16, sort_by: "first_air_date.desc",
      "first_air_date.gte": "2024-01-01", "vote_count.gte": 5,
    }),
  animeTopRated: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "ja",
      with_genres: 16, sort_by: "vote_average.desc", "vote_count.gte": 100,
    }),

  // ── Drama Asia ──────────────────────────────────────────────────
  dramaKorea: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "ko",
      with_genres: 18, sort_by: "popularity.desc",
    }),
  dramaKoreaNew: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "ko",
      with_genres: 18, sort_by: "first_air_date.desc",
      "first_air_date.gte": "2024-01-01", "vote_count.gte": 5,
    }),
  dramaChina: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "zh",
      with_genres: 18, sort_by: "popularity.desc",
    }),
  dramaTaiwan: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "zh",
      sort_by: "popularity.desc", with_origin_country: "TW",
    }),
  dramaThailand: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "th",
      sort_by: "popularity.desc",
    }),
  dramaIndonesia: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "id",
      sort_by: "popularity.desc",
    }),
  dramaJapan: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "ja",
      with_genres: 18, sort_by: "popularity.desc",
    }),
  dramaPhilippines: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/tv", {
      page, with_original_language: "tl",
      sort_by: "popularity.desc",
    }),

  // ── Film Asia & Lokal ────────────────────────────────────────────
  filmKorea: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/movie", {
      page, with_original_language: "ko", sort_by: "popularity.desc",
    }),
  filmChina: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/movie", {
      page, with_original_language: "zh", sort_by: "popularity.desc",
    }),
  filmJepang: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/movie", {
      page, with_original_language: "ja", sort_by: "popularity.desc",
    }),
  filmThailand: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/movie", {
      page, with_original_language: "th", sort_by: "popularity.desc",
    }),
  bollywood: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/movie", {
      page, with_original_language: "hi", sort_by: "popularity.desc",
    }),
  filmIndonesia: (page = 1) =>
    tmdbFetch<TmdbListResult>("/discover/movie", {
      page, with_original_language: "id", sort_by: "popularity.desc",
    }),
};
