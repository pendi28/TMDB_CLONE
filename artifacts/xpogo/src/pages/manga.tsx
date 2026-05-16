import { Link, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, BookOpen } from "lucide-react";
import { anilist } from "@/lib/anilist";
import type { AniListMedia } from "@/lib/anilist";

const SCORE = (s: number | null) => s ? (s / 10).toFixed(1) : "N/A";

function MangaCard({ media }: { media: AniListMedia }) {
  const title = media.title.english || media.title.romaji;
  const score = media.averageScore;
  const stars = Math.round((score ?? 0) / 20);

  return (
    <Link href={`/manga/${media.id}`}>
      <div className="horror-card flex-shrink-0 w-[100px] sm:w-[120px] cursor-pointer group">
        <div className="relative rounded overflow-hidden aspect-[2/3] bg-[#1a0000] mb-1.5 border border-[#8B0000]/30">
          <img src={media.coverImage.large} alt={title} className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-1 right-1 bg-[#0369a1]/90 text-white text-[8px] font-bold px-1 py-0.5 rounded uppercase">
            MANGA
          </div>
          {media.chapters && (
            <div className="absolute bottom-1 left-1 bg-black/80 text-gray-300 text-[8px] px-1 py-0.5 rounded">
              {media.chapters} ch
            </div>
          )}
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

/* ── Manga List Page ─────────────────────────────── */
export function MangaListPage() {
  const { data: popular } = useQuery({ queryKey: ["al-manga-popular"], queryFn: () => anilist.mangaPopular(1) });
  const { data: topRated } = useQuery({ queryKey: ["al-manga-top"], queryFn: () => anilist.topRated(1, "MANGA") });
  const { data: manhwa } = useQuery({
    queryKey: ["al-manhwa"],
    queryFn: () => anilist.search("manhwa", 1, "MANGA"),
  });

  return (
    <div className="min-h-screen pb-20" style={{
      background: "linear-gradient(to bottom, #0d0000, #0a0000)",
      paddingTop: "calc(56px + var(--banner-top-height, 0px) + 32px)",
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-[#0369a1] rounded-full" />
          <h1 className="text-white text-2xl font-black uppercase tracking-widest">Manga</h1>
        </div>

        {popular?.Page?.media && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-[#0369a1] rounded-full" />
              <h2 className="text-white text-base font-black uppercase tracking-widest">Manga Populer</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {popular.Page.media.map(m => <MangaCard key={m.id} media={m} />)}
            </div>
          </section>
        )}

        {topRated?.Page?.media && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-[#0369a1] rounded-full" />
              <h2 className="text-white text-base font-black uppercase tracking-widest">Top Rated Manga</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {topRated.Page.media.map(m => <MangaCard key={m.id} media={m} />)}
            </div>
          </section>
        )}

        {manhwa?.Page?.media && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-[#0369a1] rounded-full" />
              <h2 className="text-white text-base font-black uppercase tracking-widest">Manhwa Korea</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {manhwa.Page.media.map(m => <MangaCard key={m.id} media={m} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Manga Detail Page ─────────────────────────────── */
export function MangaDetailPage() {
  const [, params] = useRoute("/manga/:id");
  const id = Number(params?.id);
  const { data, isLoading } = useQuery({
    queryKey: ["al-manga-detail", id],
    queryFn: () => anilist.mangaDetail(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0000" }}>
        <div className="text-[#0369a1] text-xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  const m = data?.Media;
  if (!m) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0000" }}>
      <p className="text-gray-400">Manga tidak ditemukan</p>
    </div>
  );

  const title = m.title.english || m.title.romaji;
  const score = m.averageScore;
  const stars = Math.round((score ?? 0) / 20);

  return (
    <div className="min-h-screen pb-20" style={{ background: "linear-gradient(to bottom, #0d0000, #0a0000)" }}>
      {m.bannerImage && (
        <div className="relative w-full h-[40vw] max-h-[360px] min-h-[180px] overflow-hidden">
          <img src={m.bannerImage} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0000] via-[#0d0000]/30 to-transparent" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6" style={{ paddingTop: m.bannerImage ? undefined : "calc(56px + 2rem)" }}>
        <div className={`flex gap-5 items-end ${m.bannerImage ? "-mt-20" : "mt-8"} mb-6 relative z-10`}>
          <div className="flex-shrink-0 w-28 sm:w-36 rounded overflow-hidden border-2 border-[#0369a1]/50 shadow-[0_0_20px_rgba(3,105,161,0.4)]">
            <img src={m.coverImage.large} alt={title} className="w-full" />
          </div>
          <div className="flex-1 pb-1">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {m.genres.slice(0, 4).map(g => (
                <span key={g} className="text-[10px] bg-[#0369a1]/30 border border-[#0369a1]/40 text-[#38bdf8] px-2 py-0.5 rounded font-bold">{g}</span>
              ))}
            </div>
            <h1 className="text-white text-xl sm:text-2xl font-black leading-tight mb-1">{title}</h1>
            {m.title.native && <p className="text-gray-500 text-xs mb-2">{m.title.native}</p>}
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-[#f5c518]" fill="#f5c518" />
                <span className="text-[#f5c518] font-bold">{SCORE(score)}</span>
              </div>
              {m.chapters && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{m.chapters} ch</span>}
              {m.volumes && <span>{m.volumes} vol</span>}
              {m.countryOfOrigin && <span>{m.countryOfOrigin}</span>}
            </div>
          </div>
        </div>

        {m.description && (
          <div className="mb-6 bg-[#1a0000]/60 border border-[#8B0000]/20 rounded p-4">
            <h2 className="text-white font-bold mb-2 text-sm uppercase tracking-widest">Synopsis</h2>
            <p className="text-gray-300 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: m.description.replace(/<br>/g, "\n").replace(/<[^>]+>/g, "") }} />
          </div>
        )}

        {m.characters?.edges && m.characters.edges.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-[#0369a1] rounded-full" />
              <h2 className="text-white font-black text-sm uppercase tracking-widest">Karakter</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {m.characters.edges.slice(0, 12).map((e) => (
                <div key={e.node.id} className="text-center">
                  <div className="w-full aspect-square rounded-full overflow-hidden border border-[#0369a1]/30 mb-1 mx-auto max-w-[72px]">
                    <img src={e.node.image.medium} alt={e.node.name.full} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-gray-300 text-[10px] line-clamp-2">{e.node.name.full}</p>
                  <p className="text-[#38bdf8] text-[9px]">{e.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {m.recommendations?.nodes && m.recommendations.nodes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-[#0369a1] rounded-full" />
              <h2 className="text-white font-black text-sm uppercase tracking-widest">Rekomendasi</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {m.recommendations.nodes.map(({ mediaRecommendation: r }) => (
                <Link key={r.id} href={r.type === "MANGA" ? `/manga/${r.id}` : `/anime/${r.id}`}>
                  <div className="flex-shrink-0 w-24 cursor-pointer group">
                    <div className="relative rounded overflow-hidden aspect-[2/3] bg-[#1a0000] border border-[#8B0000]/30 mb-1">
                      <img src={r.coverImage.large} alt={r.title.romaji} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-gray-300 text-[10px] line-clamp-2">{r.title.english || r.title.romaji}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MangaListPage;
