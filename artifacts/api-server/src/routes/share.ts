import { Router } from "express";
import { spawn } from "child_process";

const router = Router();
const TMDB_KEY = process.env.TMDB_API_KEY ?? "";
const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

async function tmdbFetch(path: string, params: Record<string, string> = {}): Promise<any> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("language", "id-ID");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${path} ${res.status}`);
  return res.json();
}

function getYouTubeTrailerKey(videos: any): string | null {
  if (!videos?.results?.length) return null;
  return (
    videos.results.find((v: any) => v.type === "Trailer" && v.site === "YouTube")?.key ??
    videos.results.find((v: any) => v.type === "Teaser" && v.site === "YouTube")?.key ??
    videos.results.find((v: any) => v.site === "YouTube")?.key ??
    null
  );
}

function buildSharePage({
  title, overview, posterUrl, backdropUrl, year, rating,
  genres, trailerKey, type, tmdbId, appDomain,
}: {
  title: string; overview: string; posterUrl: string; backdropUrl: string;
  year: string; rating: number; genres: string; trailerKey: string | null;
  type: "movie" | "tv"; tmdbId: number; appDomain: string;
}): string {
  const deepLink = `xpogo://${type}/${tmdbId}`;
  const webFallback = `https://${appDomain}/${type}/${tmdbId}`;
  const ratingPct = Math.round(rating * 10);
  const ratingColor = ratingPct >= 70 ? "#00c853" : ratingPct >= 50 ? "#f5c518" : "#e74c3c";

  const videoSection = trailerKey
    ? `<div class="video-wrap">
        <div class="video-label">🎬 Preview Trailer · 1 Menit</div>
        <div class="video-container">
          <iframe src="https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=1&end=60&rel=0&modestbranding=1&iv_load_policy=3&color=white"
            title="Preview ${title}" frameborder="0"
            allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>
        <p class="clip-note">Klip berhenti otomatis di menit ke-1 — tonton lengkap di XpoGo</p>
      </div>`
    : `<div class="no-trailer"><div class="no-trailer-icon">🎬</div><p>Trailer belum tersedia.</p></div>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="theme-color" content="#0d1117">
  <title>${title} — XpoGo</title>
  <meta property="og:title" content="${title} (${year})">
  <meta property="og:description" content="${overview.slice(0, 200)}">
  <meta property="og:image" content="${posterUrl}">
  <meta property="og:type" content="video.movie">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${backdropUrl || posterUrl}">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#0d1117;--surface:#161c27;--card:#1c2535;--border:#2a3a4a;--red:#E50914;--green:#00c853;--gray:#8a9bb0;--white:#e8edf3;--r:16px}
    body{background:var(--bg);color:var(--white);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;min-height:100vh}
    .backdrop-wrap{position:relative;overflow:hidden}
    .backdrop{width:100%;height:260px;object-fit:cover;display:block}
    .backdrop-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(13,17,23,.3) 0%,rgba(13,17,23,.8) 70%,#0d1117 100%)}
    .no-backdrop{width:100%;height:200px;background:linear-gradient(135deg,#1c2535,#0d1117)}
    .content{max-width:560px;margin:0 auto;padding:0 16px 40px}
    .header-card{display:flex;gap:16px;align-items:flex-end;margin-top:-80px;position:relative;z-index:1;margin-bottom:20px}
    .poster{width:100px;height:150px;border-radius:12px;object-fit:cover;flex-shrink:0;box-shadow:0 8px 24px rgba(0,0,0,.6);border:2px solid var(--border);background:var(--card)}
    .no-poster{width:100px;height:150px;border-radius:12px;flex-shrink:0;background:var(--card);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:32px}
    .meta{flex:1;padding-bottom:4px}
    .logo-badge{display:inline-block;background:var(--red);color:#fff;font-size:10px;font-weight:900;letter-spacing:1.5px;padding:3px 8px;border-radius:6px;margin-bottom:8px}
    .movie-title{font-size:20px;font-weight:900;line-height:1.25;color:#fff;margin-bottom:6px}
    .meta-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}
    .chip{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--gray);font-weight:600}
    .rating{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:800;color:${ratingColor}}
    .genres{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
    .genre-tag{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:5px 12px;font-size:12px;color:var(--gray)}
    .overview{font-size:14px;line-height:1.7;color:var(--gray);margin-bottom:24px}
    .video-wrap{margin-bottom:24px}
    .video-label{font-size:13px;font-weight:800;color:var(--red);letter-spacing:.5px;margin-bottom:10px}
    .video-container{position:relative;padding-bottom:56.25%;border-radius:var(--r);overflow:hidden;background:#000;box-shadow:0 4px 20px rgba(0,0,0,.5);border:1px solid var(--border)}
    .video-container iframe{position:absolute;inset:0;width:100%;height:100%;border:none}
    .clip-note{font-size:11px;color:var(--gray);margin-top:8px;text-align:center}
    .no-trailer{background:var(--card);border:1px dashed var(--border);border-radius:var(--r);padding:32px 16px;text-align:center;margin-bottom:24px}
    .no-trailer-icon{font-size:36px;margin-bottom:8px}
    .no-trailer p{color:var(--gray);font-size:13px}
    .cta-section{display:flex;flex-direction:column;gap:10px;margin-top:8px}
    .btn-primary{display:block;background:var(--red);color:#fff;text-align:center;text-decoration:none;font-size:16px;font-weight:900;padding:15px 20px;border-radius:var(--r);letter-spacing:.5px}
    .btn-secondary{display:block;background:var(--card);color:var(--white);text-align:center;text-decoration:none;font-size:14px;font-weight:700;padding:13px 20px;border-radius:var(--r);border:1.5px solid var(--border)}
    .footer{text-align:center;margin-top:32px;color:var(--gray);font-size:11px}
    .footer span{color:var(--red);font-weight:700}
  </style>
</head>
<body>
  <div class="backdrop-wrap">
    ${backdropUrl ? `<img class="backdrop" src="${backdropUrl}" alt="${title}" loading="lazy">` : `<div class="no-backdrop"></div>`}
    <div class="backdrop-overlay"></div>
  </div>
  <div class="content">
    <div class="header-card">
      ${posterUrl ? `<img class="poster" src="${posterUrl}" alt="${title}" loading="lazy">` : `<div class="no-poster">🎬</div>`}
      <div class="meta">
        <div class="logo-badge">XPOGO</div>
        <div class="movie-title">${title}</div>
        <div class="meta-row">
          ${year ? `<span class="chip">📅 ${year}</span>` : ""}
          ${ratingPct > 0 ? `<span class="rating">⭐ ${ratingPct}%</span>` : ""}
          <span class="chip">${type === "movie" ? "🎬 Film" : "📺 Serial"}</span>
        </div>
      </div>
    </div>
    ${genres ? `<div class="genres">${genres.split(",").map((g: string) => `<span class="genre-tag">${g.trim()}</span>`).join("")}</div>` : ""}
    ${overview ? `<p class="overview">${overview}</p>` : ""}
    ${videoSection}
    <div class="cta-section">
      <a class="btn-primary" href="${deepLink}" onclick="setTimeout(()=>window.location='${webFallback}',1500)">▶  Tonton Lengkap di XpoGo</a>
      <a class="btn-secondary" href="${webFallback}" target="_blank" rel="noopener">🌐  Buka di Browser</a>
    </div>
    <div class="footer">Dibagikan via <span>XpoGo</span> — Streaming Film &amp; Serial Terbaik</div>
  </div>
</body>
</html>`;
}

