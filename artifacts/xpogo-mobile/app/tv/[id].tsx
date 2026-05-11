import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Dimensions, StatusBar,
  SafeAreaView, Modal, TouchableWithoutFeedback, FlatList, AppState,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";
import CommentsSection from "@/components/CommentsSection";
import ShareSheet from "@/components/ShareSheet";

const IMG = "https://image.tmdb.org/t/p";
const IMG_W500 = "https://image.tmdb.org/t/p/w500";
const { width } = Dimensions.get("window");
const BG = "#0d0000";
const CARD_BG = "#1a0000";
const RED = "#E50914";
const GRAY = "#8a9bb0";

interface EmbedRecord {
  id: string; title: string; url: string;
  type: string; active: boolean; tmdbId?: number; sub?: string;
}
interface ServerOption {
  id: string; label: string; url: string;
  badge: string; badgeColor: string; icon: string; sub?: string;
}

function buildZxcTvUrl(id: number, serverNum: number, season: number, ep: number) {
  return `https://zxcstream.xyz/player/tv/${id}?server=${serverNum}&color=E50914&autoplay=true&back=true&season=${season}&episode=${ep}`;
}
function buildPeachifyUrl(id: number, season: number, ep: number) {
  return `https://peachify.top/embed/tv/${id}/${season}/${ep}?accent=E50914&autoNext=1&autoplay=1`;
}

