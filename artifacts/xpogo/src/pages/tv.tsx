import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { Star, Calendar, Play, ChevronLeft, Server, Heart, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";
import type { TmdbTvShow, TmdbSeason, Settings, CustomServer, BuiltinServerState } from "@/lib/types";
import ContentRow from "@/components/ContentRow";
import { usePeachifyPostMessage, getSavedStartAt } from "@/hooks/usePlayerProgress";

const IMG_BASE = "https://image.tmdb.org/t/p";

const BUILTIN = [
  { id: "peachify",     name: "🍑 Peachify VIP", url: "peachify" },
  { id: "auto-clean",   name: "🚀 Auto Scraper (Clean)", url: "scraper" },
  { id: "vidking",      name: "ZxcStream",          url: "https://zxcstream.xyz/player/tv/{id}/{s}/{e}" },
  { id: "vidsrc",       name: "VidSrc",             url: "https://vidsrc.to/embed/tv/{id}/{s}/{e}" },
];

export default function TvPage() {
  const { id } = useParams<{ id: string }>();
  const tvId = Number(id);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState("peachify");
  
  // Scraper States
  const [scrapedUrl, setScrapedUrl] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [isError, setIsError] = useState(false);

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

  // LOGIKA AUTO SCRAPER YANG DIPERBAIKI
  useEffect(() => {
    if (selectedServerId === "auto-clean" && tv) {
      const runScraper = async () => {
        setIsScraping(true);
        setIsError(false);
        setScrapedUrl(null); // Penting: hapus link lama agar tidak blank/salah putar

        try {
          const query = tv.original_name || tv.name;
          // Menggunakan mirror API Consumet yang lebih stabil untuk menghidari CORS/Limit
          const searchRes = await fetch(`https://api-consumet-org-three.vercel.app/anime/gogoanime/${encodeURIComponent(query)}`);
          const searchData = await searchRes.json();
          
          if (searchData.results?.length > 0) {
            const animeId = searchData.results[0].id;
            const streamRes = await fetch(`https://api-consumet-org-three.vercel.app/anime/gogoanime/watch/${animeId}-episode-${selectedEpisode}`);
            const streamData = await streamRes.json();
            
            if (streamData.sources?.length > 0) {
              const bestSource = streamData.sources.find((s: any) => s.quality === 'default' || s.quality === 'auto') || streamData.sources[0];
              setScrapedUrl(bestSource.url);
            } else { setIsError(true); }
          } else { setIsError(true); }
        } catch (err) {
          console.error("Scraper Error:", err);
          setIsError(true);
        } finally {
          setIsScraping(false);
        }
      };
      runScraper();
    }
  }, [selectedServerId, selectedEpisode, selectedSeason, tv]);

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
      <div className="min-h-screen flex items-center justify-center bg-[#0d0000]">
        <div className="w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getFinalUrl = () => {
    if (selectedServerId === "peachify") {
      const accent = (settings?.playerColor ?? "E50914").replace("#", "");
      const startAt = getSavedStartAt(tvId, selectedSeason, selectedEpisode);
      const params = new URLSearchParams({ accent, quality: "1080", autoNext: "1" });
      if (startAt > 0) params.set("startAt", String(Math.floor(startAt)));
      return `https://peachify.top/embed/tv/${tvId}?season=${selectedSeason}&episode=${selectedEpisode}&${params}`;
    }

    if (selectedServerId === "auto-clean") {
      if (isScraping) return ""; // Tampilkan loading overlay
      if (scrapedUrl) return `https://artplayer.org/?url=${encodeURIComponent(scrapedUrl)}&autoPlay=true`;
      
      // FALLBACK: Jika scraper gagal, gunakan ZxcStream sebagai cadangan otomatis
      return `https://zxcstream.xyz/player/tv/${tvId}/${selectedSeason}/${selectedEpisode}`;
    }

    const builtin = BUILTIN.find((b) => b.id === selectedServerId);
    const custom = (customServers as CustomServer[]).find((s) => s.id === selectedServerId);
    let template = builtin ? builtin.url : custom?.url;
    if (!template) return "";
    return template
      .replace("{id}", String(tvId))
      .replace("{s}", String(selectedSeason))
      .replace("{e}", String(selectedEpisode));
  };

  const enabledBuiltins = BUILTIN.filter(
    (b) => b.id === "peachify" || b.id === "auto-clean" || (builtinStates as BuiltinServerState)?.[b.id] !== false
  );
  const allServers = [...enabledBuiltins, ...customServers.filter(s => s.active)];

  return (
    <div className="min-h-screen pb-16 bg-[#0d0000]" style={{ paddingTop: "calc(56px + var(--banner-top-height, 0px))" }}>
      
      {/* Backdrop */}
      <div className="relative h-60 sm:h-80 overflow-hidden">
        <img src={`${IMG_BASE}/original${tv.backdrop_path}`} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0000] to-transparent" />
        <Link href="/" className="absolute top-4 left-4 flex items-center gap-1 bg-black/60 hover:bg-[#8B0000] text-white text-xs font-bold px-4 py-2 rounded-full border border-white/10 transition-all">
          <ChevronLeft className="w-4 h-4" /> KEMBALI
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 relative z-10">
        <div className="flex flex-col sm:flex-row gap-8">
          {/* Poster */}
          <div className="w-40 sm:w-48 mx-auto sm:mx-0 flex-shrink-0">
            <img src={`${IMG_BASE}/w500${tv.poster_path}`} alt={tv.name} className="w-full rounded-xl shadow-2xl border border-white/5" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-white text-3xl font-black mb-2">{tv.name}</h1>
            
            {tv.original_language === 'zh' && (
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-[#E50914] text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg shadow-red-900/50">DONGHUA</span>
                <span className="text-gray-500 text-xs italic">({tv.original_name})</span>
              </div>
            )}

            <div className="flex flex-wrap gap-4 mb-6 text-gray-400 text-xs font-bold">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-[#E50914]" /> {tv.first_air_date?.slice(0,4)}</span>
              <span className="bg-white/5 px-2 py-0.5 rounded uppercase tracking-tighter">{tv.genres?.[0]?.name}</span>
              <span className="text-[#f5c518]">★ {tv.vote_average?.toFixed(1)}</span>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-3">{tv.overview}</p>

            <button onClick={() => setShowPlayer(!showPlayer)} className="bg-[#E50914] hover:bg-white hover:text-black text-white font-black px-8 py-3 rounded-full transition-all shadow-xl shadow-red-900/20 flex items-center gap-2">
              <Play className="w-4 h-4 fill-current" /> {showPlayer ? "TUTUP PLAYER" : "NONTON SEKARANG"}
            </button>
          </div>
        </div>

        {/* Player Section */}
        {showPlayer && (
          <div className="mt-10">
             <div className="flex flex-wrap gap-2 mb-4">
              <Server className="w-4 h-4 text-[#E50914] mr-2" />
              {allServers.map((s) => (
                <button key={s.id} onClick={() => setSelectedServerId(s.id)} className={`text-[10px] font-black px-3 py-1.5 rounded-md border transition-all ${selectedServerId === s.id ? "bg-[#E50914] border-[#E50914] text-white" : "border-white/10 bg-white/5 text-gray-400 hover:border-white/30"}`}>
                  {s.name.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
              {isScraping && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/90 z-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#E50914] mb-3" />
                  <p className="text-[10px] font-black tracking-widest animate-pulse">MENCARI VIDEO BERSIH...</p>
                </div>
              )}
              {isError && selectedServerId === "auto-clean" && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/20 border border-red-600/50 px-4 py-2 rounded-full z-30 flex items-center gap-2">
                   <AlertCircle className="w-3 h-3 text-red-500" />
                   <p className="text-[9px] font-bold text-white uppercase">Video bersih tidak ditemukan, beralih ke server cadangan...</p>
                </div>
              )}
              <iframe ref={iframeRef} src={getFinalUrl()} className="absolute inset-0 w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
            </div>
          </div>
        )}

        {/* Episodes Selector */}
        <div className="mt-12">
          <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-4">Pilih Episode</h3>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
            {Array.from({ length: seasons }, (_, i) => i + 1).map((s) => (
              <button key={s} onClick={() => { setSelectedSeason(s); setSelectedEpisode(1); }} className={`flex-shrink-0 px-6 py-2 rounded-full text-[10px] font-black transition-all ${selectedSeason === s ? "bg-white text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}>SEASON {s}</button>
            ))}
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {season?.episodes.map((ep) => (
              <button key={ep.episode_number} onClick={() => { setSelectedEpisode(ep.episode_number); setShowPlayer(true); window.scrollTo({top: 400, behavior: 'smooth'}); }} className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-all ${selectedEpisode === ep.episode_number ? "bg-[#E50914] border-[#E50914] text-white shadow-lg shadow-red-900/40" : "border-white/5 bg-white/5 text-gray-400 hover:border-[#E50914]/50"}`}>
                <span className="text-[10px] font-black">{ep.episode_number}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Similar Content */}
        {tv.similar?.results?.length > 0 && (
          <div className="mt-20 pt-10 border-t border-white/5">
            <ContentRow title="Mungkin Anda Suka" items={tv.similar.results} mediaType="tv" />
          </div>
        )}
      </div>
    </div>
  );
}
