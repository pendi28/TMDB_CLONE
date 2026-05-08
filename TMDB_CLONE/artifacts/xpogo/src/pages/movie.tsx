import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { Star, Clock, Calendar, Play, ChevronLeft, Server, Heart } from "lucide-react";
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

export default function MoviePage() {
  const { id } = useParams<{ id: string }>();
  const movieId = Number(id);
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeServerId, setActiveServerId] = useState<string>("peachify");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isPeachify = activeServerId === "peachify";

  usePeachifyPostMessage(isPeachify && showPlayer);

  const { data: movie, isLoading } = useQuery<TmdbMovie>({
    queryKey: ["movie", movieId],
    queryFn: () => tmdb.movieDetail(movieId),
    enabled: !!movieId,
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
    queryFn: fb.getSettings,
  });

  if (isLoading || !movie) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0000" }}>
        <div className="w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
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
    const builtin = BUILTIN_LIST.find((b) => b.id === activeServerId);
    const custom = customServers.find((s) => s.id === activeServerId);
    let template = builtin ? builtin.url : custom?.url;
    if (!template) return "";
    template = template
      .replace("{type}", "movie")
      .replace("{id}", String(movieId));
    return template;
  };

  const enabledBuiltins = BUILTIN_LIST.filter(
    (b) => b.id === "peachify" || (builtinStates as BuiltinServerState)?.[b.id] !== false
  );
  const activeCustom = (customServers as CustomServer[]).filter((s) => s.active);
  const allServers = [...enabledBuiltins, ...activeCustom];

  const genres = movie.genres?.map((g) => g.name).join(", ") ?? "";
  const runtime = movie.runtime;
  const year = movie.release_date?.slice(0, 4) ?? "";
  const director = (movie as any)?.credits?.crew?.find((c: any) => c.job === "Director")?.name;

  return (
    <div className="min-h-screen pb-16" style={{ background: "linear-gradient(to bottom, #0d0000, #0a0000)", paddingTop: "calc(56px + var(--banner-top-height, 0px))" }}>

      {/* Backdrop */}
      {movie.backdrop_path && (
        <div className="relative h-56 sm:h-72 overflow-hidden">
          <img src={`${IMG_BASE}/original${movie.backdrop_path}`} alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0d0000]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0000]/70 to-transparent" />
          {/* Back button */}
          <Link href="/" className="absolute top-4 left-4 flex items-center gap-1 bg-black/60 hover:bg-[#8B0000] text-white text-sm font-bold px-3 py-1.5 rounded border border-[#8B0000]/50 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10 relative z-10">
        <div className="flex flex-col sm:flex-row gap-6">

          {/* Poster */}
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            <div className="w-36 sm:w-44 rounded-lg overflow-hidden border border-[#8B0000]/50 shadow-[0_0_20px_rgba(139,0,0,0.4)]">
              {movie.poster_path ? (
                <img src={`${IMG_BASE}/w500${movie.poster_path}`} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
              ) : (
                <div className="w-full aspect-[2/3] bg-[#1a0000] flex items-center justify-center">
                  <span className="text-4xl">🎬</span>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-2xl sm:text-3xl font-black mb-2 leading-tight">{movie.title}</h1>

            {/* Meta badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              {year && (
                <span className="bg-[#8B0000]/30 border border-[#8B0000]/50 text-gray-300 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#E50914]" />{year}
                </span>
              )}
              {runtime && (
                <span className="bg-[#8B0000]/30 border border-[#8B0000]/50 text-gray-300 text-xs px-2 py-0.5 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#E50914]" />{Math.floor(runtime / 60)}j {runtime % 60}m
                </span>
              )}
              {genres && (
                <span className="bg-[#8B0000]/30 border border-[#8B0000]/50 text-gray-300 text-xs px-2 py-0.5 rounded">{genres}</span>
              )}
            </div>

            {/* Rating */}
            <div className="mb-4">
              <StarRating score={movie.vote_average} />
              <p className="text-gray-600 text-xs mt-0.5">{movie.vote_count?.toLocaleString()} votes</p>
            </div>

            {/* Director */}
            {director && (
              <p className="text-gray-400 text-sm mb-3">
                <span className="text-gray-600 uppercase tracking-wider text-xs">Sutradara: </span>
                <span className="text-gray-200">{director}</span>
              </p>
            )}

            {/* Overview */}
            {movie.overview && (
              <p className="text-gray-400 text-sm leading-relaxed mb-5 line-clamp-3">{movie.overview}</p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowPlayer(!showPlayer)}
                className="flex items-center gap-2 bg-[#E50914] hover:bg-[#CC0000] text-white font-bold px-6 py-2.5 rounded transition-colors shadow-[0_0_16px_rgba(229,9,20,0.4)]"
              >
                <Play className="w-4 h-4 fill-white" />
                {showPlayer ? "Tutup Player" : "Watch Now"}
              </button>
              <button className="flex items-center gap-2 border border-[#8B0000] hover:border-[#E50914] bg-[#1a0000] text-white font-bold px-6 py-2.5 rounded transition-colors">
                <Heart className="w-4 h-4 text-[#E50914]" />
                Favorit
              </button>
            </div>
          </div>
        </div>

        {/* ── Player Section ───────────────────────────────── */}
        {showPlayer && (
          <div className="mt-8">
            {/* Server selector */}
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="flex items-center gap-2 mr-2">
                <Server className="w-4 h-4 text-[#E50914]" />
                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Server</span>
              </div>
              {allServers.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveServerId(s.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded border transition-colors ${
                    activeServerId === s.id
                      ? "bg-[#E50914] border-[#E50914] text-white"
                      : "border-[#8B0000]/50 bg-[#1a0000] text-gray-300 hover:border-[#E50914] hover:text-white"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>

            {/* iframe */}
            <div className="relative w-full bg-black rounded-lg overflow-hidden border border-[#8B0000]/30 shadow-[0_0_30px_rgba(139,0,0,0.3)]" style={{ paddingTop: "56.25%" }}>
              <iframe
                ref={iframeRef}
                src={getFinalPlayerUrl()}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}

        {/* ── Similar Movies ───────────────────────────────── */}
        {(movie as any)?.similar?.results?.length > 0 && (
          <div className="mt-10 border-t border-[#8B0000]/20 pt-8">
            <ContentRow
              title="Film Serupa"
              items={(movie as any).similar.results}
              mediaType="movie"
            />
          </div>
        )}
      </div>
    </div>
  );
}
