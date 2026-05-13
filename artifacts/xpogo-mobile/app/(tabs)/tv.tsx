import { useState, useEffect } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Image, StyleSheet, ActivityIndicator, Dimensions, SafeAreaView, StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { tmdb } from "@/lib/tmdb";

const IMG = "https://image.tmdb.org/t/p/w500";
const { width } = Dimensions.get("window");
const CARD_W = (width - 52) / 3.3;
const BG = "#0d0000";
const CARD_BG = "#1a0000";
const RED = "#E50914";
const GRAY = "#8a9bb0";

interface MediaItem {
  id: number; title?: string; name?: string;
  poster_path?: string | null; vote_average?: number;
  media_type?: string; original_language?: string;
  first_air_date?: string;
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

function NewBadge({ date }: { date?: string }) {
  if (!date) return null;
  const year = parseInt(date.slice(0, 4));
  if (year < 2024) return null;
  return (
    <View style={S.newBadge}>
      <Text style={S.newBadgeText}>NEW</Text>
    </View>
  );
}

function RatingBadge({ score }: { score?: number }) {
  if (!score) return null;
  return (
    <View style={S.badge}>
      <Text style={S.badgeText}>{Math.round(score * 10)}%</Text>
    </View>
  );
}

function Card({ item }: { item: MediaItem }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={S.card}
      onPress={() => router.push(`/tv/${item.id}` as never)}
      activeOpacity={0.85}>
      <View style={S.posterWrap}>
        {item.poster_path
          ? <Image source={{ uri: `${IMG}${item.poster_path}` }} style={S.poster} />
          : <View style={[S.poster, { alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ color: "#444", fontSize: 9 }}>{item.name}</Text>
            </View>
        }
        <RatingBadge score={item.vote_average} />
        <LangBadge lang={item.original_language} />
        <NewBadge date={item.first_air_date} />
      </View>
      <Text style={S.title} numberOfLines={2}>{item.name ?? item.title}</Text>
    </TouchableOpacity>
  );
}

const TABS = [
  { key: "all",        label: "Semua"          },
  { key: "donghua",    label: "🐉 Donghua"     },
  { key: "donghuana",  label: "🆕 New Donghua" },
  { key: "anime",      label: "⛩️ Anime"       },
  { key: "kdrama",     label: "🇰🇷 K-Drama"   },
  { key: "cdrama",     label: "🇨🇳 C-Drama"   },
];

export default function TvScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [popular, setPopular] = useState<MediaItem[]>([]);
  const [topRated, setTopRated] = useState<MediaItem[]>([]);
  const [donghuaList, setDonghuaList] = useState<MediaItem[]>([]);
  const [donghuaNewList, setDonghuaNewList] = useState<MediaItem[]>([]);
  const [donghuaTopList, setDonghuaTopList] = useState<MediaItem[]>([]);
  const [animeList, setAnimeList] = useState<MediaItem[]>([]);
  const [animeNewList, setAnimeNewList] = useState<MediaItem[]>([]);
  const [kdramaList, setKdramaList] = useState<MediaItem[]>([]);
  const [cdramaList, setCdramaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      tmdb.popularTv().then(d => setPopular(d.results ?? [])),
      tmdb.topTv().then(d => setTopRated(d.results ?? [])),
      tmdb.donghua().then(d => setDonghuaList(d.results ?? [])),
      tmdb.donghuaNew().then(d => setDonghuaNewList(d.results ?? [])),
      tmdb.donghuaTopRated().then(d => setDonghuaTopList(d.results ?? [])),
      tmdb.anime().then(d => setAnimeList(d.results ?? [])),
      tmdb.animeNew().then(d => setAnimeNewList(d.results ?? [])),
      tmdb.dramaKorea().then(d => setKdramaList(d.results ?? [])),
      tmdb.dramaChina().then(d => setCdramaList(d.results ?? [])),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debouncedQ.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    tmdb.search(debouncedQ)
      .then(d => setSearchResults((d.results ?? []).filter((r: any) => r.media_type === "tv")))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [debouncedQ]);

  const tabItems: MediaItem[] =
    activeTab === "donghua"   ? donghuaList    :
    activeTab === "donghuana" ? donghuaNewList :
    activeTab === "anime"     ? animeList      :
    activeTab === "kdrama"    ? kdramaList     :
    activeTab === "cdrama"    ? cdramaList     :
    [...popular];

