import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Dimensions, StatusBar,
  Modal, TextInput, FlatList, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { tmdb } from "@/lib/tmdb";
import { anilist, AniItem } from "@/lib/anilist";

const IMG_W = "https://image.tmdb.org/t/p/w500";
const IMG_B = "https://image.tmdb.org/t/p/w780";
const { width, height } = Dimensions.get("window");
const CARD_W = (width - 56) / 3.2;
const BG = "#0d0000";
const CARD_BG = "#1a0000";
const RED = "#E50914";
const PURPLE = "#7c3aed";
const GRAY = "#8a9bb0";

// ── Helpers ──────────────────────────────────────────────────────────────────

function isChinese(item: AniItem) {
  return item.countryOfOrigin === "CN" || item.countryOfOrigin === "TW";
}

function aniTitle(item: AniItem) {
  return item.title.english ?? item.title.romaji;
}

function aniScore(item: AniItem) {
  if (!item.averageScore) return undefined;
  return item.averageScore / 10;
}

// Convert AniList item to a format usable in TMDB-style components
interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  media_type?: string;
  overview?: string;
  original_language?: string;
  _source?: "tmdb" | "anilist";
  _aniPoster?: string;
  _aniBanner?: string;
}

function fromAni(item: AniItem): MediaItem {
  return {
    id: item.id,
    name: aniTitle(item),
    vote_average: aniScore(item),
    overview: item.description?.replace(/<[^>]*>/g, ""),
    original_language: isChinese(item) ? "zh" : "ja",
    _source: "anilist",
    _aniPoster: item.coverImage.large,
    _aniBanner: item.bannerImage,
  };
}

// ── Badges ───────────────────────────────────────────────────────────────────

function TypeBadge({ item }: { item: MediaItem }) {
  const lang = item.original_language;
  if (lang === "zh") return (
    <View style={[S.langBadge, { backgroundColor: RED }]}>
      <Text style={S.langBadgeText}>DONGHUA</Text>
    </View>
  );
  if (lang === "ja") return (
    <View style={[S.langBadge, { backgroundColor: PURPLE }]}>
      <Text style={S.langBadgeText}>ANIME</Text>
    </View>
  );
  return null;
}

function SourceBadge({ source }: { source?: "tmdb" | "anilist" }) {
  if (source !== "anilist") return null;
  return (
    <View style={S.sourceBadge}>
      <Text style={S.sourceBadgeText}>AL</Text>
    </View>
  );
}

