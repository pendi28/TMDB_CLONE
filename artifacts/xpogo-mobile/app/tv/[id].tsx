import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Dimensions, StatusBar,
  SafeAreaView, Modal, TouchableWithoutFeedback, FlatList, AppState,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { tmdb } from "@/lib/tmdb";
import { anilist } from "@/lib/anilist";
import { fb } from "@/lib/firebase";
import CommentsSection from "@/components/CommentsSection";
import ShareSheet from "@/components/ShareSheet";

const IMG    = "https://image.tmdb.org/t/p";
const IMG_W  = "https://image.tmdb.org/t/p/w500";
const BG     = "#0d0000";
const CARD   = "#1a0000";
const RED    = "#E50914";
const GRAY   = "#8a9bb0";
const GREEN  = "#00c853";

interface EmbedRecord {
  id: string; title: string; url: string;
  type: string; active: boolean; tmdbId?: number; sub?: string;
}
interface ServerOption {
  id: string; label: string; url: string;
  badge: string; badgeColor: string; icon: string; sub?: string;
}

// ── Embed URL builders (all use TMDB ID) ──────────────────────────────
function buildVidPlusUrl(tmdbId: number, s: number, ep: number) {
  return `https://player.vidplus.to/embed/tv/${tmdbId}/${s}/${ep}?primarycolor=E50914&secondarycolor=170000&iconcolor=FFFFFF&autoplay=true&autonext=true&icons=netflix`;
}
function buildVidZeeUrl(tmdbId: number, s: number, ep: number) {
  return `https://player.vidzee.wtf/embed/tv/${tmdbId}/${s}/${ep}`;
}
function buildVixSrcUrl(tmdbId: number, s: number, ep: number) {
  return `https://vixsrc.to/tv/${tmdbId}/${s}/${ep}`;
}
function buildPeachifyUrl(tmdbId: number, s: number, ep: number) {
  return `https://peachify.top/embed/tv/${tmdbId}/${s}/${ep}?accent=E50914&autoNext=1&autoplay=1`;
}
function build2EmbedUrl(tmdbId: number, s: number, ep: number) {
  return `https://2embed.cc/embed/tv/${tmdbId}/${s}/${ep}`;
}
function buildVidLinkUrl(tmdbId: number, s: number, ep: number) {
  return `https://vidlink.pro/tv/${tmdbId}/${s}/${ep}?primaryColor=E50914&autoplay=true`;
}
function buildAutoEmbedUrl(tmdbId: number, s: number, ep: number) {
  return `https://autoembed.cc/tv/${tmdbId}/${s}/${ep}`;
}
function buildZxcUrl(tmdbId: number, serverNum: number, s: number, ep: number) {
  return `https://zxcstream.xyz/player/tv/${tmdbId}?server=${serverNum}&color=E50914&autoplay=true&back=true&season=${s}&episode=${ep}`;
}
// ── PlusHub sources ──────────────────────────────────────────────────
function buildAutoEmbedAppUrl(tmdbId: number, s: number, ep: number) {
  return `https://player.autoembed.app/embed/tv/${tmdbId}/${s}/${ep}`;
}
function buildBraflixUrl(tmdbId: number, s: number, ep: number) {
  return `https://braflix.me/embed/tv/${tmdbId}/${s}/${ep}`;
}
function buildCineHdUrl(tmdbId: number, s: number, ep: number) {
  return `https://cinehd.app/embed/tv/${tmdbId}/${s}/${ep}`;
}
function buildNxshaUrl(tmdbId: number, s: number, ep: number) {
  return `https://nxsha.app/embed/tv/${tmdbId}/${s}/${ep}`;
}

