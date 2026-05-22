import { Link } from "wouter";
import { Star } from "lucide-react";

interface MovieCardProps {
  id: number;
  title: string;
  posterPath?: string | null;
  rating?: number;
  year?: string;
  mediaType?: "movie" | "tv";
  size?: "sm" | "md" | "lg";
}

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

function StarRating({ score }: { score?: number }) {
  const stars = Math.round((score ?? 0) / 2);
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="w-3 h-3"
          fill={i <= stars ? "#f5c518" : "none"}
          stroke={i <= stars ? "#f5c518" : "#444"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export default function MovieCard({
  id,
  title,
  posterPath,
  rating,
  year,
  mediaType = "movie",
  size = "md",
}: MovieCardProps) {
  const href = mediaType === "tv" ? `/tv/${id}` : `/movie/${id}`;

  const widthClass =
    size === "sm" ? "w-24" : size === "lg" ? "w-44" : "w-32";

  return (
    <Link href={href}>
      <div className={`horror-card flex-shrink-0 ${widthClass} cursor-pointer group`}>
        {/* Poster */}
        <div className="relative rounded overflow-hidden aspect-[2/3] bg-[#1a1a1a] mb-1.5">
          {posterPath ? (
            <img
              src={`${POSTER_BASE}${posterPath}`}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a]">
              <span className="text-[#E50914] text-2xl">🎬</span>
            </div>
          )}

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Year badge */}
          {year && (
            <div className="absolute top-1 left-1 bg-black/70 text-gray-300 text-[9px] font-semibold px-1.5 py-0.5 rounded">
              {year}
            </div>
          )}

          {/* Type badge */}
          <div className="absolute top-1 right-1 bg-[#E50914] text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
            {mediaType === "tv" ? "Series" : "Film"}
          </div>

          {/* Play hint on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/60 flex items-center justify-center">
              <span className="text-white text-lg ml-0.5">▶</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <p className="text-gray-200 text-[11px] leading-tight line-clamp-2 font-medium">{title}</p>

        {/* Stars */}
        <StarRating score={rating} />

        {/* See more link on hover */}
        <p className="text-[#E50914] text-[10px] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          Lihat detail
        </p>
      </div>
    </Link>
  );
}