function RatingCircle({ score }: { score?: number }) {
  if (!score) return null;
  const pct = Math.round(score * 10);
  const color = pct >= 70 ? "#00c853" : pct >= 50 ? "#f5c518" : "#e74c3c";
  return (
    <View style={[S.ratingCircle, { borderColor: color }]}>
      <Text style={[S.ratingPct, { color }]}>{pct}</Text>
      <Text style={S.ratingSymbol}>%</Text>
    </View>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const ongoing = status === "Returning Series" || status === "In Production";
  return (
    <View style={[S.statusBadge, { backgroundColor: ongoing ? "#0a3d1f" : "#1e3a5f", borderColor: ongoing ? "#00c853" : "#3b82f6" }]}>
      <Text style={[S.statusText, { color: ongoing ? "#00c853" : "#3b82f6" }]}>
        {ongoing ? "● Ongoing" : "✓ Completed"}
      </Text>
    </View>
  );
}

function LangBadge({ lang }: { lang?: string }) {
  if (!lang) return null;
  const cfg =
    lang === "zh" ? { label: "DONGHUA", color: RED } :
    lang === "ja" ? { label: "ANIME", color: "#7c3aed" } :
    lang === "ko" ? { label: "K-DRAMA", color: "#0369a1" } : null;
  if (!cfg) return null;
  return (
    <View style={[S.langBadge, { backgroundColor: cfg.color }]}>
      <Text style={S.langBadgeText}>{cfg.label}</Text>
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
                    <View style={[P.serverIconWrap, { backgroundColor: index === 0 ? "#2a0000" : CARD_BG }]}>
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

export default function TvDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tvId = Number(id);

  const [tv, setTv] = useState<any>(null);
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [embeds, setEmbeds] = useState<EmbedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);

  const loadFirebaseData = useCallback(async () => {
    await Promise.all([
      fb.getSettings().then(setSettings).catch(() => {}),
      fb.getEmbeds().then((list: any[]) => {
        setEmbeds(list.filter(e => e.active && e.type === "series" && e.tmdbId === tvId));
      }).catch(() => {}),
    ]);
  }, [tvId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      tmdb.tvDetail(tvId).then(setTv).catch(() => {}),
      loadFirebaseData(),
    ]).finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", s => { if (s === "active") loadFirebaseData(); });
    return () => sub.remove();
  }, [loadFirebaseData]);

  if (isLoading && !tv) {
    return (
      <View style={[S.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={RED} size="large" />
      </View>
    );
  }

  const t = tv;
  const title = t?.name ?? t?.original_name ?? "Serial TV";
  const originalName = t?.original_name ?? title;
  const origLang = t?.original_language ?? "";
  const isDonghua = origLang === "zh" && t?.genres?.some((g: any) => g.id === 16);
  const overview = t?.overview ?? "";
  const backdropUrl = t?.backdrop_path ? `${IMG}/original${t.backdrop_path}` : "";
  const posterUrl = t?.poster_path ? `${IMG_W500}${t.poster_path}` : "";
  const year = t?.first_air_date?.slice(0, 4);
  const seasons = (t?.seasons ?? []).filter((s: any) => s.season_number > 0);
  const cast = t?.credits?.cast?.slice(0, 10) ?? [];
  const similar = t?.similar?.results?.slice(0, 10) ?? [];
  const currentSeason = seasons.find((s: any) => s.season_number === selectedSeason) ?? seasons[0];
  const episodeCount = currentSeason?.episode_count ?? 20;
  const episodes = Array.from({ length: episodeCount }, (_, i) => i + 1);

  const buildServers = (): ServerOption[] => {
    const srvs: ServerOption[] = [
      {
        id: "vidplus",
        label: "VidPlus Premium",
        url: `https://player.vidplus.to/embed/tv/${tvId}/${selectedSeason}/${selectedEpisode}?primarycolor=E50914&secondarycolor=170000&iconcolor=FFFFFF&autoplay=true&autonext=true&icons=netflix`,
        badge: "NEW", badgeColor: "#6C63FF", icon: "🎬",
      },
      {
        id: "vidzee",
        label: "VidZee",
        url: `https://player.vidzee.wtf/embed/tv/${tvId}/${selectedSeason}/${selectedEpisode}`,
        badge: "HD", badgeColor: "#FF6B35", icon: "🎭",
      },
      {
        id: "vixsrc",
        label: "VixSrc",
        url: `https://vixsrc.to/tv/${tvId}/${selectedSeason}/${selectedEpisode}`,
        badge: "ALT", badgeColor: "#059669", icon: "🦊",
      },
      {
        id: "peachify",
        label: "Peachify VIP (Fast)",
        url: buildPeachifyUrl(tvId, selectedSeason, selectedEpisode),
        badge: "VIP", badgeColor: "#ff4757", icon: "🍑",
      },
      {
        id: "scraper",
        label: "🚀 Auto Scraper (Clean)",
        url: "__scraper__",
        badge: "M3U8", badgeColor: "#00c853", icon: "🚀",
        sub: `Cari: ${originalName} ep.${selectedEpisode}`,
      },
      {
        id: "zxc1",
        label: "ZxcStream Server 1",
        url: buildZxcTvUrl(tvId, 1, selectedSeason, selectedEpisode),
        badge: "HD", badgeColor: RED, icon: "🖥️",
      },
      {
        id: "zxc2",
        label: "ZxcStream Server 2",
        url: buildZxcTvUrl(tvId, 2, selectedSeason, selectedEpisode),
        badge: "HD", badgeColor: "#3b82f6", icon: "🖥️",
      },
      {
        id: "zxc3",
        label: "ZxcStream Server 3",
        url: buildZxcTvUrl(tvId, 3, selectedSeason, selectedEpisode),
        badge: "ALT", badgeColor: "#8b5cf6", icon: "🖥️",
      },
    ];
    embeds.forEach((e, i) =>
      srvs.push({
        id: e.id, label: e.title || `Embed ${i + 1}`,
        url: e.url, badge: "EMBED", badgeColor: "#f59e0b", icon: "📡",
        sub: e.sub ? `Sub: ${e.sub}` : undefined,
      })
    );
    return srvs;
  };

  const openPlayer = (srv: ServerOption) => {
    setPickerVisible(false);
    const urlParam = srv.id === "scraper" ? "__scraper__" : srv.url;
    router.push(
      `/player?url=${encodeURIComponent(urlParam)}&title=${encodeURIComponent(title)}&tmdbId=${tvId}&mediaType=tv&season=${selectedSeason}&episode=${selectedEpisode}&originalName=${encodeURIComponent(originalName)}&totalEpisodes=${episodeCount}` as never
    );
  };

  const servers = buildServers();

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Backdrop */}
        <View style={S.backdropWrap}>
          {backdropUrl
            ? <Image source={{ uri: backdropUrl }} style={S.backdrop} />
            : <View style={[S.backdrop, { backgroundColor: CARD_BG }]} />
          }
          <LinearGradient colors={["transparent", "rgba(13,0,0,0.7)", BG]} style={S.backdropGrad} />
          <SafeAreaView>
            <TouchableOpacity style={S.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Text style={S.backBtnText}>‹ Kembali</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Info Row */}
        <View style={S.infoRow}>
          <View style={S.posterWrap}>
            {posterUrl
              ? <Image source={{ uri: posterUrl }} style={S.poster} />
              : <View style={[S.poster, { backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ color: GRAY, fontSize: 30 }}>📺</Text>
                </View>
            }
            <LangBadge lang={origLang} />
          </View>
          <View style={S.metaCol}>
            <Text style={S.title} numberOfLines={3}>{title}</Text>
            {/* Judul Asli (Pinyin) khusus Donghua */}
            {isDonghua && originalName !== title && (
              <Text style={S.pinyinLabel}>Judul Asli: {originalName}</Text>
            )}
            <View style={S.metaRow}>
              {year && <Text style={S.metaChip}>📅 {year}</Text>}
              {seasons.length > 0 && <Text style={S.metaChip}>📂 {seasons.length} Musim</Text>}
            </View>
            <StatusBadge status={t?.status} />
            {t?.vote_average ? <RatingCircle score={t.vote_average} /> : null}
          </View>
        </View>

        {/* Genres */}
        {t?.genres?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.genreRow}>
            {t.genres.map((g: any) => (
              <View key={g.id} style={S.genreChip}>
                <Text style={S.genreText}>{g.name}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Sinopsis */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Sinopsis</Text>
          <Text style={S.overview}>{overview || "Tidak ada deskripsi."}</Text>
        </View>

        {/* Season Picker */}
        {seasons.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Musim</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {seasons.map((s: any) => (
                <TouchableOpacity key={s.season_number}
                  style={[S.seasonChip, selectedSeason === s.season_number && S.seasonChipActive]}
                  onPress={() => { setSelectedSeason(s.season_number); setSelectedEpisode(1); }}
                  activeOpacity={0.8}>
                  <Text style={[S.seasonChipText, selectedSeason === s.season_number && { color: "#fff" }]}>
                    Musim {s.season_number}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Episode List */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Episode — S{selectedSeason}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            {episodes.map(ep => (
              <TouchableOpacity key={ep}
                style={[S.epChip, selectedEpisode === ep && S.epChipActive]}
                onPress={() => setSelectedEpisode(ep)}
                activeOpacity={0.8}>
                <Text style={[S.epChipText, selectedEpisode === ep && { color: "#fff" }]}>
                  {ep}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Watch Button */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20, gap: 10 }}>
          <TouchableOpacity style={S.btnWatchNow}
            onPress={() => openPlayer(servers[0])}
            activeOpacity={0.85}>
            <Text style={S.btnWatchNowText}>▶  Tonton S{selectedSeason}E{selectedEpisode}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.btnServer}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.85}>
            <Text style={S.btnServerText}>🖥️  Pilih Server Lain ({servers.length} tersedia)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.btnShare}
            onPress={() => setShareVisible(true)}
            activeOpacity={0.85}>
            <Text style={S.btnShareText}>↗  Bagikan</Text>
          </TouchableOpacity>
        </View>

        {/* Cast */}
        {cast.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Pemeran</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {cast.map((c: any) => (
                <View key={c.id} style={S.castItem}>
                  {c.profile_path
                    ? <Image source={{ uri: `${IMG_W500}${c.profile_path}` }} style={S.castImg} />
                    : <View style={[S.castImg, { backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center" }]}>
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
                    ? <Image source={{ uri: `${IMG_W500}${s.poster_path}` }} style={S.simPoster} />
                    : <View style={[S.simPoster, { backgroundColor: CARD_BG }]} />
                  }
                  <Text style={S.simTitle} numberOfLines={2}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Comments */}
        <CommentsSection type="tv" tmdbId={tvId} />
      </ScrollView>

      {/* Server Picker Modal */}
      <ServerPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        servers={servers}
        onSelect={openPlayer}
        title={`${title} — S${selectedSeason}E${selectedEpisode}`}
      />

      {/* Share Sheet */}
      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        title={title}
        tmdbId={tvId}
        mediaType="tv"
      />
    </View>
  );
}

const S = StyleSheet.create({
  container:     { flex: 1, backgroundColor: BG },
  backdropWrap:  { height: 240, position: "relative" },
  backdrop:      { width: "100%", height: "100%" },
  backdropGrad:  { ...StyleSheet.absoluteFillObject },
  backBtn:       { margin: 16, alignSelf: "flex-start", backgroundColor: "rgba(13,0,0,0.7)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: "#3a0000" },
  backBtnText:   { color: "#fff", fontSize: 14, fontWeight: "700" },
  infoRow:       { flexDirection: "row", paddingHorizontal: 16, gap: 16, marginTop: -60, marginBottom: 16 },
  posterWrap:    { position: "relative" },
  poster:        { width: 110, height: 165, borderRadius: 12, backgroundColor: CARD_BG },
  langBadge:     { position: "absolute", top: 8, left: 0, paddingHorizontal: 7, paddingVertical: 3, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  langBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  metaCol:       { flex: 1, paddingTop: 60, gap: 6 },
  title:         { color: "#fff", fontSize: 16, fontWeight: "900", lineHeight: 22 },
  pinyinLabel:   { color: GRAY, fontSize: 11, fontStyle: "italic" },
  metaRow:       { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaChip:      { backgroundColor: CARD_BG, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, color: GRAY, fontSize: 11 },
  statusBadge:   { alignSelf: "flex-start", borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  statusText:    { fontSize: 11, fontWeight: "800" },
  ratingCircle:  { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 4 },
  ratingPct:     { fontSize: 14, fontWeight: "900" },
  ratingSymbol:  { color: GRAY, fontSize: 9, fontWeight: "700", marginTop: 4 },
  genreRow:      { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
  genreChip:     { backgroundColor: CARD_BG, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: "#3a0000" },
  genreText:     { color: GRAY, fontSize: 12, fontWeight: "600" },
  section:       { marginBottom: 20 },
  sectionTitle:  { color: "#fff", fontSize: 16, fontWeight: "800", paddingHorizontal: 16, marginBottom: 12 },
  overview:      { color: GRAY, fontSize: 13, lineHeight: 20, paddingHorizontal: 16 },
  seasonChip:    { borderRadius: 20, borderWidth: 1.5, borderColor: "#3a0000", paddingHorizontal: 16, paddingVertical: 8 },
  seasonChipActive: { backgroundColor: RED, borderColor: RED },
  seasonChipText: { color: GRAY, fontSize: 13, fontWeight: "600" },
  epChip:        { width: 44, height: 44, borderRadius: 10, backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#3a0000" },
  epChipActive:  { backgroundColor: RED, borderColor: RED },
  epChipText:    { color: GRAY, fontSize: 12, fontWeight: "700" },
  btnWatchNow:   { backgroundColor: RED, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnWatchNowText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  btnServer:     { backgroundColor: CARD_BG, borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1.5, borderColor: "#3a0000" },
  btnServerText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  btnShare:      { backgroundColor: "transparent", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  btnShareText:  { color: GRAY, fontSize: 13, fontWeight: "600" },
  castItem:      { width: 76, alignItems: "center" },
  castImg:       { width: 76, height: 100, borderRadius: 10, backgroundColor: CARD_BG },
  castName:      { color: "#fff", fontSize: 11, fontWeight: "700", marginTop: 6, textAlign: "center" },
  castChar:      { color: GRAY, fontSize: 10, textAlign: "center" },
  simPoster:     { width: 90, height: 135, borderRadius: 10, backgroundColor: CARD_BG },
  simTitle:      { color: GRAY, fontSize: 11, marginTop: 6, lineHeight: 15 },
});

const P = StyleSheet.create({
  overlay:       { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  sheet:         { backgroundColor: "#1a0000", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, maxHeight: "75%" },
  handle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: "#3a0000", alignSelf: "center", marginBottom: 16 },
  sheetTitle:    { color: "#fff", fontSize: 17, fontWeight: "900", paddingHorizontal: 20, marginBottom: 4 },
  sheetSub:      { color: GRAY, fontSize: 12, paddingHorizontal: 20, marginBottom: 16 },
  serverRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  serverRowFirst: { backgroundColor: "rgba(229,9,20,0.08)" },
  serverIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  serverLabel:   { color: "#fff", fontSize: 14, fontWeight: "700" },
  serverSub:     { color: GRAY, fontSize: 11, marginTop: 2 },
  badge:         { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1.5 },
  badgeText:     { fontSize: 10, fontWeight: "800" },
  sep:           { height: 1, backgroundColor: "#2a0000", marginLeft: 76 },
});
