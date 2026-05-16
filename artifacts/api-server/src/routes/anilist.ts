import { Router } from "express";

const router = Router();
const ANILIST_API = "https://graphql.anilist.co";

async function anilist(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList request failed: ${res.status}`);
  const json = await res.json() as { data: unknown; errors?: unknown[] };
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const ANIME_FIELDS = `
  id title { romaji english native }
  coverImage { large medium }
  bannerImage
  description(asHtml: false)
  genres averageScore popularity episodes status format
  startDate { year month day }
  endDate { year month day }
  season seasonYear
  studios(isMain: true) { nodes { name } }
  nextAiringEpisode { episode airingAt }
  trailer { id site }
`;

const MANGA_FIELDS = `
  id title { romaji english native }
  coverImage { large medium }
  bannerImage
  description(asHtml: false)
  genres averageScore popularity chapters volumes status format
  startDate { year month day }
  countryOfOrigin
`;

router.get("/anilist/trending", async (req, res) => {
  try {
    const { page = "1", type = "ANIME" } = req.query as Record<string, string>;
    const data = await anilist(`
      query ($page: Int, $type: MediaType) {
        Page(page: $page, perPage: 20) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(sort: TRENDING_DESC, type: $type, isAdult: false) { ${ANIME_FIELDS} }
        }
      }
    `, { page: Number(page), type });
    res.json(data);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/anilist/popular", async (req, res) => {
  try {
    const { page = "1", type = "ANIME" } = req.query as Record<string, string>;
    const data = await anilist(`
      query ($page: Int, $type: MediaType) {
        Page(page: $page, perPage: 20) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(sort: POPULARITY_DESC, type: $type, isAdult: false) { ${ANIME_FIELDS} }
        }
      }
    `, { page: Number(page), type });
    res.json(data);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/anilist/top-rated", async (req, res) => {
  try {
    const { page = "1", type = "ANIME" } = req.query as Record<string, string>;
    const data = await anilist(`
      query ($page: Int, $type: MediaType) {
        Page(page: $page, perPage: 20) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(sort: SCORE_DESC, type: $type, isAdult: false, averageScore_greater: 70) { ${ANIME_FIELDS} }
        }
      }
    `, { page: Number(page), type });
    res.json(data);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/anilist/seasonal", async (req, res) => {
  try {
    const { page = "1" } = req.query as Record<string, string>;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const season = month <= 3 ? "WINTER" : month <= 6 ? "SPRING" : month <= 9 ? "SUMMER" : "FALL";
    const data = await anilist(`
      query ($page: Int, $season: MediaSeason, $year: Int) {
        Page(page: $page, perPage: 20) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(sort: POPULARITY_DESC, type: ANIME, season: $season, seasonYear: $year, isAdult: false) { ${ANIME_FIELDS} }
        }
      }
    `, { page: Number(page), season, year });
    res.json(data);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/anilist/search", async (req, res) => {
  try {
    const { q = "", page = "1", type = "ANIME" } = req.query as Record<string, string>;
    const data = await anilist(`
      query ($search: String, $page: Int, $type: MediaType) {
        Page(page: $page, perPage: 20) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(search: $search, type: $type, isAdult: false) { ${type === "MANGA" ? MANGA_FIELDS : ANIME_FIELDS} }
        }
      }
    `, { search: q, page: Number(page), type });
    res.json(data);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/anilist/anime/:id", async (req, res) => {
  try {
    const data = await anilist(`
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${ANIME_FIELDS}
          relations {
            edges {
              relationType
              node { id title { romaji english } coverImage { medium } type format }
            }
          }
          characters(sort: ROLE, perPage: 12) {
            edges {
              role
              node { id name { full } image { medium } }
              voiceActors(language: JAPANESE) { id name { full } image { medium } }
            }
          }
          recommendations(sort: RATING_DESC, perPage: 8) {
            nodes {
              mediaRecommendation { id title { romaji english } coverImage { large } averageScore type }
            }
          }
        }
      }
    `, { id: Number(req.params.id) });
    res.json(data);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/anilist/manga/:id", async (req, res) => {
  try {
    const data = await anilist(`
      query ($id: Int) {
        Media(id: $id, type: MANGA) {
          ${MANGA_FIELDS}
          characters(sort: ROLE, perPage: 10) {
            edges {
              role
              node { id name { full } image { medium } }
            }
          }
          recommendations(sort: RATING_DESC, perPage: 8) {
            nodes {
              mediaRecommendation { id title { romaji english } coverImage { large } averageScore type }
            }
          }
        }
      }
    `, { id: Number(req.params.id) });
    res.json(data);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/anilist/manga/popular", async (req, res) => {
  try {
    const { page = "1" } = req.query as Record<string, string>;
    const data = await anilist(`
      query ($page: Int) {
        Page(page: $page, perPage: 20) {
          pageInfo { total currentPage lastPage hasNextPage }
          media(sort: POPULARITY_DESC, type: MANGA, isAdult: false) { ${MANGA_FIELDS} }
        }
      }
    `, { page: Number(page) });
    res.json(data);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

export default router;
