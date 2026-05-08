import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { Star, Calendar, Play, ChevronLeft, Server } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";
import type { TmdbTvShow, TmdbSeason, Settings, CustomServer, BuiltinServerState } from "@/lib/types";
import ContentRow from "@/components/ContentRow";
import { usePeachifyPostMessage, getSavedStartAt } from "@/hooks/usePlayerProgress";

const IMG_BASE = "https://image.tmdb.org/t/p";

const BUILTIN = [
  { id: "peachify",  name: "🍑 Peachify VIP", url: "peachify" },
  { id: "myvercel",  name: "Server Utama",      url: "https://myvercel-player.vercel.app/embed/{type}/{id}" },
  { id: "vidking",   name: "ZxcStream",          url: "https://zxcstream.xyz/player/tv/{id}/{s}/{e}" },
  { id: "vidsrc",    name: "VidSrc",             url: "https://vidsrc.to/embed/{type}/{id}" },
  { id: "vidsrcxyz", name: "VidSrc.xyz",         url: "https://vidsrc.xyz/embed/{type}/{id}" },
];

export default function TvPage() {
  const { id } = useParams<{ id: string }>();
  const tvId   = Number(id);
  const [selectedSeason,  setSelectedSeason]  = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [showPlayer, setShowPlayer]           = useState(false);
  const [selectedServerId, setSelectedServerId] = useState("peachify");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isPeachify = selectedServerId === "peachify";

  usePeachifyPostMessage(isPeachify && showPlayer);

  const { data: tv, isLoading } = useQuery<TmdbTvShow>({
    queryKey: ["tv", tvId],
    queryFn:  () => tmdb.tvDetail(tvId),
    enabled:  !!tvId,
  });

  const { data: season } = useQuery<TmdbSeason>({
    queryKey: ["tv-season", tvId, selectedSeason],
    queryFn:  () => tmdb.tvSeason(tvId, selectedSeason),
    enabled:  !!tvId,
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
    queryFn:  fb.getSettings,
  });

  if (isLoading || !tv) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getFinalUrl = () => {
    if (selectedServerId === "peachify") {
      const accent   = (settings?.playerColor ?? "E50914").replace("#", "");
      const startAt  = getSavedStartAt(tvId, selectedSeason, selectedEpisode);
      const params   = new URLSearchParams({ accent, quality: "1080", autoNext: "1" });
      if (startAt > 0) params.set("startAt", String(Math.floor(startAt)));
      return `https://peachify.top/embed/tv/${tvId}/${selectedSeason}/${selectedEpisode}?${params}`;
    }

    const builtin = BUILTIN.find(b => b.id === selectedServerId);
    const custom  = customServers.find(s => s.id === selectedServerId);
    let template  = builtin ? builtin.url : custom?.url;
    if (!template) return "";

    if (!template.includes("/") && !isNaN(Number(template))) {
      const color  = (settings?.playerColor ?? "E50914").replace("#", "");
      const params = new URLSearchParams({
        server:   template,
        color:    color,
        autoplay: settings?.autoplay !== "false" ? "true" : "false",
        back:     "true",
      });
      return `https://zxcstream.xyz/player/tv/${tvId}/${selectedSeason}/${selectedEpisode}?${params}`;
    }

    return template
      .replace(/{id}/g,   String(tvId))
      .replace(/{type}/g, "tv")
      .replace(/{s}/g,    String(selectedSeason))
      .replace(/{e}/g,    String(selectedEpisode))
      .replace(/{imdb}/g, "");
  };

  const playerUrl = getFinalUrl();

  const handleEpisodeClick = (epNum: number) => {
    setSelectedEpisode(epNum);
    setShowPlayer(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#141414]">
      <div className="relative h-[50vh] min-h-[350px] bg-black">
        {showPlayer ? (
          <iframe
            ref={iframeRef}
            key={playerUrl}
            src={playerUrl}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; fullscreen"
            frameBorder="0"
          />
        ) : (
          <div className="absolute inset-0">
            {tv.backdrop_path && (
              <img
                src={`${IMG_BASE}/original${tv.backdrop_path}`}
                className="w-full h-full object-cover opacity-50"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setShowPlayer(true)}
                className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
              >
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </button>
            </div>
          </div>
        )}
        <Link href="/" className="absolute top-20 left-4 flex items-center gap-1 text-white/80 hover:text-white text-sm">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-8">
          <p className="text-gray-400 text-xs font-bold uppercase mb-3 flex items-center gap-2">
            <Server className="w-3 h-3" /> Pilih Server
          </p>
          <div className="flex flex-wrap gap-2">
            {BUILTIN.filter(s => builtinStates?.[s.id] !== false).map(srv => (
              <button
                key={srv.id}
                onClick={() => { setSelectedServerId(srv.id); setShowPlayer(true); }}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                  selectedServerId === srv.id
                    ? srv.id === "peachify"
                      ? "bg-red-600 text-white ring-2 ring-red-400"
                      : "bg-red-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {srv.name}
              </button>
            ))}
            {customServers.filter(s => s.active).map(srv => (
              <button
                key={srv.id}
                onClick={() => { setSelectedServerId(srv.id); setShowPlayer(true); }}
                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                  selectedServerId === srv.id ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {srv.name}
              </button>
            ))}
          </div>
        </div>

        <h2 className="text-white text-xl font-bold mb-4">Episodes</h2>
        <select
          value={selectedSeason}
          onChange={(e) => { setSelectedSeason(Number(e.target.value)); setSelectedEpisode(1); setShowPlayer(false); }}
          className="bg-gray-800 text-white p-2 rounded mb-4 focus:outline-none border-r-8 border-transparent"
        >
          {Array.from({ length: tv.number_of_seasons ?? 1 }, (_, i) => (
            <option key={i + 1} value={i + 1}>Season {i + 1}</option>
          ))}
        </select>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {season?.episodes?.map((ep) => (
            <button
              key={ep.episode_number}
              onClick={() => handleEpisodeClick(ep.episode_number)}
              className={`p-3 text-left rounded-md border transition-colors ${
                selectedEpisode === ep.episode_number
                  ? "border-red-600 bg-red-600/10"
                  : "border-gray-800 bg-gray-900 hover:border-gray-600"
              }`}
            >
              <p className="text-white text-sm font-bold">{ep.episode_number}. {ep.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
