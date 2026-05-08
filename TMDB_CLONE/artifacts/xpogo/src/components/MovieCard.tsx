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
          stroke={i <= stars ? "#f5c518" : "#555"}
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
        <div className="relative rounded overflow-hidden aspect-[2/3] bg-[#1a0000] mb-1.5 border border-[#8B0000]/30">
          {posterPath ? (
            <img
              src={`${POSTER_BASE}${posterPath}`}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#1a0000]">
              <span className="text-[#8B0000] text-2xl">🎬</span>
            </div>
          )}

          {/* Dark red overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Year badge */}
          {year && (
            <div className="absolute top-1 left-1 bg-black/80 text-[#E50914] text-[9px] font-bold px-1 py-0.5 rounded">
              {year}
            </div>
          )}

          {/* Type badge */}
          <div className="absolute top-1 right-1 bg-[#E50914]/90 text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase">
            {mediaType === "tv" ? "Series" : "Film"}
          </div>
        </div>

        {/* Title */}
        <p className="text-gray-200 text-[11px] leading-tight line-clamp-2 font-medium">{title}</p>

        {/* Stars */}
        <StarRating score={rating} />

        {/* See more link */}
        <p className="text-[#E50914] text-[10px] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          See more
        </p>
      </div>
    </Link>
  );
}
