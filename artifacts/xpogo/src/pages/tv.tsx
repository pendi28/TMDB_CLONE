import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { Star, Calendar, Play, ChevronLeft, Server, Heart, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";
import type { TmdbTvShow, TmdbSeason, Settings, CustomServer, BuiltinServerState } from "@/lib/types";
import ContentRow from "@/components/ContentRow";
import { usePeachifyPostMessage, getSavedStartAt } from "@/hooks/usePlayerProgress";

const IMG_BASE = "https://image.tmdb.org/t/p";

// DAFTAR SERVER (Sudah ditambah Auto Scraper yang Bersih)
const BUILTIN = [
  { id: "peachify",     name: "🍑 Peachify VIP", url: "peachify" },
  { id: "auto-clean",   name: "🚀 Auto Scraper (Clean)", url: "scraper" },
  { id: "vidking",      name: "ZxcStream",          url: "https://zxcstream.xyz/player/tv/{id}/{s}/{e}" },
  { id: "vidsrc",       name: "VidSrc",             url: "https://vidsrc.to/embed/{type}/{id}" },
  { id: "vidsrcxyz",    name: "VidSrc.xyz",         url: "https://vidsrc.xyz/embed/{type}/{id}" },
];

function StarRating({ score }: { score?: number }) {
  const val = score ?? 0;
  const stars = Math.round(val / 2);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className="w-4 h-4" fill={i <= stars ? "#f5c518" : "none"} stroke={i <= stars ? "#f5c518" : "#555"} strokeWidth={1.5} />
      ))}
      <span className="text-[#f5c518] text-sm font-bold ml-1">{val.toFixed(1)}</span>
    </div>
  );
}