router.get("/share/movie/:id", async (req, res) => {
  try {
    const tmdbId = Number(req.params.id);
    if (!tmdbId) { res.status(400).send("ID tidak valid"); return; }
    const data = await tmdbFetch(`/movie/${tmdbId}`, { append_to_response: "videos" });
    const trailerKey = getYouTubeTrailerKey(data.videos);
    const appDomain = process.env.EXPO_PUBLIC_WEB_DOMAIN ?? (req.headers.host ?? "xpogo.app");
    const html = buildSharePage({
      title: data.title ?? data.original_title ?? "Film",
      overview: data.overview ?? "",
      posterUrl: data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : "",
      backdropUrl: data.backdrop_path ? `${IMG_BASE}/original${data.backdrop_path}` : "",
      year: data.release_date?.slice(0, 4) ?? "",
      rating: data.vote_average ?? 0,
      genres: (data.genres ?? []).map((g: any) => g.name).join(", "),
      trailerKey,
      type: "movie",
      tmdbId,
      appDomain,
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e: unknown) {
    res.status(500).send(`<h1>Error: ${String(e)}</h1>`);
  }
});

router.get("/share/tv/:id", async (req, res) => {
  try {
    const tmdbId = Number(req.params.id);
    if (!tmdbId) { res.status(400).send("ID tidak valid"); return; }
    const data = await tmdbFetch(`/tv/${tmdbId}`, { append_to_response: "videos" });
    const trailerKey = getYouTubeTrailerKey(data.videos);
    const appDomain = process.env.EXPO_PUBLIC_WEB_DOMAIN ?? (req.headers.host ?? "xpogo.app");
    const html = buildSharePage({
      title: data.name ?? data.original_name ?? "Serial",
      overview: data.overview ?? "",
      posterUrl: data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : "",
      backdropUrl: data.backdrop_path ? `${IMG_BASE}/original${data.backdrop_path}` : "",
      year: data.first_air_date?.slice(0, 4) ?? "",
      rating: data.vote_average ?? 0,
      genres: (data.genres ?? []).map((g: any) => g.name).join(", "),
      trailerKey,
      type: "tv",
      tmdbId,
      appDomain,
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e: unknown) {
    res.status(500).send(`<h1>Error: ${String(e)}</h1>`);
  }
});

router.get("/share/clip/generate", async (req, res) => {
  const { url, title = "klip" } = req.query as Record<string, string>;
  if (!url) {
    res.status(400).json({ error: "parameter url diperlukan" });
    return;
  }

  const decodedUrl = decodeURIComponent(url);
  const safeTitle = (title || "klip").replace(/[^\w\s-]/g, "").trim().slice(0, 50) || "klip";
  const filename = safeTitle.replace(/\s+/g, "_") + "_1menit.mp4";

  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const ffmpegArgs = [
    "-y",
    "-i", decodedUrl,
    "-t", "60",
    "-c:v", "libx264",
    "-c:a", "aac",
    "-preset", "ultrafast",
    "-crf", "28",
    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
    "-f", "mp4",
    "pipe:1",
  ];

  const proc = spawn("ffmpeg", ffmpegArgs, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  proc.stdout.pipe(res);

  proc.stderr.on("data", (data: Buffer) => {
    req.log.debug({ ffmpeg: data.toString().trim() }, "ffmpeg");
  });

  proc.on("error", (err: Error) => {
    req.log.error({ err }, "ffmpeg spawn error");
    if (!res.headersSent) res.status(500).end();
  });

  proc.on("close", (code: number | null) => {
    if (code !== 0) {
      req.log.warn({ code }, "ffmpeg exited non-zero");
    }
  });

  req.on("close", () => {
    proc.kill("SIGKILL");
  });
});

export default router;