// ── Helper: resolve AniList → TMDB ID via title search ───────────────
async function resolveAnilistToTmdb(anilistId: number): Promise<{
  tmdbId: number | null;
  title: string;
  originalTitle: string;
  posterUrl: string;
  backdropUrl: string;
  overview: string;
  score: number | null;
  episodeCount: number;
  status: string;
  genres: string[];
  origLang: string;
  year: string;
}> {
  const data = await anilist.detail(anilistId);
  const media = data?.Media ?? data;

  const titleEn      = media?.title?.english ?? "";
  const titleRomaji  = media?.title?.romaji  ?? "";
  const titleNative  = media?.title?.native  ?? "";
  const displayTitle = titleEn || titleRomaji || titleNative || "Unknown";
  const searchTitle  = titleEn || titleRomaji;

  const posterUrl   = media?.coverImage?.extraLarge ?? media?.coverImage?.large ?? "";
  const backdropUrl = media?.bannerImage ?? "";
  const overview    = media?.description?.replace(/<[^>]+>/g, "") ?? "";
  const score       = media?.averageScore ? media.averageScore / 10 : null;
  const episodes    = media?.episodes ?? 12;
  const status      = media?.status ?? "";
  const genres      = media?.genres ?? [];
  const year        = String(media?.seasonYear ?? media?.startDate?.year ?? "");
  // AniList countryOfOrigin: JP=ja, CN=zh, KR=ko
  const countryMap: Record<string, string> = { JP: "ja", CN: "zh", KR: "ko" };
  const origLang    = countryMap[media?.countryOfOrigin ?? ""] ?? "ja";

  // Try to find TMDB ID by searching — tmdb.search is multi-search, filter for tv
  let tmdbId: number | null = null;
  try {
    const results = await tmdb.search(searchTitle);
    if (results?.results?.length > 0) {
      const tvOnly = results.results.filter((r: any) => r.media_type === "tv");
      const pool   = tvOnly.length > 0 ? tvOnly : results.results;
      const best   = pool.find((r: any) =>
        r.name?.toLowerCase()          === searchTitle.toLowerCase()  ||
        r.original_name?.toLowerCase() === titleNative?.toLowerCase() ||
        r.name?.toLowerCase()          === titleRomaji?.toLowerCase()
      ) ?? pool[0];
      tmdbId = best?.id ?? null;
    }
  } catch { /* no TMDB match, embeds will be limited */ }

  return { tmdbId, title: displayTitle, originalTitle: titleNative || displayTitle,
           posterUrl, backdropUrl, overview, score, episodeCount: episodes,
           status, genres, origLang, year };
}

