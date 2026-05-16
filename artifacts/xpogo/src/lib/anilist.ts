const API_BASE = "/api/anilist";

async function get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => qs.set(k, String(v)));
  const url = `${API_BASE}${path}${qs.toString() ? `?${qs}` : ""}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`AniList API ${r.status}`);
  return r.json() as Promise<T>;
}

export interface AniListMedia {
  id: number;
  title: { romaji: string; english: string | null; native: string };
  coverImage: { large: string; medium: string };
  bannerImage: string | null;
  description: string | null;
  genres: string[];
  averageScore: number | null;
  popularity: number;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  status: string;
  format: string;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  season: string | null;
  seasonYear: number | null;
  countryOfOrigin?: string;
  studios?: { nodes: { name: string }[] };
  nextAiringEpisode?: { episode: number; airingAt: number } | null;
  trailer?: { id: string; site: string } | null;
  relations?: {
    edges: {
      relationType: string;
      node: { id: number; title: { romaji: string; english: string | null }; coverImage: { medium: string }; type: string; format: string };
    }[];
  };
  characters?: {
    edges: {
      role: string;
      node: { id: number; name: { full: string }; image: { medium: string } };
      voiceActors?: { id: number; name: { full: string }; image: { medium: string } }[];
    }[];
  };
  recommendations?: {
    nodes: {
      mediaRecommendation: { id: number; title: { romaji: string; english: string | null }; coverImage: { large: string }; averageScore: number | null; type: string };
    }[];
  };
}

export interface AniListPage {
  Page: {
    pageInfo: { total: number; currentPage: number; lastPage: number; hasNextPage: boolean };
    media: AniListMedia[];
  };
}

export interface AniListDetail {
  Media: AniListMedia;
}

export const anilist = {
  trending:    (page = 1, type = "ANIME") => get<AniListPage>("/trending", { page, type }),
  popular:     (page = 1, type = "ANIME") => get<AniListPage>("/popular", { page, type }),
  topRated:    (page = 1, type = "ANIME") => get<AniListPage>("/top-rated", { page, type }),
  seasonal:    (page = 1)                 => get<AniListPage>("/seasonal", { page }),
  search:      (q: string, page = 1, type = "ANIME") => get<AniListPage>("/search", { q, page, type }),
  animeDetail: (id: number)               => get<AniListDetail>(`/anime/${id}`),
  mangaDetail: (id: number)               => get<AniListDetail>(`/manga/${id}`),
  mangaPopular:(page = 1)                 => get<AniListPage>("/manga/popular", { page }),
};
