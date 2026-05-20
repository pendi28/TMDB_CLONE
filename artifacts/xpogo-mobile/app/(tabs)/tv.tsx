import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, Dimensions,
  SafeAreaView, StatusBar, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { tmdb } from "@/lib/tmdb";
import { anilist, AniItem } from "@/lib/anilist";

const IMG = "https://image.tmdb.org/t/p/w500";
const { width } = Dimensions.get("window");
const CARD_W = (width - 52) / 3.3;
const BG = "#0d0000";
const CARD_BG = "#1a0000";
const RED = "#E50914";
const PURPLE = "#7c3aed";
const GRAY = "#8a9bb0";

interface MediaItem {
  id: number;
  name?: string;
  title?: string;
  poster_path?: string | null;
  vote_average?: number;
  original_language?: string;
  first_air_date?: string;
  _source?: "tmdb" | "anilist";
  _aniPoster?: string;
}

function fromAni(item: AniItem): MediaItem {
  const isCN = item.countryOfOrigin === "CN" || item.countryOfOrigin === "TW";
  return {
    id: item.id,
    name: item.title.english ?? item.title.romaji,
    vote_average: item.averageScore ? item.averageScore / 10 : undefined,
    original_language: isCN ? "zh" : "ja",
    _source: "anilist",
    _aniPoster: item.coverImage.large,
  };
}

// ── Badges ───────────────────────────────────────────────────────────────────

