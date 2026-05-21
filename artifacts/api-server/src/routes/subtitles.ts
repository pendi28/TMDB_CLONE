import { Router } from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import AdmZip from "adm-zip";
import { Readable } from "stream";

const router = Router();

const SITE = "https://www.opensubtitles.org";

const LANG_MAP: Record<string, string> = {
  en: "eng", id: "ind", ms: "may", es: "spa", fr: "fre",
  de: "ger", it: "ita", pt: "por", ru: "rus", zh: "chi",
  zt: "zht", ja: "jpn", ko: "kor", ar: "ara", hi: "hin",
  nl: "dut", sv: "swe", pl: "pol", tr: "tur", da: "dan",
  no: "nor", fi: "fin", vi: "vie", th: "tha", uk: "ukr",
  bg: "bul", cs: "cze", hr: "hrv", hu: "hun", ro: "rum",
  sr: "scc", sk: "slo", el: "ell", he: "heb", fa: "per",
  // passthrough 3-letter codes
  eng: "eng", ind: "ind", spa: "spa", fre: "fre", ger: "ger",
  ita: "ita", por: "por", rus: "rus", chi: "chi", jpn: "jpn",
  kor: "kor", ara: "ara", hin: "hin", dut: "dut", tur: "tur",
};

const HTTP = axios.create({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  },
});

function mapLang(lang: string): string {
  return LANG_MAP[lang] ?? lang;
}

async function resolveMediaId(name: string): Promise<string | null> {
  const url = `${SITE}/en/search2/sublanguageid-all/moviename-${encodeURIComponent(
    name
  )}`;
  const res = await HTTP.get<string>(url);
  const $ = cheerio.load(res.data);
  const href = $(".bnone").first().attr("href");
  if (!href) return null;
  const m = href.match(/\/idmovie-(\d+)/);
  return m ? m[1] : null;
}

async function resolveDownloadLink(
  pageLink: string,
  fallbackLang: string
): Promise<string | null> {
  try {
    const res = await HTTP.get<string>(pageLink);
    const $ = cheerio.load(res.data);
    const href = $("#bt-dwl-bt").attr("href");
    if (!href) return null;
    const slugParts = pageLink.split("-");
    const slugLang = slugParts[slugParts.length - 1];
    const langCode = LANG_MAP[slugLang] ?? fallbackLang;
    return `${langCode}-${SITE}${href}`;
  } catch {
    return null;
  }
}

interface SubLink {
  title: string;
  downloadLink: string;
  language?: string;
}

async function searchByMediaId(
  mediaId: string,
  lang: string,
  totalLink: number
): Promise<SubLink[]> {
  const url = `${SITE}/en/search/sublanguageid-${lang}/idmovie-${mediaId}`;
  const res = await HTTP.get<string>(url);
  const $ = cheerio.load(res.data);

  const singleLink = $("#bt-dwl-bt").attr("href");
  if (singleLink) {
    return [
      {
        title: `subtitle-${lang}`,
        downloadLink: `${lang}-${SITE}${singleLink}`,
        language: lang,
      },
    ];
  }

  const pageLinks: string[] = [];
  $(".bnone").each((_i, el) => {
    const href = $(el).attr("href");
    if (href) pageLinks.push(SITE + href);
  });

  const results = await Promise.all(
    pageLinks.slice(0, totalLink).map(async (link) => {
      const idMatch = link.match(/\/subtitles\/(\d+)\//);
      const id = idMatch?.[1] ?? "";
      const titleEl = id ? $(`#main${id}`) : null;
      const rawTitle = titleEl?.text().trim().split(" ")[0] ?? "";
      const title =
        rawTitle.match(/(\w+\.\d+\.\w+(\.\w+)?\.\w+(-\w+)?)/)?.[0] ??
        link.split("/").pop() ??
        "subtitle";
      const dlLink = await resolveDownloadLink(link, lang);
      if (!dlLink) return null;
      return { title, downloadLink: dlLink, language: lang } as SubLink;
    })
  );

  return results.filter((r): r is SubLink => r !== null);
}

// ── Search movie subtitles ─────────────────────────────────────────
// GET /api/subtitles/search/movie/:lang/:name?totalLink=3
router.get(
  "/api/subtitles/search/movie/:lang/:name",
  async (req, res) => {
    const lang = mapLang(req.params.lang);
    const name = req.params.name;
    const totalLink = Math.min(Number(req.query.totalLink ?? 5), 10);
    try {
      const mediaId = await resolveMediaId(name);
      if (!mediaId) {
        res.status(404).json({ error: "Movie not found on OpenSubtitles" });
        return;
      }
      const links = await searchByMediaId(mediaId, lang, totalLink);
      res.json({ name, language: lang, links });
    } catch (err) {
      req.log.error(err, "subtitle search/movie failed");
      res.status(500).json({ error: "Search failed" });
    }
  }
);

// ── Search show/episode subtitles ──────────────────────────────────
// GET /api/subtitles/search/show/:lang/:name/:season/:episode?totalLink=3
router.get(
  "/api/subtitles/search/show/:lang/:name/:season/:episode",
  async (req, res) => {
    const lang = mapLang(req.params.lang);
    const { name, season, episode } = req.params;
    const totalLink = Math.min(Number(req.query.totalLink ?? 5), 10);
    try {
      const searchUrl = `${SITE}/en/search/sublanguageid-${lang}/searchonlytvseries-on/season-${season}/episode-${episode}/moviename-${encodeURIComponent(
        name.split("-").join("+")
      )}`;
      const episodeRes = await HTTP.get<string>(searchUrl);
      const $ = cheerio.load(episodeRes.data);

      const links: SubLink[] = [];
      $(".bnone").each((_i, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        const parts = href.split("/");
        const id = parts[3];
        const slugParts = parts[parts.length - 1].split("-");
        const slug = slugParts[slugParts.length - 1];
        const langCode = LANG_MAP[slug] ?? lang;
        links.push({
          title: parts[parts.length - 1],
          downloadLink: `${langCode}-${SITE}/en/subtitleserve/sub/${id}`,
          language: langCode,
        });
      });

      res.json({ name, season, episode, language: lang, links: links.slice(0, totalLink) });
    } catch (err) {
      req.log.error(err, "subtitle search/show failed");
      res.status(500).json({ error: "Search failed" });
    }
  }
);

// ── Read & stream subtitle content ────────────────────────────────
// GET /api/subtitles/read?url=<encoded_downloadLink>
router.get("/api/subtitles/read", async (req, res) => {
  const rawUrl = req.query.url as string | undefined;
  if (!rawUrl) {
    res.status(400).send("Missing ?url parameter");
    return;
  }

  // downloadLink format: "langcode-https://..." — strip the lang prefix
  const actualUrl = rawUrl.match(/-https?:\/\//)
    ? rawUrl.replace(/^[^-]+-/, "")
    : rawUrl;

  try {
    const { data } = await HTTP.get<ArrayBuffer>(actualUrl, {
      responseType: "arraybuffer",
    });
    const zip = new AdmZip(Buffer.from(data));
    const entries = zip.getEntries();

    for (const entry of entries) {
      const name = entry.entryName.toLowerCase();
      if (name.endsWith(".srt") || name.endsWith(".vtt") || name.endsWith(".ass")) {
        const content = entry.getData().toString("utf-8");
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Access-Control-Allow-Origin", "*");
        Readable.from(content).pipe(res as never);
        return;
      }
    }
    res.status(404).send("Subtitle file not found in archive");
  } catch (err) {
    req.log.error(err, "subtitle read failed");
    res.status(500).send("Failed to download subtitle");
  }
});

export default router;
