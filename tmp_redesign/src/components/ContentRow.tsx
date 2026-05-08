import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";

interface ContentItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  mediaType?: "movie" | "tv";
  showTitle?: boolean;
}

export default function ContentRow({ title, items, mediaType, showTitle = true }: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "left" ? -360 : 360, behavior: "smooth" });
  };

  if (!items.length) return null;

  return (
    <div className="mb-6">
      {showTitle && (
        <div className="flex items-center gap-3 mb-3 px-4 sm:px-0">
          <div className="w-1 h-5 bg-[#E50914] rounded-full" />
          <h2 className="text-white text-base font-black uppercase tracking-widest">{title}</h2>
        </div>
      )}

      <div className="relative group">
        {/* Left arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-16 bg-gradient-to-r from-[#0d0000] to-transparent flex items-center justify-start pl-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="bg-[#8B0000]/80 hover:bg-[#E50914] text-white rounded p-1 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </div>
        </button>

        {/* Scroll container */}
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-0 pb-2"
        >
          {items.map((item) => {
            const type = (item.media_type as "movie" | "tv") ?? mediaType ?? "movie";
            const itemTitle = item.title ?? item.name ?? "";
            const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
            return (
              <MovieCard
                key={item.id}
                id={item.id}
                title={itemTitle}
                posterPath={item.poster_path}
                rating={item.vote_average}
                year={year}
                mediaType={type}
              />
            );
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-16 bg-gradient-to-l from-[#0d0000] to-transparent flex items-center justify-end pr-1 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="bg-[#8B0000]/80 hover:bg-[#E50914] text-white rounded p-1 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
}