function TypeBadge({ lang, source }: { lang?: string; source?: string }) {
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

function Card({ item }: { item: MediaItem }) {
  const router = useRouter();
  const isAni = item._source === "anilist";
  const posterUri = isAni
    ? item._aniPoster
    : (item.poster_path ? `${IMG}${item.poster_path}` : null);

  return (
    <TouchableOpacity style={S.card}
      onPress={() => router.push(`/tv/${item.id}${isAni ? "?source=anilist" : ""}` as never)}
      activeOpacity={0.85}>
      <View style={S.posterWrap}>
        {posterUri
          ? <Image source={{ uri: posterUri }} style={S.poster} />
          : <View style={[S.poster, { alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ color: "#444", fontSize: 9, textAlign: "center", padding: 4 }}>
                {item.name ?? item.title}
              </Text>
            </View>
        }
        <RatingBadge score={item.vote_average} />
        <TypeBadge lang={item.original_language} source={item._source} />
        {isAni && (
          <View style={S.alBadge}>
            <Text style={S.alBadgeText}>AL</Text>
          </View>
        )}
      </View>
      <Text style={S.cardTitle} numberOfLines={2}>{item.name ?? item.title}</Text>
    </TouchableOpacity>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "trending",     label: "🔥 Trending"        },
  { key: "seasonal",     label: "📅 Musim Ini"       },
  { key: "airing",       label: "📡 Tayang"          },
  { key: "top",          label: "⭐ Top Rating"      },
  { key: "donghua",      label: "🐉 Donghua"         },
  { key: "donghuaNew",   label: "🆕 Donghua Baru"    },
  { key: "anime",        label: "⛩️ Anime Jepang"   },
  { key: "animeNew",     label: "🆕 Anime Baru"      },
];

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function TvScreen() {
  const [activeTab, setActiveTab] = useState("trending");
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // AniList
  const [aniTrending, setAniTrending] = useState<MediaItem[]>([]);
  const [aniSeasonal, setAniSeasonal] = useState<MediaItem[]>([]);
  const [aniAiring, setAniAiring] = useState<MediaItem[]>([]);
  const [aniTop, setAniTop] = useState<MediaItem[]>([]);
  const [aniDonghua, setAniDonghua] = useState<MediaItem[]>([]);
  const [aniDonghuaNew, setAniDonghuaNew] = useState<MediaItem[]>([]);

  // TMDB (pelengkap)
  const [tmdbAnime, setTmdbAnime] = useState<MediaItem[]>([]);
  const [tmdbAnimeNew, setTmdbAnimeNew] = useState<MediaItem[]>([]);

  const loadAll = useCallback(async () => {
    await Promise.all([
      anilist.trending().then(d => setAniTrending((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
      anilist.seasonal().then(d => setAniSeasonal((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
      anilist.airing().then(d => setAniAiring((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
    ]);
    await Promise.all([
      anilist.topRated().then(d => setAniTop((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
      anilist.donghua().then(d => setAniDonghua((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
      anilist.donghuaNew().then(d => setAniDonghuaNew((d?.Page?.media ?? []).map(fromAni))).catch(() => {}),
      tmdb.anime().then(d => setTmdbAnime((d.results ?? []).map((x: any) => ({ ...x, _source: "tmdb" as const })))).catch(() => {}),
      tmdb.animeNew().then(d => setTmdbAnimeNew((d.results ?? []).map((x: any) => ({ ...x, _source: "tmdb" as const })))).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debouncedQ.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    Promise.all([
      anilist.search(debouncedQ).catch(() => ({ Page: { media: [] } })),
      tmdb.search(debouncedQ).catch(() => ({ results: [] })),
    ]).then(([aniRes, tmdbRes]) => {
      const aniItems = (aniRes?.Page?.media ?? []).map(fromAni);
      const tmdbItems: MediaItem[] = (tmdbRes.results ?? [])
        .filter((x: any) => x.media_type === "tv" && ["ja", "zh"].includes(x.original_language))
        .slice(0, 10)
        .map((x: any) => ({ ...x, _source: "tmdb" as const }));
      setSearchResults([...aniItems, ...tmdbItems].slice(0, 24));
    }).finally(() => setSearchLoading(false));
  }, [debouncedQ]);

  const tabData: Record<string, MediaItem[]> = {
    trending:   aniTrending,
    seasonal:   aniSeasonal,
    airing:     aniAiring,
    top:        aniTop,
    donghua:    aniDonghua,
    donghuaNew: aniDonghuaNew,
    anime:      tmdbAnime,
    animeNew:   tmdbAnimeNew,
  };

  const tabLabels: Record<string, string> = {
    trending:   "🔥 Trending Anime (AniList)",
    seasonal:   "📅 Anime Musim Ini (AniList)",
    airing:     "📡 Sedang Tayang (AniList)",
    top:        "⭐ Top Rating (AniList)",
    donghua:    "🐉 Donghua Populer (AniList)",
    donghuaNew: "🆕 Donghua Terbaru (AniList)",
    anime:      "⛩️ Anime Jepang (TMDB)",
    animeNew:   "🆕 Anime Baru (TMDB)",
  };

  const items = searching && debouncedQ.length > 1 ? searchResults : (tabData[activeTab] ?? []);
  const isEmpty = !loading && items.length === 0;

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <SafeAreaView style={{ backgroundColor: BG }}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.headerTitle}>Anime & Donghua</Text>
          <TouchableOpacity
            onPress={() => { setSearching(!searching); setQuery(""); setSearchResults([]); }}
            style={S.searchIcon}>
            <Text style={{ color: "#fff", fontSize: 18 }}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Search input */}
        {searching && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
            <TextInput
              style={S.input}
              placeholder="Cari anime, donghua..."
              placeholderTextColor={GRAY}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>
        )}

        {/* Tab chips */}
        {!searching && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}>
            {TABS.map(tab => (
              <TouchableOpacity key={tab.key}
                style={[S.tab, activeTab === tab.key && S.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.8}>
                <Text style={[S.tabText, activeTab === tab.key && S.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Active tab label */}
        {!searching && (
          <View style={S.tabLabelRow}>
            <Text style={S.tabLabel}>{tabLabels[activeTab]}</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Content */}
      {loading
        ? <ActivityIndicator color={RED} size="large" style={{ marginTop: 60 }} />
        : searchLoading
          ? <ActivityIndicator color={RED} size="large" style={{ marginTop: 60 }} />
          : isEmpty
            ? <View style={{ alignItems: "center", marginTop: 60 }}>
                <Text style={{ fontSize: 36 }}>📭</Text>
                <Text style={{ color: GRAY, marginTop: 12, fontSize: 14 }}>Tidak ada data</Text>
              </View>
            : <FlatList
                data={items}
                keyExtractor={i => `${i._source ?? "t"}-${i.id}`}
                numColumns={3}
                contentContainerStyle={S.grid}
                columnWrapperStyle={{ gap: 10 }}
                renderItem={({ item }) => <Card item={item} />}
              />
      }
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BG },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle:  { color: "#fff", fontSize: 22, fontWeight: "900" },
  searchIcon:   { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center" },
  input:        { backgroundColor: CARD_BG, color: "#fff", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: "#3a0000" },
  tab:          { borderRadius: 20, borderWidth: 1.5, borderColor: "#3a0000", paddingHorizontal: 14, paddingVertical: 7 },
  tabActive:    { backgroundColor: RED, borderColor: RED },
  tabText:      { color: GRAY, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  tabLabelRow:  { paddingHorizontal: 16, paddingBottom: 8 },
  tabLabel:     { color: GRAY, fontSize: 12, fontStyle: "italic" },
  grid:         { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8, gap: 10 },
  card:         { flex: 1, maxWidth: CARD_W },
  posterWrap:   { position: "relative", borderRadius: 10, overflow: "hidden" },
  poster:       { width: "100%", aspectRatio: 2 / 3, borderRadius: 10, backgroundColor: CARD_BG },
  ratingBadge:  { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(13,0,0,0.88)", borderRadius: 12, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1.5 },
  ratingText:   { color: "#fff", fontSize: 9, fontWeight: "800" },
  langBadge:    { position: "absolute", top: 6, left: 0, paddingHorizontal: 6, paddingVertical: 2, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  langBadgeText: { color: "#fff", fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  alBadge:      { position: "absolute", bottom: 6, right: 6, backgroundColor: PURPLE, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  alBadgeText:  { color: "#fff", fontSize: 7, fontWeight: "900" },
  cardTitle:    { color: "#c8d6e5", fontSize: 11, marginTop: 6, lineHeight: 15 },
});