  function Section({ title, items, badge }: { title: string; items: MediaItem[]; badge?: string }) {
    if (!items.length) return null;
    return (
      <View style={{ marginBottom: 28 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
          <Text style={S.sectionTitle}>{title}</Text>
          {badge && (
            <View style={S.sectionBadge}>
              <Text style={S.sectionBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {items.map(i => <Card key={i.id} item={i} />)}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <SafeAreaView style={{ backgroundColor: BG }}>
        <View style={S.header}>
          <Text style={S.headerTitle}>Serial TV</Text>
          <TouchableOpacity onPress={() => { setSearching(!searching); setQuery(""); }} style={S.searchIcon}>
            <Text style={{ color: "#fff", fontSize: 18 }}>🔍</Text>
          </TouchableOpacity>
        </View>
        {searching && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <TextInput
              style={S.input}
              placeholder="Cari serial TV, anime, donghua..."
              placeholderTextColor={GRAY}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 10 }}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab.key}
              style={[S.tab, activeTab === tab.key && S.tabActive]}
              onPress={() => setActiveTab(tab.key)} activeOpacity={0.8}>
              <Text style={[S.tabText, activeTab === tab.key && S.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      {searching && debouncedQ.length > 1 ? (
        <ScrollView contentContainerStyle={S.grid}>
          {searchLoading
            ? <ActivityIndicator color={RED} />
            : searchResults.map(i => <Card key={i.id} item={i} />)
          }
        </ScrollView>
      ) : loading ? (
        <ActivityIndicator color={RED} style={{ marginTop: 60 }} />
      ) : activeTab === "all" ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}>
          <Section title="🆕 Donghua Rilis Terbaru" items={donghuaNewList} badge="2024-2025" />
          <Section title="🐉 Top Donghua Populer" items={donghuaList} />
          <Section title="🏆 Donghua Rating Tertinggi" items={donghuaTopList} />
          <Section title="🔥 TV Populer" items={popular} />
          <Section title="⭐ Penilaian Teratas" items={topRated} />
          <Section title="🆕 Anime Baru" items={animeNewList} badge="2024-2025" />
          <Section title="⛩️ Anime Jepang" items={animeList} />
          <Section title="🇰🇷 Drama Korea" items={kdramaList} />
          <Section title="🇨🇳 Drama China" items={cdramaList} />
        </ScrollView>
      ) : activeTab === "donghuana" ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}>
          <View style={S.infoBar}>
            <Text style={S.infoText}>🆕 Donghua baru rilis 2024–2025 dari TMDB</Text>
          </View>
          <ScrollView contentContainerStyle={[S.grid, { paddingTop: 4 }]}>
            {donghuaNewList.map(i => <Card key={i.id} item={i} />)}
          </ScrollView>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={S.grid}>
          {tabItems.map(i => <Card key={i.id} item={i} />)}
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  searchIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center" },
  input: { backgroundColor: CARD_BG, color: "#fff", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  tab: { borderRadius: 20, borderWidth: 1.5, borderColor: "#3a0000", paddingHorizontal: 14, paddingVertical: 7 },
  tabActive: { backgroundColor: RED, borderColor: RED },
  tabText: { color: GRAY, fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  sectionBadge: { backgroundColor: "#7c3a00", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  sectionBadgeText: { color: "#ffd700", fontSize: 9, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingBottom: 120, gap: 10 },
  card: { width: CARD_W },
  posterWrap: { position: "relative", borderRadius: 10, overflow: "hidden" },
  poster: { width: CARD_W, aspectRatio: 2 / 3, borderRadius: 10, backgroundColor: CARD_BG },
  badge: { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(13,0,0,0.85)", borderRadius: 12, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1.5, borderColor: "#00c853" },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  newBadge: { position: "absolute", bottom: 6, right: 6, backgroundColor: RED, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  newBadgeText: { color: "#fff", fontSize: 8, fontWeight: "900" },
  langBadge: { position: "absolute", top: 6, left: 0, paddingHorizontal: 6, paddingVertical: 2, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  langBadgeText: { color: "#fff", fontSize: 8, fontWeight: "900" },
  title: { color: "#c8d6e5", fontSize: 11, marginTop: 6, lineHeight: 15 },
  infoBar: { marginHorizontal: 16, marginBottom: 12, backgroundColor: "#2a0800", borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: RED },
  infoText: { color: "#ffd700", fontSize: 12, fontWeight: "600" },
});
