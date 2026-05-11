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
  
  const [scrapedUrl, setScrapedUrl] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isPeachify = selectedServerId === "peachify";

  usePeachifyPostMessage(isPeachify && showPlayer);

  // Ambil Data Utama
  const { data: tv, isLoading: isLoadingTv } = useQuery<TmdbTvShow>({
    queryKey: ["tv", tvId],
    queryFn: () => tmdb.tvDetail(tvId),
    enabled: !!tvId,
  });

  // Ambil Data Season
  const { data: season, isLoading: isLoadingSeason } = useQuery<TmdbSeason>({
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

  // Logika Scraper
  useEffect(() => {
    if (selectedServerId === "auto-clean" && tv) {
      const runScraper = async () => {
        setIsScraping(true);
        setScrapedUrl(null);
        try {
          const query = tv.original_name || tv.name;
          const searchRes = await fetch(`https://api-consumet-org-three.vercel.app/anime/gogoanime/${encodeURIComponent(query)}`);
          const searchData = await searchRes.json();
          
          if (searchData.results?.length > 0) {
            const animeId = searchData.results[0].id;
            const streamRes = await fetch(`https://api-consumet-org-three.vercel.app/anime/gogoanime/watch/${animeId}-episode-${selectedEpisode}`);
            const streamData = await streamRes.json();
            
            if (streamData.sources?.length > 0) {
              const source = streamData.sources.find((s: any) => s.quality === 'default') || streamData.sources[0];
              setScrapedUrl(source.url);
            }
          }
        } catch (err) {
          console.log("Scraper Error");
        } finally {
          setIsScraping(false);
        }
      };
      runScraper();
    }
  }, [selectedServerId, selectedEpisode, selectedSeason, tv]);

  // Handle Loading
  if (isLoadingTv || !tv) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0000]">
        <Loader2 className="w-10 h-10 animate-spin text-[#E50914] mb-4" />
        <p className="text-white text-xs font-bold tracking-widest">LOADING DATA...</p>
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
      if (isScraping) return "";
      if (scrapedUrl) return `https://artplayer.org/?url=${encodeURIComponent(scrapedUrl)}&autoPlay=true`;
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

  const allServers = [
    ...BUILTIN.filter(b => b.id === "auto-clean" || (builtinStates as BuiltinServerState)?.[b.id] !== false),
    ...customServers.filter(s => s.active)
  ];

  return (
    <div className="min-h-screen pb-20 bg-[#0d0000]" style={{ paddingTop: "calc(56px + var(--banner-top-height, 0px))" }}>
      
      {/* Backdrop */}
      <div className="relative h-64 overflow-hidden">
        <img src={`${IMG_BASE}/original${tv.backdrop_path}`} className="w-full h-full object-cover opacity-30" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0000] to-transparent" />
        <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 text-white text-[10px] font-black px-4 py-2 rounded-full border border-white/10">
          <ChevronLeft className="w-4 h-4" /> KEMBALI
        </Link>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-44 mx-auto md:mx-0 flex-shrink-0">
            <img src={`${IMG_BASE}/w500${tv.poster_path}`} className="w-full rounded-xl shadow-2xl" alt="" />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-white text-3xl font-black mb-2">{tv.name}</h1>
            
            {tv.original_language === 'zh' && (
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <span className="bg-[#E50914] text-white text-[10px] font-black px-2 py-0.5 rounded">DONGHUA</span>
                <span className="text-gray-500 text-xs italic">{tv.original_name}</span>
              </div>
            )}

            <p className="text-gray-400 text-sm mb-6 line-clamp-3">{tv.overview}</p>

            <button onClick={() => setShowPlayer(!showPlayer)} className="bg-[#E50914] text-white font-black px-8 py-3 rounded-full flex items-center gap-2 mx-auto md:mx-0">
              <Play className="w-4 h-4 fill-current" /> {showPlayer ? "TUTUP" : "NONTON"}
            </button>
          </div>
        </div>

        {showPlayer && (
          <div className="mt-10">
            <div className="flex flex-wrap gap-2 mb-4">
              {allServers.map((s) => (
                <button key={s.id} onClick={() => setSelectedServerId(s.id)} className={`text-[10px] font-black px-4 py-2 rounded border transition-all ${selectedServerId === s.id ? "bg-[#E50914] border-[#E50914] text-white" : "bg-white/5 border-white/10 text-gray-500"}`}>
                  {s.name}
                </button>
              ))}
            </div>

            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/5">
              {isScraping && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                  <Loader2 className="w-8 h-8 animate-spin text-[#E50914] mb-2" />
                  <p className="text-[10px] text-white font-black">MENCARI VIDEO...</p>
                </div>
              )}
              <iframe src={getFinalUrl()} className="absolute inset-0 w-full h-full" allowFullScreen />
            </div>
          </div>
        )}

        <div className="mt-10">
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
            {Array.from({ length: tv.number_of_seasons || 1 }, (_, i) => i + 1).map((s) => (
              <button key={s} onClick={() => { setSelectedSeason(s); setSelectedEpisode(1); }} className={`flex-shrink-0 px-6 py-2 rounded-full text-[10px] font-black ${selectedSeason === s ? "bg-white text-black" : "bg-white/5 text-gray-500"}`}>SEASON {s}</button>
            ))}
          </div>
          
          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {season?.episodes.map((ep) => (
              <button key={ep.episode_number} onClick={() => { setSelectedEpisode(ep.episode_number); setShowPlayer(true); }} className={`py-3 rounded-lg border text-[10px] font-black transition-all ${selectedEpisode === ep.episode_number ? "bg-[#E50914] border-[#E50914] text-white" : "bg-white/5 border-white/5 text-gray-500"}`}>
                {ep.episode_number}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
