import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, ActivityIndicator, Dimensions, StatusBar,
  Animated, BackHandler, Modal, TextInput, FlatList,
  TouchableWithoutFeedback, Alert, AppState, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { tmdb } from "@/lib/tmdb";
import { fb } from "@/lib/firebase";

const IMG_W = "https://image.tmdb.org/t/p/w500";
const IMG_B = "https://image.tmdb.org/t/p/w780";
const { width, height } = Dimensions.get("window");
const DRAWER_W = Math.min(width * 0.82, 320);
const CARD_W = (width - 56) / 3.2;
const BG = "#0d0000";
const CARD_BG = "#1a0000";
const RED = "#E50914";
const GRAY = "#8a9bb0";

const GENRES = ["Aksi", "Komedi", "Drama", "Horor", "Fiksi Ilmiah", "Animasi", "Thriller"];
const GENRE_MAP: Record<string, { movieId?: number; tvId?: number }> = {
  "Aksi":         { movieId: 28,  tvId: 10759 },
  "Komedi":       { movieId: 35,  tvId: 35    },
  "Drama":        { movieId: 18,  tvId: 18    },
  "Horor":        { movieId: 27              },
  "Fiksi Ilmiah": { movieId: 878, tvId: 10765 },
  "Animasi":      { movieId: 16,  tvId: 16   },
  "Thriller":     { movieId: 53              },
};

interface MediaItem {
  id: number; title?: string; name?: string;
  poster_path?: string | null; backdrop_path?: string | null;
  vote_average?: number; media_type?: string; overview?: string;
  original_language?: string;
}
interface CustomMovie {
  id: string; title: string; posterUrl?: string; backdropUrl?: string;
  type: "movie" | "series"; tmdbId?: number; description?: string;
}