export default function TvPage() {
  const { id } = useParams<{ id: string }>();
  const tvId = Number(id);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState("peachify");
  
  // State khusus Scraper
  const [scrapedUrl, setScrapedUrl] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isPeachify = selectedServerId === "peachify";

  usePeachifyPostMessage(isPeachify && showPlayer);

  const { data: tv, isLoading } = useQuery<TmdbTvShow>({
    queryKey: ["tv", tvId],
    queryFn: () => tmdb.tvDetail(tvId),
    enabled: !!tvId,
  });

  const { data: season } = useQuery<TmdbSeason>({
    queryKey: ["tv-season", tvId, selectedSeason],
    queryFn: () => tmdb.tvSeason(tvId, selectedSeason),
    enabled: !!tvId,
  });

  // LOGIKA AUTO SCRAPER (Mencari link .m3u8 bersih)
  useEffect(() => {
    if (selectedServerId === "auto-clean" && tv) {
      const runScraper = async () => {
        setIsScraping(true);
        try {
          // Cari ID Anime (Gunakan Original Name untuk Donghua agar akurat)
          const searchTitle = tv.original_name || tv.name;
          const searchRes = await fetch(`https://api.consumet.org/anime/gogoanime/${encodeURIComponent(searchTitle)}`);
          const searchData = await searchRes.json();
          
          if (searchData.results?.length > 0) {
            const animeId = searchData.results[0].id;
            const streamRes = await fetch(`https://api.consumet.org/anime/gogoanime/watch/${animeId}-episode-${selectedEpisode}`);
            const streamData = await streamRes.json();
            
            if (streamData.sources) {
              const bestSource = streamData.sources.find((s: any) => s.quality === 'default' || s.quality === 'auto') || streamData.sources[0];
              setScrapedUrl(bestSource.url);
            }
          }
        } catch (err) {
          console.error("Scraper Gagal:", err);
        } finally {
          setIsScraping(false);
        }
      };
      runScraper();
    }
  }, [selectedServerId, selectedEpisode, tv]);

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

  if (isLoading || !tv) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0000" }}>
        <div className="w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getFinalUrl = () => {
    // 1. Logika Peachify
    if (selectedServerId === "peachify") {
      const accent = (settings?.playerColor ?? "E50914").replace("#", "");
      const startAt = getSavedStartAt(tvId, selectedSeason, selectedEpisode);
      const params = new URLSearchParams({ accent, quality: "1080", autoNext: "1" });
      if (startAt > 0) params.set("startAt", String(Math.floor(startAt)));
      return `https://peachify.top/embed/tv/${tvId}?season=${selectedSeason}&episode=${selectedEpisode}&${params}`;
    }

    // 2. Logika Auto Scraper Clean (Menggunakan ArtPlayer Proxy)
    if (selectedServerId === "auto-clean") {
      return scrapedUrl ? `https://artplayer.org/?url=${encodeURIComponent(scrapedUrl)}&autoPlay=true` : "";
    }

    // 3. Logika Built-in & Custom Server lainnya
    const builtin = BUILTIN.find((b) => b.id === selectedServerId);
    const custom = (customServers as CustomServer[]).find((s) => s.id === selectedServerId);
    let template = builtin ? builtin.url : custom?.url;
    if (!template) return "";
    return template
      .replace("{type}", "tv")
      .replace("{id}", String(tvId))
      .replace("{s}", String(selectedSeason))
      .replace("{e}", String(selectedEpisode));
  };

  const enabledBuiltins = BUILTIN.filter(
    (b) => b.id === "peachify" || b.id === "auto-clean" || (builtinStates as BuiltinServerState)?.[b.id] !== false
  );
  const activeCustom = (customServers as CustomServer[]).filter((s) => s.active);
  const allServers = [...enabledBuiltins, ...activeCustom];

  const genres = tv.genres?.map((g) => g.name).join(", ") ?? "";
  const year = tv.first_air_date?.slice(0, 4) ?? "";
  const seasons = tv.number_of_seasons ?? 1;
  const episodes = season?.episodes ?? [];

  return (
    <div className="min-h-screen pb-16" style={{ background: "linear-gradient(to bottom, #0d0000, #0a0000)", paddingTop: "calc(56px + var(--banner-top-height, 0px))" }}>
      
      {/* Backdrop */}
      {tv.backdrop_path && (
        <div className="relative h-56 sm:h-72 overflow-hidden">
          <img src={`${IMG_BASE}/original${tv.backdrop_path}`} alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0d0000]" />
          <Link href="/" className="absolute top-4 left-4 flex items-center gap-1 bg-black/60 hover:bg-[#8B0000] text-white text-sm font-bold px-3 py-1.5 rounded border border-[#8B0000]/50 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10 relative z-10">
        <div className="flex flex-col sm:flex-row gap-6">

          {/* Poster */}
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            <div className="w-36 sm:w-44 rounded-lg overflow-hidden border border-[#8B0000]/50 shadow-[0_0_20px_rgba(139,0,0,0.4)]">
              <img src={`${IMG_BASE}/w500${tv.poster_path}`} alt={tv.name} className="w-full aspect-[2/3] object-cover" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-2xl sm:text-3xl font-black mb-1 leading-tight">{tv.name}</h1>
            
            {/* LABEL DONGHUA OTOMATIS */}
            {tv.original_language === 'zh' && (
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-[#E50914] text-white text-[10px] font-black px-2 py-0.5 rounded shadow-[0_0_10px_rgba(229,9,20,0.5)]">DONGHUA</span>
                <span className="text-gray-500 text-xs italic">({tv.original_name})</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mb-3">
              <span className="bg-[#8B0000]/30 border border-[#8B0000]/50 text-gray-300 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#E50914]" />{year}
              </span>
              <span className="bg-[#8B0000]/30 border border-[#8B0000]/50 text-gray-300 text-xs px-2 py-0.5 rounded">{genres}</span>
            </div>

            <div className="mb-4">
              <StarRating score={tv.vote_average} />
            </div>

            <p className="text-gray-400 text-sm leading-relaxed mb-5 line-clamp-3">{tv.overview}</p>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowPlayer(!showPlayer)} className="flex items-center gap-2 bg-[#E50914] hover:bg-[#CC0000] text-white font-bold px-6 py-2.5 rounded transition-colors shadow-[0_0_16px_rgba(229,9,20,0.4)]">
                <Play className="w-4 h-4 fill-white" /> {showPlayer ? "Tutup Player" : "Watch Now"}
              </button>
            </div>
          </div>
        </div>

        {/* Player & Episode Selector */}
        {showPlayer && (
          <div className="mt-8">
             {/* Server Selector */}
             <div className="flex flex-wrap gap-2 mb-4">
              {allServers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedServerId(s.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded border transition-colors ${
                    selectedServerId === s.id ? "bg-[#E50914] border-[#E50914] text-white" : "border-[#8B0000]/50 bg-[#1a0000] text-gray-300 hover:border-[#E50914]"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>

            <div className="relative w-full bg-black rounded-lg overflow-hidden border border-[#8B0000]/30 shadow-[0_0_30px_rgba(139,0,0,0.3)]" style={{ paddingTop: "56.25%" }}>
              {isScraping ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-8 h-8 animate-spin text-[#E50914] mb-2" />
                  <p className="text-xs font-bold animate-pulse">Mencari Link Video Bersih...</p>
                </div>
              ) : (
                <iframe ref={iframeRef} src={getFinalUrl()} className="absolute inset-0 w-full h-full" allowFullScreen allow="autoplay; fullscreen" referrerPolicy="no-referrer" />
              )}
            </div>
          </div>
        )}

        {/* Season & Episode Tabs */}
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: seasons }, (_, i) => i + 1).map((s) => (
              <button key={s} onClick={() => { setSelectedSeason(s); setSelectedEpisode(1); }} className={`text-xs font-bold px-4 py-2 rounded ${selectedSeason === s ? "bg-[#E50914] text-white" : "bg-[#1a0000] text-gray-400"}`}>Season {s}</button>
            ))}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {episodes.map((ep) => (
              <button key={ep.episode_number} onClick={() => { setSelectedEpisode(ep.episode_number); setShowPlayer(true); }} className={`text-xs font-bold py-2 rounded border transition-all ${selectedEpisode === ep.episode_number ? "bg-[#E50914] border-[#E50914] text-white" : "border-[#8B0000]/30 bg-[#1a0000] text-gray-400"}`}>
                EP {ep.episode_number}
              </button>
            ))}
          </div>
        </div>

        {/* Similar Content */}
        {(tv as any)?.similar?.results?.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[#8B0000]/20">
            <ContentRow title="Series Serupa" items={(tv as any).similar.results} mediaType="tv" />
          </div>
        )}
      </div>
    </div>
  );
}
