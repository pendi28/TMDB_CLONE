import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { Star, Clock, Calendar, Play, ChevronLeft, Server } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";
import type { TmdbMovie, Settings, CustomServer, BuiltinServerState } from "@/lib/types";
import ContentRow from "@/components/ContentRow";
import { usePeachifyPostMessage, getSavedStartAt } from "@/hooks/usePlayerProgress";

const IMG_BASE = "https://image.tmdb.org/t/p";

const BUILTIN_LIST = [
  { id: "peachify",  name: "🍑 Peachify VIP", url: "peachify" },
  { id: "myvercel",  name: "Server Utama",      url: "https://myvercel-player.vercel.app/embed/{type}/{id}" },
  { id: "vidking",   name: "ZxcStream",          url: "https://zxcstream.xyz/player/movie/{id}" },
  { id: "vidsrc",    name: "VidSrc",             url: "https://vidsrc.to/embed/{type}/{id}" },
  { id: "vidsrcxyz", name: "VidSrc.xyz",         url: "https://vidsrc.xyz/embed/{type}/{id}" },
];

export default function MoviePage() {
  const { id }  = useParams<{ id: string }>();
  const movieId = Number(id);
  const [showPlayer, setShowPlayer]     = useState(false);
  const [activeServerId, setActiveServerId] = useState<string>("peachify");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isPeachify = activeServerId === "peachify";

  usePeachifyPostMessage(isPeachify && showPlayer);

  const { data: movie, isLoading } = useQuery<TmdbMovie>({
    queryKey: ["movie", movieId],
    queryFn:  () => tmdb.movieDetail(movieId),
    enabled:  !!movieId,
  });

  const { data: builtinStates } = useQuery<BuiltinServerState>({
    queryKey: ["builtin_server_states"],
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

  if (isLoading || !movie) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getFinalPlayerUrl = () => {
    if (activeServerId === "peachify") {
      const accent = (settings?.playerColor ?? "E50914").replace("#", "");
      const startAt = getSavedStartAt(movieId);
      const params = new URLSearchParams({ accent, quality: "1080" });
      if (startAt > 0) params.set("startAt", String(Math.floor(startAt)));
      return `https://peachify.top/embed/movie/${movieId}?${params}`;
    }

    const builtin = BUILTIN_LIST.find(b => b.id === activeServerId);
    const custom  = customServers.find(s => s.id === activeServerId);
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
      return `https://zxcstream.xyz/player/movie/${movieId}?${params}`;
    }

    return template
      .replace(/{id}/g,   String(movieId))
      .replace(/{type}/g, "movie")
      .replace(/{imdb}/g, movie.imdb_id || "");
  };

  const playerUrl = getFinalPlayerUrl();
  const runtime   = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null;
  const year      = movie.release_date?.slice(0, 4);
  const genres    = movie.genres?.map((g) => g.name).join(", ");

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
          <>
            {movie.backdrop_path && (
              <img
                src={`${IMG_BASE}/original${movie.backdrop_path}`}
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setShowPlayer(true)}
                className="w-16 h-16 rounded-full bg-red-600 hover:scale-110 transition-transform flex items-center justify-center shadow-2xl"
              >
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </button>
            </div>
          </>
        )}
        <Link href="/" className="absolute top-20 left-4 flex items-center gap-1 text-white/80 hover:text-white text-sm">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 pb-20">
        <div className="mb-8 p-4 bg-gray-900/50 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 mb-4 text-white font-bold text-sm">
            <Server className="w-4 h-4 text-red-500" /> Pilih Server
          </div>
          <div className="flex flex-wrap gap-2">
            {BUILTIN_LIST.filter(s => builtinStates?.[s.id] !== false).map((srv) => (
              <button
                key={srv.id}
                onClick={() => { setActiveServerId(srv.id); setShowPlayer(true); }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  activeServerId === srv.id
                    ? srv.id === "peachify"
                      ? "bg-red-600 text-white ring-2 ring-red-400"
                      : "bg-red-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {srv.name}
              </button>
            ))}
            {customServers.filter(s => s.active).map((srv) => (
              <button
                key={srv.id}
                onClick={() => { setActiveServerId(srv.id); setShowPlayer(true); }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  activeServerId === srv.id ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {srv.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          <div className="hidden sm:block flex-shrink-0">
            {movie.poster_path && (
              <img src={`${IMG_BASE}/w342${movie.poster_path}`} alt={movie.title} className="w-40 rounded-md shadow-2xl" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-gray-400">
              {movie.vote_average > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white">{movie.vote_average?.toFixed(1)}</span>
                </span>
              )}
              {year    && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {year}</span>}
              {runtime && <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {runtime}</span>}
              {genres  && <span>{genres}</span>}
            </div>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">{movie.overview}</p>
          </div>
        </div>

        {(movie.similar?.results?.length ?? 0) > 0 && (
          <div className="mt-10">
            <ContentRow title="Similar Movies" items={movie.similar!.results} mediaType="movie" />
          </div>
        )}
      </div>
    </div>
  );
}