function LanguageBadge({ lang }: { lang?: string }) {
  if (!lang) return null;
  if (lang === "zh") return (
    <View style={[S.langBadge, { backgroundColor: RED }]}>
      <Text style={S.langBadgeText}>DONGHUA</Text>
    </View>
  );
  if (lang === "ja") return (
    <View style={[S.langBadge, { backgroundColor: "#7c3aed" }]}>
      <Text style={S.langBadgeText}>ANIME</Text>
    </View>
  );
  if (lang === "ko") return (
    <View style={[S.langBadge, { backgroundColor: "#0369a1" }]}>
      <Text style={S.langBadgeText}>K-DRAMA</Text>
    </View>
  );
  return null;
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

function MediaCard({ item, type }: { item: MediaItem; type: "movie" | "tv" }) {
  const router = useRouter();
  const mt = (item.media_type as "movie" | "tv") ?? type;
  return (
    <TouchableOpacity style={S.card}
      onPress={() => router.push((mt === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`) as never)}
      activeOpacity={0.85}>
      <View style={S.posterWrap}>
        {item.poster_path
          ? <Image source={{ uri: `${IMG_W}${item.poster_path}` }} style={S.poster} />
          : <View style={[S.poster, S.noImg]}>
              <Text style={{ color: "#444", fontSize: 9, textAlign: "center", padding: 4 }}>
                {item.title ?? item.name}
              </Text>
            </View>
        }
        <RatingBadge score={item.vote_average} />
        <LanguageBadge lang={item.original_language} />
      </View>
      <Text style={S.cardTitle} numberOfLines={2}>{item.title ?? item.name}</Text>
    </TouchableOpacity>
  );
}

function SectionRow({ title, items, type, badge }: {
  title: string; items: MediaItem[]; type: "movie" | "tv"; badge?: string;
}) {
  if (!items.length) return null;
  return (
    <View style={S.section}>
      <View style={S.sectionHeader}>
        <Text style={S.sectionTitle}>{title}</Text>
        {badge && (
          <View style={[S.categoryBadge, { backgroundColor: RED }]}>
            <Text style={S.categoryBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
        {items.map(item => <MediaCard key={item.id} item={item} type={type} />)}
      </ScrollView>
    </View>
  );
}

function HeroBanner({ item, onWatch, onInfo }: {
  item: MediaItem; onWatch: () => void; onInfo: () => void;
}) {
  const pct = item.vote_average ? Math.round(item.vote_average * 10) : 0;
  return (
    <View style={S.hero}>
      {item.backdrop_path
        ? <Image source={{ uri: `${IMG_B}${item.backdrop_path}` }} style={S.heroImg} resizeMode="cover" />
        : <View style={S.heroImgPlaceholder} />
      }
      <View style={S.heroGrad} />
      <View style={S.heroContent}>
        <LanguageBadge lang={item.original_language} />
        <Text style={S.heroTitle} numberOfLines={2}>{item.title ?? item.name}</Text>
        {item.overview
          ? <Text style={S.heroOverview} numberOfLines={2}>{item.overview}</Text>
          : null
        }
        <View style={S.heroBtns}>
          <TouchableOpacity style={S.btnWatch} onPress={onWatch} activeOpacity={0.85}>
            <Text style={S.btnWatchText}>▶  Tonton</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.btnInfo} onPress={onInfo} activeOpacity={0.85}>
            <Text style={S.btnInfoText}>ℹ  Info</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [trendingTab, setTrendingTab] = useState<"day" | "week">("week");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [customMovies, setCustomMovies] = useState<CustomMovie[]>([]);
  const [searchModal, setSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [trendWeek, setTrendWeek] = useState<any>(null);
  const [trendDay, setTrendDay] = useState<any>(null);
  const [moviesData, setMoviesData] = useState<any>(null);
  const [topMoviesData, setTopMoviesData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Kategori khusus
  const [donghuaList, setDonghuaList] = useState<MediaItem[]>([]);
  const [donghuaNewList, setDonghuaNewList] = useState<MediaItem[]>([]);
  const [animeList, setAnimeList] = useState<MediaItem[]>([]);
  const [kdramaList, setKdramaList] = useState<MediaItem[]>([]);
  const [cdramaList, setCdramaList] = useState<MediaItem[]>([]);

  const loadAll = useCallback(async () => {
    return Promise.all([
      tmdb.trending("all", "week").then(setTrendWeek).catch(() => {}),
      tmdb.trending("all", "day").then(setTrendDay).catch(() => {}),
      tmdb.popularMovies().then(setMoviesData).catch(() => {}),
      tmdb.topMovies().then(setTopMoviesData).catch(() => {}),
      tmdb.donghua().then(d => setDonghuaList(d.results ?? [])).catch(() => {}),
      tmdb.donghuaNew().then(d => setDonghuaNewList(d.results ?? [])).catch(() => {}),
      tmdb.anime().then(d => setAnimeList(d.results ?? [])).catch(() => {}),
      tmdb.dramaKorea().then(d => setKdramaList(d.results ?? [])).catch(() => {}),
      tmdb.dramaChina().then(d => setCdramaList(d.results ?? [])).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadAll().finally(() => setIsLoading(false));
  }, []);

  const loadFirebaseData = useCallback(async () => {
    try {
      const d = await fb.getCustomMovies();
      setCustomMovies(d as CustomMovie[]);
    } catch {}
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFirebaseData(), loadAll()]);
    setRefreshing(false);
  }, [loadAll, loadFirebaseData]);

  useEffect(() => { loadFirebaseData(); }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", s => { if (s === "active") loadFirebaseData(); });
    return () => sub.remove();
  }, [loadFirebaseData]);

  useEffect(() => {
    const id = setInterval(loadFirebaseData, 30_000);
    return () => clearInterval(id);
  }, [loadFirebaseData]);

  const doSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const data = await tmdb.search(q);
      const items = (data.results ?? [])
        .filter((x: any) => x.media_type === "movie" || x.media_type === "tv")
        .slice(0, 20);
      setSearchResults(items);
    } catch { setSearchResults([]); }
    finally { setSearchLoading(false); }
  };

  const trendResults   = (trendingTab === "day" ? trendDay : trendWeek)?.results as MediaItem[] ?? [];
  const popularMovies  = moviesData?.results as MediaItem[] ?? [];
  const heroItem       = trendResults[0] ?? popularMovies[0];

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
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
        {heroItem && !isLoading && (
          <HeroBanner
            item={heroItem}
            onWatch={() => router.push((heroItem.media_type === "tv" ? `/tv/${heroItem.id}` : `/movie/${heroItem.id}`) as never)}
            onInfo={() => router.push((heroItem.media_type === "tv" ? `/tv/${heroItem.id}` : `/movie/${heroItem.id}`) as never)}
          />
        )}

        {isLoading
          ? <ActivityIndicator color={RED} size="large" style={{ marginTop: 60 }} />
          : <>
              {/* Genre Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={S.genres}>
                {GENRES.map(g => (
                  <TouchableOpacity key={g}
                    style={[S.genreChip, activeGenre === g && S.genreChipActive]}
                    onPress={() => setActiveGenre(activeGenre === g ? null : g)}
                    activeOpacity={0.8}>
                    <Text style={[S.genreText, activeGenre === g && S.genreTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 5 Baris Kategori Utama */}
              <SectionRow title="🆕 Donghua Rilis Terbaru" items={donghuaNewList} type="tv" badge="NEW 2025" />
              <SectionRow title="🐉 Top Donghua Terpopuler" items={donghuaList} type="tv" badge="DONGHUA" />
              <SectionRow title="⛩️ Update Anime Jepang" items={animeList} type="tv" badge="ANIME" />
              <SectionRow title="🇰🇷 Drama Korea Terbaru" items={kdramaList} type="tv" badge="K-DRAMA" />
              <SectionRow title="🇨🇳 Chinese Drama" items={cdramaList} type="tv" badge="C-DRAMA" />

              {/* Trending */}
              <View style={S.section}>
                <View style={S.sectionHeader}>
                  <Text style={S.sectionTitle}>📈 Trending</Text>
                  <View style={S.toggleRow}>
                    {(["day", "week"] as const).map(tab => (
                      <TouchableOpacity key={tab}
                        style={[S.toggleBtn, trendingTab === tab && S.toggleBtnActive]}
                        onPress={() => setTrendingTab(tab)} activeOpacity={0.8}>
                        <Text style={[S.toggleText, trendingTab === tab && S.toggleTextActive]}>
                          {tab === "day" ? "Hari ini" : "Minggu ini"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
                  {trendResults.map(item => <MediaCard key={item.id} item={item} type="movie" />)}
                </ScrollView>
              </View>

              <SectionRow title="🔥 Film Populer" items={popularMovies} type="movie" />
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
              placeholder="Cari donghua, anime, drama..."
              placeholderTextColor={GRAY}
              value={searchQuery}
              onChangeText={q => { setSearchQuery(q); if (q.length > 1) doSearch(q); else setSearchResults([]); }}
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
                  keyExtractor={i => `${i.id}-${i.media_type}`}
                  numColumns={3}
                  contentContainerStyle={{ padding: 12, gap: 12 }}
                  columnWrapperStyle={{ gap: 12 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.85}
                      onPress={() => { setSearchModal(false); router.push((item.media_type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`) as never); }}>
                      <View style={S.posterWrap}>
                        {item.poster_path
                          ? <Image source={{ uri: `${IMG_W}${item.poster_path}` }} style={S.poster} />
                          : <View style={[S.poster, S.noImg]}><Text style={{ color: "#444", fontSize: 9, textAlign: "center", padding: 4 }}>{item.title ?? item.name}</Text></View>
                        }
                        <LanguageBadge lang={item.original_language} />
                      </View>
                      <Text style={S.cardTitle} numberOfLines={2}>{item.title ?? item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              : <View style={{ alignItems: "center", marginTop: 60 }}>
                  <Text style={{ fontSize: 36 }}>🔍</Text>
                  <Text style={{ color: GRAY, marginTop: 12, fontSize: 14 }}>
                    {searchQuery.length > 0 ? `Tidak ada hasil untuk "${searchQuery}"` : "Ketik untuk mencari"}
                  </Text>
                </View>
          }
        </View>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container:        { flex: 1, backgroundColor: BG },
  headerSafe:       { backgroundColor: "rgba(13,0,0,0.97)", zIndex: 10 },
  header:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  headerIcon:       { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(26,0,0,0.9)", alignItems: "center", justifyContent: "center" },
  logoText:         { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -1 },
  hero:             { marginHorizontal: 14, height: height * 0.30, borderRadius: 16, overflow: "hidden", position: "relative", marginBottom: 12, marginTop: 6 },
  heroImg:          { position: "absolute", width: "100%", height: "100%" },
  heroImgPlaceholder: { position: "absolute", width: "100%", height: "100%", backgroundColor: CARD_BG },
  heroGrad:         { position: "absolute", inset: 0, backgroundColor: "rgba(13,0,0,0.45)" },
  heroContent:      { position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, gap: 4 },
  heroTitle:        { color: "#fff", fontSize: 17, fontWeight: "900", lineHeight: 22, textShadowColor: "rgba(0,0,0,.9)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  heroOverview:     { color: "rgba(255,255,255,.7)", fontSize: 11, lineHeight: 15 },
  heroBtns:         { flexDirection: "row", gap: 8, marginTop: 8 },
  btnWatch:         { backgroundColor: RED, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnWatchText:     { color: "#fff", fontWeight: "800", fontSize: 12 },
  btnInfo:          { backgroundColor: "rgba(255,255,255,.14)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "rgba(255,255,255,.2)" },
  btnInfoText:      { color: "#fff", fontWeight: "700", fontSize: 12 },
  genres:           { paddingHorizontal: 16, gap: 8, paddingVertical: 14 },
  genreChip:        { borderRadius: 20, borderWidth: 1.5, borderColor: "#3a0000", paddingHorizontal: 16, paddingVertical: 8 },
  genreChipActive:  { backgroundColor: RED, borderColor: RED },
  genreText:        { color: GRAY, fontSize: 13, fontWeight: "600" },
  genreTextActive:  { color: "#fff" },
  section:          { marginBottom: 26 },
  sectionHeader:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle:     { color: "#fff", fontSize: 17, fontWeight: "800" },
  categoryBadge:    { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  categoryBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  toggleRow:        { flexDirection: "row", backgroundColor: CARD_BG, borderRadius: 20, padding: 3 },
  toggleBtn:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18 },
  toggleBtnActive:  { backgroundColor: RED },
  toggleText:       { color: GRAY, fontSize: 12, fontWeight: "600" },
  toggleTextActive: { color: "#fff" },
  card:             { width: CARD_W },
  posterWrap:       { position: "relative", borderRadius: 10, overflow: "hidden" },
  poster:           { width: CARD_W, aspectRatio: 2 / 3, borderRadius: 10, backgroundColor: CARD_BG },
  noImg:            { alignItems: "center", justifyContent: "center" },
  ratingBadge:      { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(13,0,0,0.88)", borderRadius: 12, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1.5 },
  ratingText:       { color: "#fff", fontSize: 9, fontWeight: "800" },
  langBadge:        { position: "absolute", top: 6, left: 0, paddingHorizontal: 6, paddingVertical: 2, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  langBadgeText:    { color: "#fff", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  cardTitle:        { color: "#c8d6e5", fontSize: 12, marginTop: 7, lineHeight: 16, fontWeight: "500" },
  searchOverlay:    { flex: 1, backgroundColor: BG },
  searchBar:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: "#2a0000" },
  searchInput:      { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#fff", fontSize: 15, borderWidth: 1, borderColor: "#3a0000" },
  searchCancel:     { paddingHorizontal: 6, paddingVertical: 8 },
});
