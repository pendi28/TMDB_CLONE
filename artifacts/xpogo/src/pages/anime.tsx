import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { anilist } from "@/lib/anilist";
import type { AniListMedia } from "@/lib/anilist";

const SCORE = (s: number | null) => s ? (s / 10).toFixed(1) : "?";

function AnimeCard({ media, href }: { media: AniListMedia; href: string }) {
  const title = media.title.english || media.title.romaji;
  const year = media.startDate.year ?? "";
  const score = media.averageScore;
  const stars = Math.round((score ?? 0) / 20);

  return (
    <Link href={href}>
      <div className="horror-card flex-shrink-0 w-[100px] sm:w-[120px] cursor-pointer group">
        <div className="relative rounded overflow-hidden aspect-[2/3] bg-[#1a0000] mb-1.5 border border-[#8B0000]/30">
          <img
            src={media.coverImage.large}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {year && (
            <div className="absolute top-1 left-1 bg-black/80 text-[#E50914] text-[9px] font-bold px-1 py-0.5 rounded">
              {year}
            </div>
          )}
          <div className="absolute top-1 right-1 bg-[#7c3aed]/90 text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase">
            ANIME
          </div>
        </div>
        <p className="text-gray-200 text-[11px] leading-tight line-clamp-2 font-medium">{title}</p>
        <div className="flex items-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="w-3 h-3"
              fill={i <= stars ? "#f5c518" : "none"}
              stroke={i <= stars ? "#f5c518" : "#555"} strokeWidth={1.5} />
          ))}
        </div>
      </div>
    </Link>
  );
}

function AnimeRow({ title, items, type = "ANIME" }: { title: string; items: AniListMedia[]; type?: string }) {
  const [idx, setIdx] = useState(0);
  const visible = 6;

  if (!items.length) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3 px-4 sm:px-0">
        <div className="w-1 h-5 bg-[#7c3aed] rounded-full" />
        <h2 className="text-white text-base font-black uppercase tracking-widest">{title}</h2>
      </div>
      <div className="relative group">
        {idx > 0 && (
          <button onClick={() => setIdx(i => Math.max(0, i - visible))}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-16 bg-gradient-to-r from-[#0d0000] to-transparent flex items-center justify-start pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-[#7c3aed]/80 hover:bg-[#7c3aed] text-white rounded p-1 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </div>
          </button>
        )}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-0 pb-2">
          {items.slice(idx, idx + 20).map((m) => (
            <AnimeCard key={m.id} media={m} href={type === "MANGA" ? `/manga/${m.id}` : `/anime/${m.id}`} />
          ))}
        </div>
        {idx + visible < items.length && (
          <button onClick={() => setIdx(i => i + visible)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-16 bg-gradient-to-l from-[#0d0000] to-transparent flex items-center justify-end pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-[#7c3aed]/80 hover:bg-[#7c3aed] text-white rounded p-1 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

export default function AnimePage() {
  const { data: trending } = useQuery({ queryKey: ["al-trending"], queryFn: () => anilist.trending(1) });
  const { data: popular }  = useQuery({ queryKey: ["al-popular"],  queryFn: () => anilist.popular(1) });
  const { data: topRated } = useQuery({ queryKey: ["al-top"],      queryFn: () => anilist.topRated(1) });
  const { data: seasonal } = useQuery({ queryKey: ["al-seasonal"], queryFn: () => anilist.seasonal(1) });
  const { data: manga }    = useQuery({ queryKey: ["al-manga"],    queryFn: () => anilist.mangaPopular(1) });

  const heroItem = trending?.Page?.media?.[0];
  const heroTitle = heroItem ? (heroItem.title.english || heroItem.title.romaji) : "";

  return (
    <div className="min-h-screen pb-20" style={{ background: "linear-gradient(to bottom, #0d0000, #0a0000)" }}>
      {/* Hero */}
      {heroItem && (
        <div className="relative w-full h-[55vw] max-h-[480px] min-h-[220px] overflow-hidden">
          {heroItem.bannerImage ? (
            <img src={heroItem.bannerImage} alt={heroTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #1a0030, #0d0000)" }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0000] via-[#0d0000]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0000]/80 to-transparent" />
          <div className="absolute bottom-8 left-4 sm:left-8 max-w-lg">
            <div className="flex gap-1.5 mb-2">
              {heroItem.genres.slice(0, 3).map(g => (
                <span key={g} className="text-[10px] bg-[#7c3aed]/80 text-white px-2 py-0.5 rounded font-bold">{g}</span>
              ))}
            </div>
            <h1 className="text-white text-2xl sm:text-3xl font-black leading-tight mb-2">{heroTitle}</h1>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[#f5c518] font-bold text-sm">{SCORE(heroItem.averageScore)}/10</span>
              {heroItem.episodes && <span className="text-gray-400 text-xs">{heroItem.episodes} eps</span>}
              {heroItem.seasonYear && <span className="text-gray-400 text-xs">{heroItem.season} {heroItem.seasonYear}</span>}
            </div>
            {heroItem.description && (
              <p className="text-gray-300 text-xs line-clamp-3 max-w-sm"
                dangerouslySetInnerHTML={{ __html: heroItem.description.replace(/<[^>]+>/g, "") }} />
            )}
            <Link href={`/anime/${heroItem.id}`}>
              <button className="mt-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold px-6 py-2 rounded-full text-sm transition-colors">
                Lihat Detail
              </button>
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto pt-6" style={{ paddingTop: heroItem ? "1.5rem" : "calc(56px + 2rem)" }}>
        {trending?.Page?.media && <AnimeRow title="Trending Anime" items={trending.Page.media} />}
        {seasonal?.Page?.media && <AnimeRow title="Musim Ini" items={seasonal.Page.media} />}
        {popular?.Page?.media  && <AnimeRow title="Anime Populer" items={popular.Page.media} />}
        {topRated?.Page?.media && <AnimeRow title="Anime Top Rated" items={topRated.Page.media} />}
        {manga?.Page?.media    && <AnimeRow title="Manga Populer" items={manga.Page.media} type="MANGA" />}
      </div>
    </div>
  );
}
