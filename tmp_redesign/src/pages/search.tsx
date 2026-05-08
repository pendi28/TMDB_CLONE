import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import type { TmdbListResult, TmdbListItem } from "@/lib/types";
import MovieCard from "@/components/MovieCard";

export default function SearchPage() {
  const [location] = useLocation();
  const initialQ = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  ).get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    setQuery(q);
    setDebouncedQ(q);
  }, [location]);

  const { data, isLoading } = useQuery<TmdbListResult>({
    queryKey: ["search", debouncedQ],
    queryFn: () => tmdb.search(debouncedQ),
    enabled: debouncedQ.length > 1,
  });

  const results = (data?.results ?? []).filter(
    (r: TmdbListItem) => r.media_type === "movie" || r.media_type === "tv"
  );

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: "linear-gradient(to bottom, #0d0000, #0a0000)",
        paddingTop: "calc(56px + var(--banner-top-height, 0px) + 24px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Search bar */}
        <div className="mb-8 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E50914]" />
            <input
              type="text"
              placeholder="Cari film, series..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="w-full bg-[#1a0000] border border-[#8B0000] text-white rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-[#E50914] placeholder:text-gray-600 text-sm"
            />
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#E50914] animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-[#E50914] rounded-full" />
              <h2 className="text-white text-sm font-black uppercase tracking-widest">
                Hasil untuk "{debouncedQ}" <span className="text-gray-500 font-normal">({results.length} ditemukan)</span>
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
              {results.map((item: TmdbListItem) => {
                const type = (item.media_type as "movie" | "tv") ?? "movie";
                const title = item.title ?? item.name ?? "";
                const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
                return (
                  <MovieCard
                    key={item.id}
                    id={item.id}
                    title={title}
                    posterPath={item.poster_path}
                    rating={item.vote_average}
                    year={year}
                    mediaType={type}
                  />
                );
              })}
            </div>
          </>
        ) : debouncedQ.length > 1 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-white text-lg font-bold mb-2">Tidak ditemukan</h3>
            <p className="text-gray-500 text-sm">Coba kata kunci lain</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-12 h-12 text-[#8B0000] mb-4" />
            <p className="text-gray-500 text-sm">Ketik untuk mencari film atau series</p>
          </div>
        )}
      </div>
    </div>
  );
}
