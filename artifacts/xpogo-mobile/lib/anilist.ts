const ANILIST_API = "https://graphql.anilist.co";

export interface AniItem {
  id: number;
  title: { romaji: string; english?: string; native?: string };
  coverImage: { large: string; medium: string };
  bannerImage?: string;
  description?: string;
  genres: string[];
  averageScore?: number;
  popularity?: number;
  episodes?: number;
  status?: string;
  format?: string;
  season?: string;
  seasonYear?: number;
  startDate?: { year?: number; month?: number; day?: number };
  nextAiringEpisode?: { episode: number; airingAt: number };
  countryOfOrigin?: string;
}

const FIELDS = `
  id
  title { romaji english native }
  coverImage { large medium }
  bannerImage
  description(asHtml: false)
  genres
  averageScore
  popularity
  episodes
  status
  format
  season
  seasonYear
  startDate { year month day }
  countryOfOrigin
  nextAiringEpisode { episode airingAt }
`;

async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = await res.json() as { data: T; errors?: unknown[] };
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

export const anilist = {
  // Trending anime (semua negara)
  trending: (page = 1) =>
    gql<any>(`
      query($page: Int) {
        Page(page: $page, perPage: 20) {
          media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { ${FIELDS} }
        }
      }
    `, { page }),

  // Anime musim sekarang
  seasonal: (page = 1) => {
    const m = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const season = m <= 3 ? "WINTER" : m <= 6 ? "SPRING" : m <= 9 ? "SUMMER" : "FALL";
    return gql<any>(`
      query($page: Int, $season: MediaSeason, $year: Int) {
        Page(page: $page, perPage: 20) {
          media(sort: POPULARITY_DESC, type: ANIME, season: $season, seasonYear: $year, isAdult: false) { ${FIELDS} }
        }
      }
    `, { page, season, year });
  },

  // Top rating semua waktu
  topRated: (page = 1) =>
    gql<any>(`
      query($page: Int) {
        Page(page: $page, perPage: 20) {
          media(sort: SCORE_DESC, type: ANIME, isAdult: false, averageScore_greater: 75) { ${FIELDS} }
        }
      }
    `, { page }),

  // Populer semua waktu
  popular: (page = 1) =>
    gql<any>(`
      query($page: Int) {
        Page(page: $page, perPage: 20) {
          media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ${FIELDS} }
        }
      }
    `, { page }),

  // Donghua (China) dari AniList
  donghua: (page = 1) =>
    gql<any>(`
      query($page: Int) {
        Page(page: $page, perPage: 20) {
          media(sort: POPULARITY_DESC, type: ANIME, isAdult: false, countryOfOrigin: "CN") { ${FIELDS} }
        }
      }
    `, { page }),

  // Donghua terbaru
  donghuaNew: (page = 1) =>
    gql<any>(`
      query($page: Int) {
        Page(page: $page, perPage: 20) {
          media(sort: START_DATE_DESC, type: ANIME, isAdult: false, countryOfOrigin: "CN", averageScore_greater: 1) { ${FIELDS} }
        }
      }
    `, { page }),

  // Anime yang sedang tayang
  airing: (page = 1) =>
    gql<any>(`
      query($page: Int) {
        Page(page: $page, perPage: 20) {
          media(sort: POPULARITY_DESC, type: ANIME, status: RELEASING, isAdult: false) { ${FIELDS} }
        }
      }
    `, { page }),

  // Cari
  search: (query: string, page = 1) =>
    gql<any>(`
      query($search: String, $page: Int) {
        Page(page: $page, perPage: 20) {
          media(search: $search, type: ANIME, isAdult: false) { ${FIELDS} }
        }
      }
    `, { search: query, page }),

  // Detail
  detail: (id: number) =>
    gql<any>(`
      query($id: Int) {
        Media(id: $id, type: ANIME) {
          ${FIELDS}
          relations {
            edges {
              relationType
              node { id title { romaji english } coverImage { medium } type format }
            }
          }
          characters(sort: ROLE, perPage: 10) {
            edges {
              role
              node { id name { full } image { medium } }
              voiceActors(language: JAPANESE) { id name { full } image { medium } }
            }
          }
          recommendations(sort: RATING_DESC, perPage: 8) {
            nodes {
              mediaRecommendation { id title { romaji english } coverImage { large } averageScore }
            }
          }
        }
      }
    `, { id }),
};
