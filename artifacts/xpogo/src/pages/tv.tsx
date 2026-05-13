import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { Play, ChevronLeft, Loader2, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";
import type { TmdbTvShow, TmdbSeason, Settings, CustomServer, BuiltinServerState } from "@/lib/types";
import ContentRow from "@/components/ContentRow";
import { usePeachifyPostMessage, getSavedStartAt } from "@/hooks/usePlayerProgress";

const IMG_BASE = "https://image.tmdb.org/t/p";

const BUILTIN = [
  { id: "vidplus",    name: "🎬 VidPlus",             url: "vidplus" },
  { id: "peachify",   name: "🍑 Peachify VIP",         url: "peachify" },
  { id: "vidzee",     name: "🎭 VidZee",               url: "vidzee" },
  { id: "vixsrc",     name: "🦊 VixSrc",               url: "vixsrc" },
  { id: "2embed",     name: "📺 2Embed",               url: "2embed" },
  { id: "vidlink",    name: "🔗 VidLink",               url: "vidlink" },
  { id: "nontongo",   name: "🎥 Nontongo",              url: "nontongo" },
  { id: "auto-clean", name: "🚀 Auto Scraper (Clean)", url: "scraper" },
  { id: "vidking",    name: "ZxcStream",               url: "https://zxcstream.xyz/player/tv/{id}/{s}/{e}" },
  { id: "vidsrc-to",  name: "VidSrc",                  url: "https://vidsrc.to/embed/tv/{id}/{s}/{e}" },
];

const DOWNLOAD_SOURCES_TV = [
  { name: "⬇️ Download via VidLink",    url: (id: number, s: number, e: number) => `https://vidlink.pro/tv/${id}/${s}/${e}?download=1` },
  { name: "⬇️ Download via VidSrc",     url: (id: number, _s: number, _e: number) => `https://dl.vidsrc.vip/tv/${id}` },
  { name: "⬇️ Download via MultiEmbed", url: (id: number, s: number, e: number) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
];

export default function TvPage() {
  const { id } = useParams<{ id: string }>();
  const tvId = Number(id);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState("vidplus");

  const [scrapedUrl, setScrapedUrl] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isPeachify = selectedServerId === "peachify";
  usePeachifyPostMessage(isPeachify && showPlayer);

  const { data: tv, isLoading: isLoadingTv } = useQuery<TmdbTvShow>({
    queryKey: ["tv", tvId],
    queryFn: () => tmdb.tvDetail(tvId),
    enabled: !!tvId,
  });

  const { data: season } = useQuery<TmdbSeason>({
    queryKey: ["tv-season", tvId, selectedSeason],
    queryFn: () => tmdb.tvSeason(tvId, selectedSeason),
    enabled: !!tvId,
  });

  const { data: builtinStates } = useQuery<BuiltinServerState>({
    queryKey: ["builtin_states"],
    queryFn: async () => (await fb.getBuiltinServerStates()) ?? {},
  });

  const { data: customServers = [] } = useQuery<CustomServer[]>({
    queryKey: ["custom_servers"],
    queryFn: fb.getCustomServers,
  });

  const { data: settings } = useQuery<Settings | null>({
    queryKey: ["settings"],
    queryFn: fb.getSettings,
  });

  // Auto Scraper logic
  useEffect(() => {
    if (selectedServerId === "auto-clean" && tv) {
      const run = async () => {
        setIsScraping(true);
        setScrapedUrl(null);
        try {
          const query = tv.original_name || tv.name;
          const searchRes = await fetch(
            `https://api-consumet-org-three.vercel.app/anime/gogoanime/${encodeURIComponent(query)}`
          );
          const searchData = await searchRes.json();
          if (searchData.results?.length > 0) {
            const animeId = searchData.results[0].id;
            const streamRes = await fetch(
              `https://api-consumet-org-three.vercel.app/anime/gogoanime/watch/${animeId}-episode-${selectedEpisode}`
            );
            const streamData = await streamRes.json();
            if (streamData.sources?.length > 0) {
              const src = streamData.sources.find((s: any) => s.quality === "default") || streamData.sources[0];
              setScrapedUrl(src.url);
            }
          }
        } catch {}
        finally { setIsScraping(false); }
      };
      run();
    }
  }, [selectedServerId, selectedEpisode, selectedSeason, tv]);

  if (isLoadingTv || !tv) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0000]">
        <Loader2 className="w-10 h-10 animate-spin text-[#E50914] mb-4" />
        <p className="text-white text-xs font-bold tracking-widest">LOADING DATA...</p>
      </div>
    );
  }

  const getFinalUrl = () => {
    // VidPlus
    if (selectedServerId === "vidplus") {
      return `https://player2.vidplus.pro/embed/tv/${tvId}/${selectedSeason}/${selectedEpisode}?primarycolor=E50914&secondarycolor=170000&iconcolor=FFFFFF&autoplay=true&autonext=true&icons=netflix`;
    }
    // VidZee
    if (selectedServerId === "vidzee") {
      return `https://player.vidzee.wtf/embed/tv/${tvId}/${selectedSeason}/${selectedEpisode}`;
    }
    // VixSrc
    if (selectedServerId === "vixsrc") {
      return `https://vixsrc.to/tv/${tvId}/${selectedSeason}/${selectedEpisode}`;
    }
    // Peachify — FIXED: gunakan path params bukan query params
    if (selectedServerId === "peachify") {
      const accent = (settings?.playerColor ?? "E50914").replace("#", "");
      const startAt = getSavedStartAt(tvId, selectedSeason, selectedEpisode);
      const params = new URLSearchParams({ accent, quality: "1080", autoNext: "1" });
      if (startAt > 0) params.set("startAt", String(Math.floor(startAt)));
      return `https://peachify.top/embed/tv/${tvId}/${selectedSeason}/${selectedEpisode}?${params}`;
    }
    // 2Embed
    if (selectedServerId === "2embed") {
      return `https://www.2embed.cc/embedtv/${tvId}&s=${selectedSeason}&e=${selectedEpisode}`;
    }
    // VidLink
    if (selectedServerId === "vidlink") {
      return `https://vidlink.pro/tv/${tvId}/${selectedSeason}/${selectedEpisode}?primaryColor=E50914&secondaryColor=170000&iconColor=FFFFFF&autoplay=true&nextbutton=true`;
    }
    // Nontongo
    if (selectedServerId === "nontongo") {
      return `https://nontongo.win/embed/tv/${tvId}/${selectedSeason}/${selectedEpisode}`;
    }
    // Auto Scraper
    if (selectedServerId === "auto-clean") {
      if (isScraping) return "";
      if (scrapedUrl) return `https://artplayer.org/?url=${encodeURIComponent(scrapedUrl)}&autoPlay=true`;
      return `https://zxcstream.xyz/player/tv/${tvId}/${selectedSeason}/${selectedEpisode}`;
    }
    // Built-in / Custom
    const builtin = BUILTIN.find((b) => b.id === selectedServerId);
    const custom = (customServers as CustomServer[]).find((s) => s.id === selectedServerId);
    let template = builtin ? builtin.url : custom?.url;
    if (!template) return "";
    return template
      .replace("{id}", String(tvId))
      .replace("{s}", String(selectedSeason))
      .replace("{e}", String(selectedEpisode));
  };

  const alwaysEnabled = ["vidplus", "peachify", "vidzee", "vixsrc", "2embed", "vidlink", "nontongo", "auto-clean"];
  const allServers = [
    ...BUILTIN.filter(
      (b) => alwaysEnabled.includes(b.id) ||
             (builtinStates as BuiltinServerState)?.[b.id] !== false
    ),
    ...(customServers as CustomServer[]).filter((s) => s.active),
  ];

  const isDonghua = tv.original_language === "zh";

  return (
    <div className="min-h-screen pb-20 bg-[#0d0000]" style={{ paddingTop: "calc(56px + var(--banner-top-height, 0px))" }}>

      {/* Backdrop */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={`${IMG_BASE}/original${tv.backdrop_path}`}
          className="w-full h-full object-cover opacity-30" alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0000] to-transparent" />
        <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 text-white text-[10px] font-black px-4 py-2 rounded-full border border-white/10">
          <ChevronLeft className="w-4 h-4" /> KEMBALI
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-44 mx-auto md:mx-0 flex-shrink-0">
            <img
              src={`${IMG_BASE}/w500${tv.poster_path}`}
              className="w-full rounded-xl shadow-2xl border border-[#8B0000]/40" alt=""
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-white text-3xl font-black mb-2">{tv.name}</h1>

            {/* Donghua badge + pinyin */}
            {isDonghua && (
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <span className="bg-[#E50914] text-white text-[10px] font-black px-2 py-0.5 rounded">DONGHUA</span>
                <span className="text-gray-500 text-xs italic">Judul Asli: {tv.original_name}</span>
              </div>
            )}
            {tv.original_language === "ja" && (
              <span className="inline-block bg-[#7c3aed] text-white text-[10px] font-black px-2 py-0.5 rounded mb-3">ANIME</span>
            )}
            {tv.original_language === "ko" && (
              <span className="inline-block bg-[#0369a1] text-white text-[10px] font-black px-2 py-0.5 rounded mb-3">K-DRAMA</span>
            )}

            {/* Status */}
            {tv.status && (
              <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                <span className={`text-[10px] font-black px-3 py-1 rounded border ${
                  tv.status === "Returning Series" || tv.status === "In Production"
                    ? "bg-[#0a3d1f] border-[#00c853] text-[#00c853]"
                    : "bg-[#1e3a5f] border-[#3b82f6] text-[#3b82f6]"
                }`}>
                  {tv.status === "Returning Series" || tv.status === "In Production"
                    ? "● Ongoing" : "✓ Completed"}
                </span>
              </div>
            )}

            <p className="text-gray-400 text-sm mb-6 line-clamp-3">{tv.overview}</p>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <button
                onClick={() => setShowPlayer(!showPlayer)}
                className="bg-[#E50914] hover:bg-[#CC0000] text-white font-black px-8 py-3 rounded-full flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(229,9,20,0.4)]"
              >
                <Play className="w-4 h-4 fill-current" />
                {showPlayer ? "TUTUP PLAYER" : "NONTON SEKARANG"}
              </button>
              <button
                onClick={() => setShowDownload(!showDownload)}
                className="border border-[#8B0000] hover:border-[#E50914] bg-[#1a0000] hover:bg-[#2a0000] text-white font-black px-6 py-3 rounded-full flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-[#E50914]" />
                DOWNLOAD
              </button>
            </div>

            {/* Download Panel */}
            {showDownload && (
              <div className="mt-4 p-4 bg-[#1a0000] rounded-lg border border-[#8B0000]/40">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Pilih Sumber Download (S{selectedSeason}E{selectedEpisode}):</p>
                <div className="flex flex-col gap-2">
                  {DOWNLOAD_SOURCES_TV.map((src) => (
                    <a
                      key={src.name}
                      href={src.url(tvId, selectedSeason, selectedEpisode)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-[#0d0000] hover:bg-[#2a0000] border border-[#8B0000]/30 hover:border-[#E50914]/50 text-gray-300 text-sm px-4 py-2.5 rounded transition-colors"
                    >
                      <Download className="w-4 h-4 text-[#E50914] flex-shrink-0" />
                      {src.name}
                    </a>
                  ))}
                </div>
                <p className="text-gray-600 text-xs mt-3">⚠️ Pilih episode dan kualitas di situs download.</p>
              </div>
            )}
          </div>
        </div>

        {/* Player */}
        {showPlayer && (
          <div className="mt-10">
            {/* Server selector */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <span className="text-gray-500 text-[10px] font-black uppercase tracking-wider mr-1">Server:</span>
              {allServers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedServerId(s.id)}
                  className={`text-[10px] font-black px-4 py-2 rounded border transition-all ${
                    selectedServerId === s.id
                      ? "bg-[#E50914] border-[#E50914] text-white shadow-[0_0_10px_rgba(229,9,20,0.4)]"
                      : "bg-white/5 border-white/10 text-gray-500 hover:border-[#E50914] hover:text-white"
                  }`}
                >
                  {s.name}
                  {s.id === "vidplus"  && <span className="ml-1 bg-[#6C63FF] text-white text-[8px] px-1 rounded">PRO</span>}
                  {s.id === "vidzee"   && <span className="ml-1 bg-[#FF6B35] text-white text-[8px] px-1 rounded">HD</span>}
                  {s.id === "vixsrc"   && <span className="ml-1 bg-[#059669] text-white text-[8px] px-1 rounded">ALT</span>}
                  {s.id === "2embed"   && <span className="ml-1 bg-[#0ea5e9] text-white text-[8px] px-1 rounded">HD</span>}
                  {s.id === "vidlink"  && <span className="ml-1 bg-[#f59e0b] text-white text-[8px] px-1 rounded">NEW</span>}
                  {s.id === "nontongo" && <span className="ml-1 bg-[#10b981] text-white text-[8px] px-1 rounded">ALT</span>}
                </button>
              ))}
            </div>

            {/* iframe */}
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-[#8B0000]/30">
              {isScraping && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#E50914] mb-2" />
                  <p className="text-[10px] text-white font-black">MENCARI VIDEO...</p>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={getFinalUrl()}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write"
                referrerPolicy="origin"
                scrolling="no"
                frameBorder="0"
              />
            </div>
          </div>
        )}

        {/* Season & Episode Selector */}
        <div className="mt-10">
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
            {Array.from({ length: tv.number_of_seasons || 1 }, (_, i) => i + 1).map((s) => (
              <button
                key={s}
                onClick={() => { setSelectedSeason(s); setSelectedEpisode(1); }}
                className={`flex-shrink-0 px-6 py-2 rounded-full text-[10px] font-black transition-all ${
                  selectedSeason === s
                    ? "bg-[#E50914] text-white"
                    : "bg-white/5 text-gray-500 hover:bg-white/10"
                }`}
              >
                SEASON {s}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-12 gap-2">
            {season?.episodes.map((ep) => (
              <button
                key={ep.episode_number}
                onClick={() => { setSelectedEpisode(ep.episode_number); setShowPlayer(true); }}
                className={`py-3 rounded-lg border text-[10px] font-black transition-all ${
                  selectedEpisode === ep.episode_number
                    ? "bg-[#E50914] border-[#E50914] text-white"
                    : "bg-white/5 border-white/5 text-gray-500 hover:border-[#E50914]"
                }`}
              >
                {ep.episode_number}
              </button>
            ))}
          </div>
        </div>

        {/* Similar */}
        {(tv as any)?.similar?.results?.length > 0 && (
          <div className="mt-10 border-t border-[#8B0000]/20 pt-8">
            <ContentRow title="Serial Serupa" items={(tv as any).similar.results} mediaType="tv" />
          </div>
        )}
      </div>
    </div>
  );
}