function RatingBadge({ score }: { score?: number }) {
  if (!score) return null;
  const pct = Math.round(score * 10);
  const color = pct >= 70 ? "#00c853" : pct >= 50 ? "#f5c518" : "#e74c3c";
  return (
    <View style={[S.ratingBadge, { borderColor: color }]}>
      <Text style={[S.ratingText, { color }]}>{pct}%</Text>
    </View>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

function MediaCard({ item }: { item: MediaItem }) {
  const router = useRouter();
  const isAni = item._source === "anilist";
  const posterUri = isAni ? item._aniPoster : (item.poster_path ? `${IMG_W}${item.poster_path}` : null);

  function onPress() {
    if (isAni) {
      router.push(`/tv/${item.id}?source=anilist` as never);
    } else {
      router.push(`/tv/${item.id}` as never);
    }
  }

  return (
    <TouchableOpacity style={S.card} onPress={onPress} activeOpacity={0.85}>
      <View style={S.posterWrap}>
        {posterUri
          ? <Image source={{ uri: posterUri }} style={S.poster} />
          : <View style={[S.poster, S.noImg]}>
              <Text style={{ color: "#444", fontSize: 9, textAlign: "center", padding: 4 }}>
                {item.name ?? item.title}
              </Text>
            </View>
        }
        <RatingBadge score={item.vote_average} />
        <TypeBadge item={item} />
        <SourceBadge source={item._source} />
      </View>
      <Text style={S.cardTitle} numberOfLines={2}>{item.name ?? item.title}</Text>
    </TouchableOpacity>
  );
}

// ── Section Row ──────────────────────────────────────────────────────────────

function SectionRow({ title, items, badge, badgeColor }: {
  title: string; items: MediaItem[]; badge?: string; badgeColor?: string;
}) {
  if (!items.length) return null;
  return (
    <View style={S.section}>
      <View style={S.sectionHeader}>
        <Text style={S.sectionTitle}>{title}</Text>
        {badge && (
          <View style={[S.categoryBadge, { backgroundColor: badgeColor ?? RED }]}>
            <Text style={S.categoryBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {items.map(item => <MediaCard key={`${item._source ?? "t"}-${item.id}`} item={item} />)}
      </ScrollView>
    </View>
  );
}

// ── Hero Banner ──────────────────────────────────────────────────────────────

function HeroBanner({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  const isAni = item._source === "anilist";
  const imgUri = isAni
    ? (item._aniBanner ?? item._aniPoster)
    : (item.backdrop_path ? `${IMG_B}${item.backdrop_path}` : null);

  return (
    <TouchableOpacity style={S.hero} onPress={onPress} activeOpacity={0.9}>
      {imgUri
        ? <Image source={{ uri: imgUri }} style={S.heroImg} resizeMode="cover" />
        : <View style={S.heroImgPlaceholder} />
      }
      <View style={S.heroGrad} />
      <View style={S.heroContent}>
        <TypeBadge item={item} />
        <Text style={S.heroTitle} numberOfLines={2}>{item.name ?? item.title}</Text>
        {item.overview
          ? <Text style={S.heroOverview} numberOfLines={2}>{item.overview}</Text>
          : null
        }
        <View style={S.heroBtns}>
          <TouchableOpacity style={S.btnWatch} onPress={onPress} activeOpacity={0.85}>
            <Text style={S.btnWatchText}>▶  Tonton</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.btnInfo} onPress={onPress} activeOpacity={0.85}>
            <Text style={S.btnInfoText}>ℹ  Info</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchModal, setSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // AniList data
  const [aniTrending, setAniTrending] = useState<MediaItem[]>([]);
  const [aniSeasonal, setAniSeasonal] = useState<MediaItem[]>([]);
  const [aniTopRated, setAniTopRated] = useState<MediaItem[]>([]);
  const [aniAiring, setAniAiring] = useState<MediaItem[]>([]);
  const [aniDonghua, setAniDonghua] = useState<MediaItem[]>([]);
  const [aniDonghuaNew, setAniDonghuaNew] = useState<MediaItem[]>([]);

  // TMDB data
  const [tmdbDonghua, setTmdbDonghua] = useState<MediaItem[]>([]);
  const [tmdbDonghuaNew, setTmdbDonghuaNew] = useState<MediaItem[]>([]);
  const [tmdbDonghuaTop, setTmdbDonghuaTop] = useState<MediaItem[]>([]);
  const [tmdbAnime, setTmdbAnime] = useState<MediaItem[]>([]);
  const [tmdbAnimeNew, setTmdbAnimeNew] = useState<MediaItem[]>([]);

  const hero: MediaItem | null = aniTrending[0] ?? aniAiring[0] ?? null;

  const loadAll = useCallback(async () => {
    // Batch 1 — AniList (paling penting)
    await Promise.all([
      anilist.trending().then(d => setAniTrending((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
      anilist.seasonal().then(d => setAniSeasonal((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
      anilist.airing().then(d => setAniAiring((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
    ]);

    // Batch 2 — AniList lanjutan
    await Promise.all([
      anilist.topRated().then(d => setAniTopRated((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
      anilist.donghua().then(d => setAniDonghua((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
      anilist.donghuaNew().then(d => setAniDonghuaNew((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
    ]);

    // Batch 3 — TMDB (cadangan / pelengkap)
    await Promise.all([
      tmdb.donghua().then(d => setTmdbDonghua((d.results ?? []).map((x: any) => ({ ...x, _source: "tmdb" as const })))).catch(() => {}),
      tmdb.donghuaNew().then(d => setTmdbDonghuaNew((d.results ?? []).map((x: any) => ({ ...x, _source: "tmdb" as const })))).catch(() => {}),
      tmdb.donghuaTopRated().then(d => setTmdbDonghuaTop((d.results ?? []).map((x: any) => ({ ...x, _source: "tmdb" as const })))).catch(() => {}),
      tmdb.anime().then(d => setTmdbAnime((d.results ?? []).map((x: any) => ({ ...x, _source: "tmdb" as const })))).catch(() => {}),
      tmdb.animeNew().then(d => setTmdbAnimeNew((d.results ?? []).map((x: any) => ({ ...x, _source: "tmdb" as const })))).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadAll().finally(() => setIsLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const doSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const [tmdbRes, aniRes] = await Promise.all([
        tmdb.search(q).catch(() => ({ results: [] })),
        anilist.search(q).catch(() => ({ Page: { media: [] } })),
      ]);
      const tmdbItems: MediaItem[] = (tmdbRes.results ?? [])
        .filter((x: any) => x.media_type === "tv")
        .filter((x: any) => ["ja", "zh"].includes(x.original_language))
        .slice(0, 10)
        .map((x: any) => ({ ...x, _source: "tmdb" as const }));
      const aniItems: MediaItem[] = (aniRes?.Page?.media ?? []).map(fromAni);
      setSearchResults([...aniItems, ...tmdbItems].slice(0, 20));
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  function navigateTo(item: MediaItem) {
    if (item._source === "anilist") {
      router.push(`/tv/${item.id}?source=anilist` as never);
    } else {
      router.push(`/tv/${item.id}` as never);
    }
  }

  // Merge AniList + TMDB donghua (dedupe by name)
  const allDonghua = [...aniDonghua, ...tmdbDonghua.filter(t =>
    !aniDonghua.some(a => a.name?.toLowerCase() === (t.name ?? "").toLowerCase())
  )];
  const allAnime = [...aniTrending.filter(a => a.original_language === "ja"), ...tmdbAnime.filter(t =>
    !aniTrending.some(a => a.name?.toLowerCase() === (t.name ?? "").toLowerCase())
  )];

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={[S.headerSafe, { paddingTop: insets.top }]}>
        <View style={S.header}>
          <Text style={S.logoText}>Xpo<Text style={{ color: RED }}>Go</Text></Text>
          <TouchableOpacity style={S.headerIcon} activeOpacity={0.7}
            onPress={() => { setSearchQuery(""); setSearchResults([]); setSearchModal(true); }}>
            <Text style={{ color: "#fff", fontSize: 18 }}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} colors={[RED]} />}
      >
        {/* Hero */}
        {hero && !isLoading && (
          <HeroBanner item={hero} onPress={() => navigateTo(hero)} />
        )}

        {isLoading
          ? <ActivityIndicator color={RED} size="large" style={{ marginTop: 60 }} />
          : <>
              {/* AniList Sections */}
              <SectionRow
                title="🔥 Trending Anime (AniList)"
                items={aniTrending.filter(a => a.original_language === "ja")}
                badge="ANILIST"
                badgeColor={PURPLE}
              />
              <SectionRow
                title="📅 Tayang Musim Ini"
                items={aniSeasonal}
                badge="SEASONAL"
                badgeColor="#0369a1"
              />
              <SectionRow
                title="📡 Sedang Tayang"
                items={aniAiring}
                badge="ON AIR"
                badgeColor="#059669"
              />
              <SectionRow
                title="⭐ Top Rating Sepanjang Masa"
                items={aniTopRated}
                badge="TOP"
                badgeColor="#f59e0b"
              />

              {/* Donghua Sections */}
              <SectionRow
                title="🆕 Donghua Terbaru (AniList)"
                items={aniDonghuaNew}
                badge="NEW"
                badgeColor={RED}
              />
              <SectionRow
                title="🐉 Donghua Populer (AniList)"
                items={aniDonghua}
                badge="DONGHUA"
                badgeColor={RED}
              />
              <SectionRow
                title="🐉 Donghua Populer (TMDB)"
                items={tmdbDonghua}
                badge="TMDB"
                badgeColor="#374151"
              />
              <SectionRow
                title="🆕 Donghua Baru (TMDB)"
                items={tmdbDonghuaNew}
                badge="NEW"
                badgeColor="#374151"
              />
              <SectionRow
                title="⭐ Donghua Rating Tertinggi"
                items={tmdbDonghuaTop}
                badge="TOP"
                badgeColor="#f59e0b"
              />

              {/* Anime Sections */}
              <SectionRow
                title="⛩️ Anime Jepang Populer (TMDB)"
                items={tmdbAnime}
                badge="ANIME"
                badgeColor={PURPLE}
              />
              <SectionRow
                title="🆕 Anime Baru (TMDB)"
                items={tmdbAnimeNew}
                badge="NEW"
                badgeColor={PURPLE}
              />
            </>
        }
      </ScrollView>

      {/* Search Modal */}
      <Modal visible={searchModal} transparent animationType="slide"
        onRequestClose={() => setSearchModal(false)}>
        <View style={[S.searchOverlay, { paddingTop: insets.top }]}>
          <View style={S.searchBar}>
            <TextInput
              style={S.searchInput}
              placeholder="Cari anime, donghua..."
              placeholderTextColor={GRAY}
              value={searchQuery}
              onChangeText={q => {
                setSearchQuery(q);
                if (q.length > 1) doSearch(q);
                else setSearchResults([]);
              }}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => doSearch(searchQuery)}
            />
            <TouchableOpacity onPress={() => setSearchModal(false)} style={S.searchCancel} activeOpacity={0.7}>
              <Text style={{ color: RED, fontWeight: "700", fontSize: 14 }}>Batal</Text>
            </TouchableOpacity>
          </View>
          {searchLoading
            ? <ActivityIndicator color={RED} size="large" style={{ marginTop: 40 }} />
            : searchResults.length > 0
              ? <FlatList
                  data={searchResults}
                  keyExtractor={i => `${i._source ?? "t"}-${i.id}`}
                  numColumns={3}
                  contentContainerStyle={{ padding: 12, gap: 12 }}
                  columnWrapperStyle={{ gap: 12 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.85}
                      onPress={() => { setSearchModal(false); navigateTo(item); }}>
                      <View style={S.posterWrap}>
                        {(item._aniPoster ?? (item.poster_path ? `${IMG_W}${item.poster_path}` : null))
                          ? <Image source={{ uri: item._aniPoster ?? `${IMG_W}${item.poster_path}` }} style={S.poster} />
                          : <View style={[S.poster, S.noImg]}>
                              <Text style={{ color: "#444", fontSize: 9, textAlign: "center", padding: 4 }}>
                                {item.name ?? item.title}
                              </Text>
                            </View>
                        }
                        <TypeBadge item={item} />
                        <SourceBadge source={item._source} />
                      </View>
                      <Text style={S.cardTitle} numberOfLines={2}>{item.name ?? item.title}</Text>
                    </TouchableOpacity>
                  )}
                />
              : <View style={{ alignItems: "center", marginTop: 60 }}>
                  <Text style={{ fontSize: 36 }}>🔍</Text>
                  <Text style={{ color: GRAY, marginTop: 12, fontSize: 14 }}>
                    {searchQuery.length > 0 ? `Tidak ada hasil untuk "${searchQuery}"` : "Ketik untuk mencari anime / donghua"}
                  </Text>
                </View>
          }
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container:          { flex: 1, backgroundColor: BG },
  headerSafe:         { backgroundColor: "rgba(13,0,0,0.97)", zIndex: 10 },
  header:             { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  headerIcon:         { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(26,0,0,0.9)", alignItems: "center", justifyContent: "center" },
  logoText:           { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -1 },
  hero:               { marginHorizontal: 14, height: height * 0.30, borderRadius: 16, overflow: "hidden", position: "relative", marginBottom: 12, marginTop: 6 },
  heroImg:            { position: "absolute", width: "100%", height: "100%" },
  heroImgPlaceholder: { position: "absolute", width: "100%", height: "100%", backgroundColor: CARD_BG },
  heroGrad:           { position: "absolute", inset: 0, backgroundColor: "rgba(13,0,0,0.45)" },
  heroContent:        { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, gap: 4 },
  heroTitle:          { color: "#fff", fontSize: 17, fontWeight: "900", lineHeight: 22, textShadowColor: "rgba(0,0,0,.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroOverview:       { color: "rgba(255,255,255,.7)", fontSize: 11, lineHeight: 15 },
  heroBtns:           { flexDirection: "row", gap: 8, marginTop: 8 },
  btnWatch:           { backgroundColor: RED, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnWatchText:       { color: "#fff", fontWeight: "800", fontSize: 12 },
  btnInfo:            { backgroundColor: "rgba(255,255,255,.14)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,.2)" },
  btnInfoText:        { color: "#fff", fontWeight: "700", fontSize: 12 },
  section:            { marginBottom: 26 },
  sectionHeader:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle:       { color: "#fff", fontSize: 16, fontWeight: "800", flex: 1 },
  categoryBadge:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  categoryBadgeText:  { color: "#fff", fontSize: 10, fontWeight: "800" },
  card:               { width: CARD_W },
  posterWrap:         { position: "relative", borderRadius: 10, overflow: "hidden" },
  poster:             { width: CARD_W, aspectRatio: 2 / 3, borderRadius: 10, backgroundColor: CARD_BG },
  noImg:              { alignItems: "center", justifyContent: "center" },
  ratingBadge:        { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(13,0,0,0.88)", borderRadius: 12, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1.5 },
  ratingText:         { color: "#fff", fontSize: 9, fontWeight: "800" },
  langBadge:          { position: "absolute", top: 6, left: 0, paddingHorizontal: 6, paddingVertical: 2, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  langBadgeText:      { color: "#fff", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  sourceBadge:        { position: "absolute", bottom: 6, right: 6, backgroundColor: PURPLE, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  sourceBadgeText:    { color: "#fff", fontSize: 7, fontWeight: "900" },
  cardTitle:          { color: "#c8d6e5", fontSize: 12, marginTop: 7, lineHeight: 16, fontWeight: "500" },
  searchOverlay:      { flex: 1, backgroundColor: BG },
  searchBar:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: "#2a0000" },
  searchInput:        { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#fff", fontSize: 15, borderWidth: 1, borderColor: "#3a0000" },
  searchCancel:       { paddingHorizontal: 6, paddingVertical: 8 },
});
