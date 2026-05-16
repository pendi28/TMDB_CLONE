import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Star, Play, BookOpen, Calendar, Clock } from "lucide-react";
import { anilist } from "@/lib/anilist";

const SCORE = (s: number | null) => s ? (s / 10).toFixed(1) : "N/A";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    RELEASING: "#16a34a", FINISHED: "#6b7280",
    NOT_YET_RELEASED: "#d97706", CANCELLED: "#dc2626", HIATUS: "#f59e0b",
  };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white"
      style={{ backgroundColor: colors[status] ?? "#6b7280" }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AnimeDetailPage() {
  const [, params] = useRoute("/anime/:id");
  const id = Number(params?.id);
  const { data, isLoading } = useQuery({
    queryKey: ["al-anime-detail", id],
    queryFn: () => anilist.animeDetail(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0000" }}>
        <div className="text-[#7c3aed] text-xl font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  const m = data?.Media;
  if (!m) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d0000" }}>
      <p className="text-gray-400">Anime tidak ditemukan</p>
    </div>
  );

  const title = m.title.english || m.title.romaji;
  const score = m.averageScore;
  const stars = Math.round((score ?? 0) / 20);
  const year = m.startDate.year;
  const studio = m.studios?.nodes?.[0]?.name;

  return (
    <div className="min-h-screen pb-20" style={{ background: "linear-gradient(to bottom, #0d0000, #0a0000)" }}>
      {/* Backdrop */}
      <div className="relative w-full h-[50vw] max-h-[420px] min-h-[200px] overflow-hidden">
        {m.bannerImage ? (
          <img src={m.bannerImage} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #1a0030, #0d0000)" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0000] via-[#0d0000]/30 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-24 relative z-10">
        <div className="flex gap-5 items-end mb-6">
          {/* Poster */}
          <div className="flex-shrink-0 w-28 sm:w-36 rounded overflow-hidden border-2 border-[#7c3aed]/50 shadow-[0_0_20px_rgba(124,58,237,0.4)]">
            <img src={m.coverImage.large} alt={title} className="w-full" />
          </div>
          {/* Info */}
          <div className="flex-1 pb-1">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {m.genres.slice(0, 4).map(g => (
                <span key={g} className="text-[10px] bg-[#7c3aed]/30 border border-[#7c3aed]/40 text-[#a78bfa] px-2 py-0.5 rounded font-bold">{g}</span>
              ))}
              <StatusBadge status={m.status} />
            </div>
            <h1 className="text-white text-xl sm:text-2xl font-black leading-tight mb-1">{title}</h1>
            {m.title.native && <p className="text-gray-500 text-xs mb-2">{m.title.native}</p>}
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-[#f5c518]" fill="#f5c518" />
                <span className="text-[#f5c518] font-bold">{SCORE(score)}</span>
              </div>
              {m.format && <span>{m.format.replace(/_/g, " ")}</span>}
              {m.episodes && (
                <span className="flex items-center gap-1"><Play className="w-3 h-3" />{m.episodes} eps</span>
              )}
              {year && (
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{m.season && `${m.season} `}{year}</span>
              )}
              {studio && <span>{studio}</span>}
            </div>
          </div>
        </div>

        {/* Description */}
        {m.description && (
          <div className="mb-6 bg-[#1a0000]/60 border border-[#8B0000]/20 rounded p-4">
            <h2 className="text-white font-bold mb-2 text-sm uppercase tracking-widest">Synopsis</h2>
            <p className="text-gray-300 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: m.description.replace(/<br>/g, "\n").replace(/<[^>]+>/g, "") }} />
          </div>
        )}

        {/* Characters */}
        {m.characters?.edges && m.characters.edges.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-[#7c3aed] rounded-full" />
              <h2 className="text-white font-black text-sm uppercase tracking-widest">Karakter</h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {m.characters.edges.slice(0, 12).map((e) => (
                <div key={e.node.id} className="text-center">
                  <div className="w-full aspect-square rounded-full overflow-hidden border border-[#7c3aed]/30 mb-1 mx-auto max-w-[72px]">
                    <img src={e.node.image.medium} alt={e.node.name.full} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-gray-300 text-[10px] leading-tight line-clamp-2">{e.node.name.full}</p>
                  <p className="text-[#7c3aed] text-[9px]">{e.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relations */}
        {m.relations?.edges && m.relations.edges.filter(e => ["SEQUEL", "PREQUEL", "SIDE_STORY", "PARENT"].includes(e.relationType)).length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-[#7c3aed] rounded-full" />
              <h2 className="text-white font-black text-sm uppercase tracking-widest">Relasi</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {m.relations.edges.filter(e => ["SEQUEL", "PREQUEL", "SIDE_STORY", "PARENT"].includes(e.relationType)).map((e) => (
                <Link key={e.node.id} href={e.node.type === "MANGA" ? `/manga/${e.node.id}` : `/anime/${e.node.id}`}>
                  <div className="flex-shrink-0 w-24 cursor-pointer group">
                    <div className="relative rounded overflow-hidden aspect-[2/3] bg-[#1a0000] border border-[#7c3aed]/30 mb-1">
                      <img src={e.node.coverImage.medium} alt={e.node.title.romaji} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-[9px] text-[#a78bfa] font-bold px-1 py-0.5 text-center">
                        {e.relationType.replace(/_/g, " ")}
                      </div>
                    </div>
                    <p className="text-gray-300 text-[10px] line-clamp-2">{e.node.title.english || e.node.title.romaji}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {m.recommendations?.nodes && m.recommendations.nodes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-[#7c3aed] rounded-full" />
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
                    {r.averageScore && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <Star className="w-2.5 h-2.5 text-[#f5c518]" fill="#f5c518" />
                        <span className="text-[#f5c518] text-[9px]">{(r.averageScore / 10).toFixed(1)}</span>
                      </div>
                    )}
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
