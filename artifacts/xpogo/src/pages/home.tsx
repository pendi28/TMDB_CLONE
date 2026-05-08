import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, Play, Heart, Star, ChevronLeft, ChevronRight, Film, Tv2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";
import type { TmdbListResult, TmdbListItem, TmdbMovie, CustomMovie } from "@/lib/types";
import ContentRow from "@/components/ContentRow";
import MovieCard from "@/components/MovieCard";

const BACKDROP_BASE = "https://image.tmdb.org/t/p/original";
const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
const POSTER_DETAIL = "https://image.tmdb.org/t/p/w500";

/* ── Star Rating ─────────────────────────────────────────── */
function StarRating({ score, showNum = false }: { score?: number; showNum?: boolean }) {
  const val = score ?? 0;
  const stars = Math.round(val / 2);
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className="w-3.5 h-3.5"
            fill={i <= stars ? "#f5c518" : "none"}
            stroke={i <= stars ? "#f5c518" : "#555"}
            strokeWidth={1.5}
          />
        ))}
      </div>
      {showNum && <span className="text-[#f5c518] text-sm font-bold ml-1">{val.toFixed(1)}</span>}
    </div>
  );
}

/* ── Horizontal Carousel ─────────────────────────────────── */
function HorrorCarousel({ items, mediaType }: { items: TmdbListItem[]; mediaType?: "movie" | "tv" }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  return (
    <div className="relative group">
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div className="bg-[#8B0000] hover:bg-[#E50914] text-white rounded-r w-7 h-14 flex items-center justify-center transition-colors shadow-lg">
          <ChevronLeft className="w-5 h-5" />
        </div>
      </button>

      <div ref={rowRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 pl-1 pr-1">
        {items.map((item) => {
          const type = (item.media_type as "movie" | "tv") ?? mediaType ?? "movie";
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

      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <div className="bg-[#8B0000] hover:bg-[#E50914] text-white rounded-l w-7 h-14 flex items-center justify-center transition-colors shadow-lg">
          <ChevronRight className="w-5 h-5" />
        </div>
      </button>
    </div>
  );
}

/* ── Custom Movie Card ───────────────────────────────────── */
function CustomMovieCard({ m }: { m: CustomMovie }) {
  return (
    <Link href={m.tmdbId ? `/movie/${m.tmdbId}` : `/movie/${m.id}`}>
      <div className="horror-card flex-shrink-0 w-32 cursor-pointer group">
        <div className="relative rounded overflow-hidden aspect-[2/3] bg-[#1a0000] mb-1.5 border border-[#8B0000]/30">
          {m.posterUrl ? (
            <img src={m.posterUrl} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-8 h-8 text-[#8B0000]" />
            </div>
          )}
          <div className="absolute top-1 left-1 bg-[#E50914]/90 text-white text-[9px] font-bold px-1 py-0.5 rounded uppercase">
            {m.type === "series" ? "Series" : "Film"}
          </div>
        </div>
        <p className="text-gray-300 text-[11px] leading-tight line-clamp-2">{m.title}</p>
      </div>
    </Link>
  );
}

/* ── Featured Movie Card ─────────────────────────────────── */
function FeaturedMovie({ item }: { item: TmdbListItem }) {
  const type = (item.media_type as "movie" | "tv") ?? "movie";
  const title = item.title ?? item.name ?? "";
  const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);

  const { data: detail } = useQuery<TmdbMovie>({
    queryKey: ["featured-detail", item.id, type],
    queryFn: () => type === "tv" ? tmdb.tvDetail(item.id) as any : tmdb.movieDetail(item.id),
    enabled: !!item.id,
  });

  const runtime = (detail as any)?.runtime ?? (detail as any)?.episode_run_time?.[0];
  const genres = detail?.genres?.slice(0, 2).map((g) => g.name).join(", ") ?? "";
  const director = (detail as any)?.credits?.crew?.find((c: any) => c.job === "Director")?.name
    ?? (detail as any)?.created_by?.[0]?.name ?? "—";
  const score = item.vote_average ?? 0;
  const votes = (detail as any)?.vote_count ?? 0;

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#8B0000]/30 shadow-[0_0_30px_rgba(139,0,0,0.3)]">
      {/* Backdrop */}
      {item.backdrop_path && (
        <div className="absolute inset-0">
          <img
            src={`${BACKDROP_BASE}${item.backdrop_path}`}
            alt={title}
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0000] via-[#0d0000]/80 to-[#0d0000]/50" />
        </div>
      )}

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5">
        {/* Poster */}
        <div className="flex-shrink-0">
          <div className="w-24 sm:w-28 rounded overflow-hidden border border-[#8B0000]/50 shadow-lg">
            {item.poster_path ? (
              <img src={`${POSTER_DETAIL}${item.poster_path}`} alt={title} className="w-full aspect-[2/3] object-cover" />
            ) : (
              <div className="w-full aspect-[2/3] bg-[#1a0000] flex items-center justify-center">
                <Film className="w-8 h-8 text-[#8B0000]" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-white text-xl sm:text-2xl font-black mb-2 leading-tight">{title}</h2>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3 text-sm">
            {genres && (
              <div className="flex gap-2">
                <span className="text-gray-500 text-xs uppercase tracking-wider w-16">Genre</span>
                <span className="text-gray-200 text-xs">{genres}</span>
              </div>
            )}
            {runtime && (
              <div className="flex gap-2">
                <span className="text-gray-500 text-xs uppercase tracking-wider w-16">Durasi</span>
                <span className="text-gray-200 text-xs">{Math.floor(runtime / 60)}j {runtime % 60}m</span>
              </div>
            )}
            {director !== "—" && (
              <div className="flex gap-2">
                <span className="text-gray-500 text-xs uppercase tracking-wider w-16">Sutradara</span>
                <span className="text-gray-200 text-xs line-clamp-1">{director}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="text-gray-500 text-xs uppercase tracking-wider w-16">Rating Usia</span>
              <span className="text-gray-200 text-xs">17+</span>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[#f5c518] text-2xl font-black">{score.toFixed(1)}</span>
            <div>
              <StarRating score={score} />
              <p className="text-gray-500 text-[10px] mt-0.5">{votes.toLocaleString()} vote</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap gap-3">
            <Link href={type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`}>
              <button className="flex items-center gap-2 bg-[#E50914] hover:bg-[#CC0000] text-white text-sm font-bold px-5 py-2 rounded transition-colors shadow-[0_0_12px_rgba(229,9,20,0.4)]">
                <Play className="w-4 h-4 fill-white" />
                Watch Trailer
              </button>
            </Link>
            <button className="flex items-center gap-2 border border-[#8B0000] hover:border-[#E50914] bg-[#1a0000] hover:bg-[#8B0000]/20 text-white text-sm font-bold px-5 py-2 rounded transition-colors">
              <Heart className="w-4 h-4 text-[#E50914]" />
              Add to Favorit
            </button>
          </div>
        </div>

        {/* Right poster (decorative) */}
        <div className="hidden lg:block flex-shrink-0">
          <div className="w-20 rounded overflow-hidden border border-[#8B0000]/30 opacity-60">
            {item.poster_path && (
              <img src={`${POSTER_DETAIL}${item.poster_path}`} alt="" className="w-full aspect-[2/3] object-cover" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section Header ──────────────────────────────────────── */
function SectionHeader({ title, searchable = false }: { title: string; searchable?: boolean }) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-[#E50914] rounded-full flex-shrink-0" />
        <h2 className="text-white text-sm font-black uppercase tracking-widest">{title}</h2>
      </div>
      {searchable && (
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <span className="text-gray-400 text-xs uppercase tracking-widest font-bold">SEARCH</span>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#E50914]" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="..."
              className="bg-[#1a0000] border border-[#8B0000]/50 text-white text-xs rounded pl-7 pr-3 py-1.5 w-32 focus:outline-none focus:border-[#E50914] placeholder:text-gray-700"
            />
          </div>
        </form>
      )}
    </div>
  );
}

/* ── Main Home Page ──────────────────────────────────────── */
export default function HomePage() {
  const { data: trending } = useQuery<TmdbListResult>({
    queryKey: ["trending"],
    queryFn: () => tmdb.trending(),
  });
  const { data: popularMovies } = useQuery<TmdbListResult>({
    queryKey: ["popular-movies"],
    queryFn: () => tmdb.popularMovies(),
  });
  const { data: popularTv } = useQuery<TmdbListResult>({
    queryKey: ["popular-tv"],
    queryFn: () => tmdb.popularTv(),
  });
  const { data: topMovies } = useQuery<TmdbListResult>({
    queryKey: ["top-movies"],
    queryFn: () => tmdb.topMovies(),
  });
  const { data: nowPlaying } = useQuery<TmdbListResult>({
    queryKey: ["now-playing"],
    queryFn: () => tmdb.nowPlaying(),
  });
  const { data: upcoming } = useQuery<TmdbListResult>({
    queryKey: ["upcoming"],
    queryFn: () => tmdb.upcoming(),
  });
  const { data: topTv } = useQuery<TmdbListResult>({
    queryKey: ["top-tv"],
    queryFn: () => tmdb.topTv(),
  });
  const { data: customMovies = [] } = useQuery<CustomMovie[]>({
    queryKey: ["custom_movies"],
    queryFn: fb.getCustomMovies,
  });

  const trendingItems = trending?.results ?? [];
  const featured = trendingItems[0];
  const carouselItems = trendingItems.slice(0, 12);
  const seeMoreItems = trendingItems.slice(12, 20);

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(to bottom, #0d0000 0%, #100000 40%, #0a0000 100%)",
        paddingTop: "calc(56px + var(--banner-top-height, 0px))",
      }}
    >
      {/* ── Hero Backdrop ──────────────────────────── */}
      {featured?.backdrop_path && (
        <div className="relative h-52 sm:h-64 overflow-hidden">
          <img
            src={`${BACKDROP_BASE}${featured.backdrop_path}`}
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0000]/30 via-transparent to-[#0d0000]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0000]/60 to-transparent" />

          {/* Blood drip effect */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0d0000] to-transparent" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 -mt-8 relative z-10">

        {/* ── CHOOSE YOUR MOVIE carousel ─────────────── */}
        <section className="mb-8">
          <SectionHeader title="CHOOSE YOUR MOVIE" searchable />
          <HorrorCarousel items={carouselItems} />
        </section>

        {/* ── Featured Movie (Siksa Neraka style) ──── */}
        {featured && (
          <section className="mb-8">
            <FeaturedMovie item={featured} />
          </section>
        )}

        {/* ── Custom Movies (from Firebase) ─────────── */}
        {customMovies.length > 0 && (
          <section className="mb-8">
            <SectionHeader title="KOLEKSI KAMI" />
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {customMovies.map((m) => (
                <CustomMovieCard key={m.id} m={m} />
              ))}
            </div>
          </section>
        )}

        {/* ── Now Playing ──────────────────────────── */}
        {(nowPlaying?.results?.length ?? 0) > 0 && (
          <section className="mb-8">
            <SectionHeader title="NOW PLAYING" />
            <HorrorCarousel items={nowPlaying!.results} mediaType="movie" />
          </section>
        )}

        {/* ── Popular Movies ────────────────────────── */}
        {(popularMovies?.results?.length ?? 0) > 0 && (
          <section className="mb-8">
            <SectionHeader title="POPULAR MOVIES" />
            <HorrorCarousel items={popularMovies!.results} mediaType="movie" />
          </section>
        )}

        {/* ── Top Rated Movies ─────────────────────── */}
        {(topMovies?.results?.length ?? 0) > 0 && (
          <section className="mb-8">
            <div className="section-divider pt-6 mb-4" />
            <SectionHeader title="TOP RATED MOVIES" />
            <HorrorCarousel items={topMovies!.results} mediaType="movie" />
          </section>
        )}

        {/* ── Upcoming Movies ──────────────────────── */}
        {(upcoming?.results?.length ?? 0) > 0 && (
          <section className="mb-8">
            <SectionHeader title="UPCOMING" />
            <HorrorCarousel items={upcoming!.results} mediaType="movie" />
          </section>
        )}

        {/* ── Popular TV Shows ─────────────────────── */}
        {(popularTv?.results?.length ?? 0) > 0 && (
          <section className="mb-8">
            <div className="section-divider pt-6 mb-4" />
            <SectionHeader title="POPULAR TV SHOWS" />
            <HorrorCarousel items={popularTv!.results} mediaType="tv" />
          </section>
        )}

        {/* ── Top Rated TV ─────────────────────────── */}
        {(topTv?.results?.length ?? 0) > 0 && (
          <section className="mb-8">
            <SectionHeader title="TOP RATED SERIES" />
            <HorrorCarousel items={topTv!.results} mediaType="tv" />
          </section>
        )}

        {/* ── SEE MORE (Trending) ───────────────────── */}
        {seeMoreItems.length > 0 && (
          <section className="mb-8">
            <div className="section-divider pt-6 mb-4" />
            <SectionHeader title="SEE MORE" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {seeMoreItems.map((item) => {
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
          </section>
        )}

        {/* ── Browse Sections ──────────────────────── */}
        <div className="section-divider pt-6 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {[
            { href: "/movies", label: "ALL MOVIES", icon: Film, desc: "Film populer, top rated, upcoming" },
            { href: "/tv", label: "TV SHOWS", icon: Tv2, desc: "Series populer & top rated" },
            { href: "/movies/now-playing", label: "NOW PLAYING", icon: Play, desc: "Tayang sekarang di bioskop" },
            { href: "/movies/top-rated", label: "TOP RATED", icon: Star, desc: "Film dengan rating tertinggi" },
            { href: "/movies/upcoming", label: "UPCOMING", icon: Film, desc: "Segera hadir" },
            { href: "/tv/top-rated", label: "BEST SERIES", icon: Tv2, desc: "Series terbaik sepanjang masa" },
          ].map(({ href, label, icon: Icon, desc }) => (
            <Link key={href} href={href}>
              <div className="group border border-[#8B0000]/30 bg-[#1a0000]/50 hover:bg-[#1a0000] hover:border-[#E50914]/50 rounded-lg p-3 transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-[#E50914]" />
                  <span className="text-white text-xs font-black tracking-widest">{label}</span>
                </div>
                <p className="text-gray-500 text-[10px]">{desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Footer ───────────────────────────────── */}
        <div className="text-center py-6 border-t border-[#8B0000]/20">
          <p className="text-[#8B0000] text-xs font-black tracking-widest">XPOGO</p>
          <p className="text-gray-700 text-[10px] mt-1">© 2025 • Movie & Series Streaming</p>
        </div>
      </div>
    </div>
  );
}