// ── Sub-components ────────────────────────────────────────────────────
function RatingCircle({ score }: { score?: number | null }) {
  if (!score) return null;
  const pct   = Math.round(score * 10);
  const color = pct >= 70 ? GREEN : pct >= 50 ? "#f5c518" : "#e74c3c";
  return (
    <View style={[S.ratingCircle, { borderColor: color }]}>
      <Text style={[S.ratingPct, { color }]}>{pct}</Text>
      <Text style={S.ratingSymbol}>%</Text>
    </View>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const ongoing = ["Returning Series","In Production","RELEASING","AIRING"].includes(status);
  return (
    <View style={[S.statusBadge, { backgroundColor: ongoing ? "#0a3d1f" : "#1e3a5f",
      borderColor: ongoing ? GREEN : "#3b82f6" }]}>
      <Text style={[S.statusText, { color: ongoing ? GREEN : "#3b82f6" }]}>
        {ongoing ? "● Ongoing" : "✓ Completed"}
      </Text>
    </View>
  );
}

function LangBadge({ lang }: { lang?: string }) {
  if (!lang) return null;
  const cfg =
    lang === "zh" ? { label: "DONGHUA", color: RED } :
    lang === "ja" ? { label: "ANIME",   color: "#7c3aed" } :
    lang === "ko" ? { label: "K-DRAMA", color: "#0369a1" } : null;
  if (!cfg) return null;
  return (
    <View style={[S.langBadge, { backgroundColor: cfg.color }]}>
      <Text style={S.langBadgeText}>{cfg.label}</Text>
    </View>
  );
}

function SourceBadge({ source, hasTmdb }: { source: string; hasTmdb: boolean }) {
  if (source !== "anilist") return null;
  return (
    <View style={S.sourceBadgeRow}>
      <View style={S.sourceBadge}>
        <Text style={S.sourceBadgeText}>AniList</Text>
      </View>
      {!hasTmdb && (
        <View style={[S.sourceBadge, { backgroundColor: "#3a2000", borderColor: "#f59e0b" }]}>
          <Text style={[S.sourceBadgeText, { color: "#f59e0b" }]}>⚠ No TMDB match</Text>
        </View>
      )}
    </View>
  );
}

function ServerPicker({ visible, onClose, servers, onSelect, title }: {
  visible: boolean; onClose: () => void;
  servers: ServerOption[]; onSelect: (s: ServerOption) => void; title: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={P.overlay}>
          <TouchableWithoutFeedback>
            <View style={P.sheet}>
              <View style={P.handle} />
              <Text style={P.sheetTitle}>📺 Pilih Server</Text>
              <Text style={P.sheetSub} numberOfLines={1}>{title}</Text>
              <FlatList
                data={servers}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[P.serverRow, index === 0 && P.serverRowFirst]}
                    onPress={() => onSelect(item)}
                    activeOpacity={0.75}>
                    <View style={[P.serverIconWrap, { backgroundColor: index === 0 ? "#2a0000" : CARD }]}>
                      <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={P.serverLabel}>{item.label}</Text>
                      {item.sub && <Text style={P.serverSub} numberOfLines={1}>{item.sub}</Text>}
                    </View>
                    <View style={[P.badge, { backgroundColor: item.badgeColor + "22", borderColor: item.badgeColor }]}>
                      <Text style={[P.badgeText, { color: item.badgeColor }]}>{item.badge}</Text>
                    </View>
                    <Text style={{ color: GRAY, fontSize: 18, marginLeft: 6 }}>›</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={P.sep} />}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────
export default function TvDetailScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const router  = useRouter();
  const rawId   = Number(id);
  const isAnilist = source === "anilist";

  // Common display state
  const [title, setTitle]         = useState("");
  const [origTitle, setOrigTitle] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [backdropUrl, setBackdrop] = useState("");
  const [overview, setOverview]   = useState("");
  const [score, setScore]         = useState<number | null>(null);
  const [statusStr, setStatus]    = useState("");
  const [genres, setGenres]       = useState<string[]>([]);
  const [origLang, setOrigLang]   = useState("ja");
  const [year, setYear]           = useState("");
  const [episodeCount, setEpCount] = useState(12);

  // TMDB-specific (seasons list)
  const [tmdbData, setTmdbData]   = useState<any>(null);
  const [cast, setCast]           = useState<any[]>([]);
  const [similar, setSimilar]     = useState<any[]>([]);
  const [nextEpisode, setNextEpisode] = useState<any>(null);
  const [lastEpisode, setLastEpisode] = useState<any>(null);

  // Resolved TMDB ID (for embeds) — may be null for AniList items with no TMDB match
  const [resolvedTmdbId, setResolvedTmdbId] = useState<number | null>(null);

  const [embeds, setEmbeds]       = useState<EmbedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  const [selectedSeason, setSeason]   = useState(1);
  const [selectedEpisode, setEpisode] = useState(1);
  const [pickerVisible, setPicker]    = useState(false);
  const [shareVisible, setShare]      = useState(false);

  const loadFirebaseEmbeds = useCallback(async (tmdbId: number) => {
    await fb.getEmbeds().then((list: any[]) => {
      setEmbeds(list.filter(e => e.active && e.type === "series" && e.tmdbId === tmdbId));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setIsLoading(true);

    if (isAnilist) {
      // ── AniList source ──────────────────────────────────────────
      setResolving(true);
      resolveAnilistToTmdb(rawId).then(info => {
        setTitle(info.title);
        setOrigTitle(info.originalTitle);
        setPosterUrl(info.posterUrl);
        setBackdrop(info.backdropUrl);
        setOverview(info.overview);
        setScore(info.score);
        setStatus(info.status);
        setGenres(info.genres);
        setOrigLang(info.origLang);
        setYear(info.year);
        setEpCount(info.episodeCount);
        setResolvedTmdbId(info.tmdbId);
        setResolving(false);
        if (info.tmdbId) {
          // Also fetch TMDB data for season list, cast, similar
          Promise.all([
            tmdb.tvDetail(info.tmdbId).then(d => {
              setTmdbData(d);
              setCast(d?.credits?.cast?.slice(0, 10) ?? []);
              setSimilar(d?.similar?.results?.slice(0, 10) ?? []);
            }).catch(() => {}),
            loadFirebaseEmbeds(info.tmdbId),
          ]);
        }
      }).catch(() => {
        setResolving(false);
      }).finally(() => setIsLoading(false));

    } else {
      // ── TMDB source ─────────────────────────────────────────────
      const tmdbId = rawId;
      setResolvedTmdbId(tmdbId);
      Promise.all([
        tmdb.tvDetail(tmdbId).then(d => {
          setTmdbData(d);
          setTitle(d?.name ?? d?.original_name ?? "Serial TV");
          setOrigTitle(d?.original_name ?? "");
          setPosterUrl(d?.poster_path ? `${IMG_W}${d.poster_path}` : "");
          setBackdrop(d?.backdrop_path ? `${IMG}/original${d.backdrop_path}` : "");
          setOverview(d?.overview ?? "");
          setScore(d?.vote_average ?? null);
          setStatus(d?.status ?? "");
          setGenres(d?.genres?.map((g: any) => g.name) ?? []);
          setOrigLang(d?.original_language ?? "");
          setYear(d?.first_air_date?.slice(0, 4) ?? "");
          const seasons = (d?.seasons ?? []).filter((s: any) => s.season_number > 0);
          setEpCount(seasons[0]?.episode_count ?? 12);
          setCast(d?.credits?.cast?.slice(0, 10) ?? []);
          setSimilar(d?.similar?.results?.slice(0, 10) ?? []);
          setNextEpisode(d?.next_episode_to_air ?? null);
          setLastEpisode(d?.last_episode_to_air ?? null);
        }).catch(() => {}),
        loadFirebaseEmbeds(tmdbId),
      ]).finally(() => setIsLoading(false));
    }
  }, [id, source]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", s => {
      if (s === "active" && resolvedTmdbId) {
        loadFirebaseEmbeds(resolvedTmdbId);
        // Auto-refresh episode count & schedule when app comes to foreground
        tmdb.tvDetail(resolvedTmdbId).then(d => {
          const seasons = (d?.seasons ?? []).filter((s: any) => s.season_number > 0);
          setEpCount(seasons[0]?.episode_count ?? 12);
          setTmdbData(d);
          setNextEpisode(d?.next_episode_to_air ?? null);
          setLastEpisode(d?.last_episode_to_air ?? null);
          setStatus(d?.status ?? "");
        }).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [resolvedTmdbId, loadFirebaseEmbeds]);

  // ── Season/episode from TMDB if available ─────────────────────────
  const seasons   = (tmdbData?.seasons ?? []).filter((s: any) => s.season_number > 0);
  const curSeason = seasons.find((s: any) => s.season_number === selectedSeason) ?? seasons[0];
  const epCount   = curSeason?.episode_count ?? episodeCount;
  const episodes  = Array.from({ length: epCount }, (_, i) => i + 1);

  // ── Build server list ─────────────────────────────────────────────
  const buildServers = (): ServerOption[] => {
    const srvs: ServerOption[] = [];

    if (resolvedTmdbId) {
      const t = resolvedTmdbId;
      const s = selectedSeason;
      const e = selectedEpisode;
      srvs.push(
        { id: "vidplus",   label: "VidPlus Premium", icon: "🎬",
          url: buildVidPlusUrl(t, s, e),   badge: "PRO",  badgeColor: "#6C63FF" },
        { id: "vidzee",    label: "VidZee",           icon: "🎭",
          url: buildVidZeeUrl(t, s, e),    badge: "HD",   badgeColor: "#FF6B35" },
        { id: "vixsrc",    label: "VixSrc",           icon: "🦊",
          url: buildVixSrcUrl(t, s, e),    badge: "ALT",  badgeColor: "#059669" },
        { id: "peachify",  label: "Peachify VIP",     icon: "🍑",
          url: buildPeachifyUrl(t, s, e),  badge: "VIP",  badgeColor: "#ff4757" },
        { id: "2embed",    label: "2Embed",            icon: "📺",
          url: build2EmbedUrl(t, s, e),    badge: "HD",   badgeColor: "#0ea5e9" },
        { id: "vidlink",   label: "VidLink",           icon: "🔗",
          url: buildVidLinkUrl(t, s, e),   badge: "NEW",  badgeColor: "#f59e0b" },
        { id: "autoembed", label: "AutoEmbed",         icon: "🌐",
          url: buildAutoEmbedUrl(t, s, e), badge: "FREE", badgeColor: "#16a34a" },
        { id: "zxc1",      label: "ZxcStream S1",      icon: "🖥️",
          url: buildZxcUrl(t, 1, s, e),    badge: "HD",   badgeColor: RED       },
        { id: "zxc2",      label: "ZxcStream S2",      icon: "🖥️",
          url: buildZxcUrl(t, 2, s, e),    badge: "HD",   badgeColor: "#3b82f6" },
        { id: "zxc3",      label: "ZxcStream S3",      icon: "🖥️",
          url: buildZxcUrl(t, 3, s, e),    badge: "ALT",  badgeColor: "#8b5cf6" },
        { id: "autoembedapp", label: "AutoEmbed App",  icon: "🌟",
          url: buildAutoEmbedAppUrl(t, s, e), badge: "HUB", badgeColor: "#e11d48" },
        { id: "braflix",   label: "Braflix",            icon: "🎞️",
          url: buildBraflixUrl(t, s, e),   badge: "HUB",  badgeColor: "#0284c7" },
        { id: "cinehd",    label: "CineHD",             icon: "🎦",
          url: buildCineHdUrl(t, s, e),    badge: "HUB",  badgeColor: "#d97706" },
        { id: "nxsha",     label: "NxSha",              icon: "🔮",
          url: buildNxshaUrl(t, s, e),     badge: "HUB",  badgeColor: "#7c3aed" },
      );
    }

    // GoGoAnime scraper — always available for anime
    srvs.push({
      id: "scraper", label: "🚀 GoGoAnime (Auto)", icon: "🚀",
      url: "__scraper__", badge: "M3U8", badgeColor: GREEN,
      sub: `Cari: ${origTitle || title} ep.${selectedEpisode}`,
    });

    // Firebase custom embeds
    embeds.forEach((em, i) =>
      srvs.push({
        id: em.id, label: em.title || `Embed ${i + 1}`,
        url: em.url, badge: "EMBED", badgeColor: "#f59e0b", icon: "📡",
        sub: em.sub ? `Sub: ${em.sub}` : undefined,
      })
    );

    return srvs;
  };

  const openPlayer = (srv: ServerOption) => {
    setPicker(false);
    const urlParam  = srv.id === "scraper" ? "__scraper__" : srv.url;
    const tmdbParam = resolvedTmdbId ?? 0;
    router.push(
      `/player?url=${encodeURIComponent(urlParam)}&title=${encodeURIComponent(title)}&tmdbId=${tmdbParam}&mediaType=tv&season=${selectedSeason}&episode=${selectedEpisode}&originalName=${encodeURIComponent(origTitle || title)}&totalEpisodes=${epCount}` as never
    );
  };

  const servers = buildServers();

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading && !title) {
    return (
      <View style={[S.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={RED} size="large" />
        {resolving && (
          <Text style={{ color: GRAY, marginTop: 12, fontSize: 13 }}>
            Mencari di TMDB…
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Backdrop */}
        <View style={S.backdropWrap}>
          {backdropUrl
            ? <Image source={{ uri: backdropUrl }} style={S.backdrop} />
            : <View style={[S.backdrop, { backgroundColor: CARD }]} />
          }
          <LinearGradient colors={["transparent", "rgba(13,0,0,0.7)", BG]} style={S.backdropGrad} />
          <SafeAreaView>
            <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={S.backBtnText}>‹ Kembali</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Info row */}
        <View style={S.infoRow}>
          <View style={S.posterWrap}>
            {posterUrl
              ? <Image source={{ uri: posterUrl }} style={S.poster} />
              : <View style={[S.poster, { backgroundColor: CARD, alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ color: GRAY, fontSize: 30 }}>📺</Text>
                </View>
            }
            <LangBadge lang={origLang} />
          </View>
          <View style={S.metaCol}>
            <Text style={S.title} numberOfLines={3}>{title}</Text>
            {origTitle && origTitle !== title && (
              <Text style={S.origTitle} numberOfLines={2}>{origTitle}</Text>
            )}
            <SourceBadge source={source ?? "tmdb"} hasTmdb={!!resolvedTmdbId} />
            <View style={S.metaRow}>
              {year      ? <Text style={S.metaChip}>📅 {year}</Text>       : null}
              {seasons.length > 0
                ? <Text style={S.metaChip}>📂 {seasons.length} Musim</Text>
                : <Text style={S.metaChip}>🎞 {epCount} Episode</Text>
              }
            </View>
            <StatusBadge status={statusStr} />
            <RatingCircle score={score} />
          </View>
        </View>

        {/* Resolving TMDB notice */}
        {resolving && (
          <View style={S.resolvingBar}>
            <ActivityIndicator color={RED} size="small" />
            <Text style={S.resolvingText}>Mencocokkan TMDB ID untuk server embed…</Text>
          </View>
        )}

        {/* No TMDB match warning */}
        {isAnilist && !resolvedTmdbId && !resolving && (
          <View style={S.warnBar}>
            <Text style={S.warnText}>
              ⚠ Tidak ditemukan di TMDB. Hanya GoGoAnime (M3U8) yang tersedia sebagai server.
            </Text>
          </View>
        )}

        {/* Genres */}
        {genres.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.genreRow}>
            {genres.map((g, i) => (
              <View key={i} style={S.genreChip}>
                <Text style={S.genreText}>{g}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Release Schedule Banner */}
        {nextEpisode && (
          <View style={S.scheduleBanner}>
            <View style={S.scheduleTitleRow}>
              <Text style={S.scheduleIcon}>🗓</Text>
              <Text style={S.scheduleTitle}>Episode Berikutnya</Text>
            </View>
            <Text style={S.scheduleEpLabel}>
              S{nextEpisode.season_number}E{nextEpisode.episode_number}
              {nextEpisode.name ? ` — ${nextEpisode.name}` : ""}
            </Text>
            <Text style={S.scheduleDate}>
              📅 Tayang: {nextEpisode.air_date
                ? new Date(nextEpisode.air_date).toLocaleDateString("id-ID", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })
                : "Belum diumumkan"}
            </Text>
          </View>
        )}
        {!nextEpisode && lastEpisode && (
          <View style={[S.scheduleBanner, { borderColor: "#374151", backgroundColor: "#111827" }]}>
            <View style={S.scheduleTitleRow}>
              <Text style={S.scheduleIcon}>✅</Text>
              <Text style={[S.scheduleTitle, { color: "#6b7280" }]}>Episode Terakhir</Text>
            </View>
            <Text style={[S.scheduleEpLabel, { color: "#9ca3af" }]}>
              S{lastEpisode.season_number}E{lastEpisode.episode_number}
              {lastEpisode.name ? ` — ${lastEpisode.name}` : ""}
            </Text>
            <Text style={[S.scheduleDate, { color: "#6b7280" }]}>
              📅 Tayang: {lastEpisode.air_date
                ? new Date(lastEpisode.air_date).toLocaleDateString("id-ID", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })
                : "-"}
            </Text>
          </View>
        )}

        {/* Synopsis */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Sinopsis</Text>
          <Text style={S.overview}>{overview || "Tidak ada deskripsi."}</Text>
        </View>

        {/* Seasons (TMDB only) */}
        {seasons.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Musim</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {seasons.map((s: any) => (
                <TouchableOpacity key={s.season_number}
                  style={[S.seasonChip, selectedSeason === s.season_number && S.seasonChipActive]}
                  onPress={() => { setSeason(s.season_number); setEpisode(1); }}
                  activeOpacity={0.8}>
                  <Text style={[S.chipText, selectedSeason === s.season_number && { color: "#fff" }]}>
                    Musim {s.season_number}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Episodes */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>
            Episode{seasons.length > 0 ? ` — S${selectedSeason}` : ""}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {episodes.map(ep => (
              <TouchableOpacity key={ep}
                style={[S.epChip, selectedEpisode === ep && S.epChipActive]}
                onPress={() => setEpisode(ep)}
                activeOpacity={0.8}>
                <Text style={[S.chipText, selectedEpisode === ep && { color: "#fff" }]}>{ep}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Buttons */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20, gap: 10 }}>
          {servers.length > 0 ? (
            <TouchableOpacity style={S.btnWatch} onPress={() => openPlayer(servers[0])} activeOpacity={0.85}>
              <Text style={S.btnWatchText}>▶  Tonton S{selectedSeason}E{selectedEpisode}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[S.btnWatch, { backgroundColor: "#333", opacity: 0.6 }]}>
              <Text style={S.btnWatchText}>⏳ Mencari server…</Text>
            </View>
          )}
          <TouchableOpacity style={S.btnServer} onPress={() => setPicker(true)} activeOpacity={0.85}>
            <Text style={S.btnServerText}>🖥️  Pilih Server ({servers.length} tersedia)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.btnShare} onPress={() => setShare(true)} activeOpacity={0.85}>
            <Text style={S.btnShareText}>↗  Bagikan</Text>
          </TouchableOpacity>
        </View>

        {/* Cast (TMDB only) */}
        {cast.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Pemeran</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {cast.map((c: any) => (
                <View key={c.id} style={S.castItem}>
                  {c.profile_path
                    ? <Image source={{ uri: `${IMG_W}${c.profile_path}` }} style={S.castImg} />
                    : <View style={[S.castImg, { backgroundColor: CARD, alignItems: "center", justifyContent: "center" }]}>
                        <Text style={{ fontSize: 20 }}>👤</Text>
                      </View>
                  }
                  <Text style={S.castName} numberOfLines={2}>{c.name}</Text>
                  <Text style={S.castChar} numberOfLines={1}>{c.character}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Similar */}
        {similar.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Serial Serupa</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {similar.map((s: any) => (
                <TouchableOpacity key={s.id} style={{ width: 90 }}
                  onPress={() => router.push(`/tv/${s.id}` as never)} activeOpacity={0.85}>
                  {s.poster_path
                    ? <Image source={{ uri: `${IMG_W}${s.poster_path}` }} style={S.simPoster} />
                    : <View style={[S.simPoster, { backgroundColor: CARD }]} />
                  }
                  <Text style={S.simTitle} numberOfLines={2}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <CommentsSection type="tv" tmdbId={resolvedTmdbId ?? rawId} />
      </ScrollView>

      <ServerPicker
        visible={pickerVisible}
        onClose={() => setPicker(false)}
        servers={servers}
        onSelect={openPlayer}
        title={`${title} — S${selectedSeason}E${selectedEpisode}`}
      />

      <ShareSheet
        visible={shareVisible}
        onClose={() => setShare(false)}
        title={title}
        year={year}
        overview={overview}
        posterUrl={posterUrl}
        tmdbId={resolvedTmdbId ?? rawId}
        mediaType="tv"
        originalName={origTitle || title}
        episode={selectedEpisode}
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const S = StyleSheet.create({
  container:       { flex: 1, backgroundColor: BG },
  backdropWrap:    { height: 240, position: "relative" },
  backdrop:        { width: "100%", height: "100%" },
  backdropGrad:    { ...StyleSheet.absoluteFillObject },
  backBtn:         { margin: 16, alignSelf: "flex-start", backgroundColor: "rgba(13,0,0,0.7)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: "#3a0000" },
  backBtnText:     { color: "#fff", fontSize: 14, fontWeight: "700" },
  infoRow:         { flexDirection: "row", paddingHorizontal: 16, gap: 16, marginTop: -60, marginBottom: 16 },
  posterWrap:      { position: "relative" },
  poster:          { width: 110, height: 165, borderRadius: 12, backgroundColor: CARD },
  langBadge:       { position: "absolute", top: 8, left: 0, paddingHorizontal: 7, paddingVertical: 3, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  langBadgeText:   { color: "#fff", fontSize: 9, fontWeight: "900" },
  metaCol:         { flex: 1, paddingTop: 60, gap: 6 },
  title:           { color: "#fff", fontSize: 16, fontWeight: "900", lineHeight: 22 },
  origTitle:       { color: GRAY, fontSize: 11, fontStyle: "italic" },
  sourceBadgeRow:  { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  sourceBadge:     { backgroundColor: "#1a2a40", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#3b82f6" },
  sourceBadgeText: { color: "#3b82f6", fontSize: 10, fontWeight: "800" },
  metaRow:         { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaChip:        { backgroundColor: CARD, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, color: GRAY, fontSize: 11 },
  statusBadge:     { alignSelf: "flex-start", borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  statusText:      { fontSize: 11, fontWeight: "800" },
  ratingCircle:    { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 4 },
  ratingPct:       { fontSize: 14, fontWeight: "900" },
  ratingSymbol:    { color: GRAY, fontSize: 9, fontWeight: "700", marginTop: 4 },
  resolvingBar:    { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 12, backgroundColor: "#0d1a2a", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#1e3a5f" },
  resolvingText:   { color: "#3b82f6", fontSize: 12, fontWeight: "600" },
  warnBar:         { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#2a1a00", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#f59e0b" },
  warnText:        { color: "#f59e0b", fontSize: 12, lineHeight: 18 },
  scheduleBanner:  { marginHorizontal: 16, marginBottom: 14, backgroundColor: "#0a1f0a", borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: GREEN },
  scheduleTitleRow:{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  scheduleIcon:    { fontSize: 16 },
  scheduleTitle:   { color: GREEN, fontSize: 13, fontWeight: "800" },
  scheduleEpLabel: { color: "#fff", fontSize: 13, fontWeight: "700", marginBottom: 4 },
  scheduleDate:    { color: "#86efac", fontSize: 12, lineHeight: 18 },
  genreRow:        { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
  genreChip:       { backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: "#3a0000" },
  genreText:       { color: GRAY, fontSize: 12, fontWeight: "600" },
  section:         { marginBottom: 20 },
  sectionTitle:    { color: "#fff", fontSize: 16, fontWeight: "800", paddingHorizontal: 16, marginBottom: 12 },
  overview:        { color: GRAY, fontSize: 13, lineHeight: 20, paddingHorizontal: 16 },
  seasonChip:      { borderRadius: 20, borderWidth: 1.5, borderColor: "#3a0000", paddingHorizontal: 16, paddingVertical: 8 },
  seasonChipActive:{ backgroundColor: RED, borderColor: RED },
  epChip:          { width: 44, height: 44, borderRadius: 10, backgroundColor: CARD, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#3a0000" },
  epChipActive:    { backgroundColor: RED, borderColor: RED },
  chipText:        { color: GRAY, fontSize: 12, fontWeight: "700" },
  btnWatch:        { backgroundColor: RED, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnWatchText:    { color: "#fff", fontSize: 16, fontWeight: "900" },
  btnServer:       { backgroundColor: CARD, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1.5, borderColor: "#3a0000" },
  btnServerText:   { color: "#fff", fontSize: 14, fontWeight: "700" },
  btnShare:        { backgroundColor: "transparent", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  btnShareText:    { color: GRAY, fontSize: 13, fontWeight: "600" },
  castItem:        { width: 76, alignItems: "center" },
  castImg:         { width: 76, height: 100, borderRadius: 10, backgroundColor: CARD },
  castName:        { color: "#fff", fontSize: 11, fontWeight: "700", marginTop: 6, textAlign: "center" },
  castChar:        { color: GRAY, fontSize: 10, textAlign: "center" },
  simPoster:       { width: 90, height: 135, borderRadius: 10, backgroundColor: CARD },
  simTitle:        { color: GRAY, fontSize: 11, marginTop: 6, lineHeight: 15 },
});

const P = StyleSheet.create({
  overlay:        { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  sheet:          { backgroundColor: "#1a0000", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, maxHeight: "75%" },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: "#3a0000", alignSelf: "center", marginBottom: 16 },
  sheetTitle:     { color: "#fff", fontSize: 17, fontWeight: "900", paddingHorizontal: 20, marginBottom: 4 },
  sheetSub:       { color: GRAY, fontSize: 12, paddingHorizontal: 20, marginBottom: 16 },
  serverRow:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  serverRowFirst: { backgroundColor: "rgba(229,9,20,0.08)" },
  serverIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  serverLabel:    { color: "#fff", fontSize: 14, fontWeight: "700" },
  serverSub:      { color: GRAY, fontSize: 11, marginTop: 2 },
  badge:          { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1.5 },
  badgeText:      { fontSize: 10, fontWeight: "800" },
  sep:            { height: 1, backgroundColor: "#2a0000", marginLeft: 76 },
});
