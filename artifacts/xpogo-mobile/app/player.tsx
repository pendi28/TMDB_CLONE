import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View, StyleSheet, TouchableOpacity, Text,
  StatusBar, ActivityIndicator, Dimensions, ScrollView,
  BackHandler, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import WebView from "react-native-webview";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";
import { fb } from "@/lib/firebase";

const BG = "#0d0000";
const CARD_BG = "#1a0000";
const RED = "#E50914";
const GRAY = "#8a9bb0";
const GREEN = "#00c853";

const CONSUMET_BASE = "https://api-consumet-org-three.vercel.app/anime/gogoanime";

interface EmbedRecord {
  id: string; title: string; url: string;
  type: string; active: boolean; tmdbId?: number; sub?: string;
}
interface ServerItem {
  id: string; label: string; url: string;
  badge: string; badgeColor: string; icon: string; sub?: string;
}

function buildZxcMovieUrl(id: number, serverNum: number) {
  return `https://zxcstream.xyz/player/movie/${id}?server=${serverNum}&color=E50914&autoplay=true&back=true`;
}
function buildZxcTvUrl(id: number, serverNum: number, season: number, episode: number) {
  return `https://zxcstream.xyz/player/tv/${id}?server=${serverNum}&color=E50914&autoplay=true&back=true&season=${season}&episode=${episode}`;
}
function buildPeachifyUrl(tmdbId: number, mediaType: string, season: number, episode: number) {
  if (mediaType === "movie") {
    return `https://peachify.top/embed/movie/${tmdbId}?accent=E50914`;
  }
  return `https://peachify.top/embed/tv/${tmdbId}/${season}/${episode}?accent=E50914&autoNext=1`;
}
function buildVidPlusMovieUrl(tmdbId: number) {
  return `https://player.vidplus.to/embed/movie/${tmdbId}?primarycolor=E50914&secondarycolor=170000&iconcolor=FFFFFF&autoplay=true&autonext=true&icons=netflix`;
}
function buildVidPlusTvUrl(tmdbId: number, season: number, episode: number) {
  return `https://player.vidplus.to/embed/tv/${tmdbId}/${season}/${episode}?primarycolor=E50914&secondarycolor=170000&iconcolor=FFFFFF&autoplay=true&autonext=true&icons=netflix`;
}
function buildVidZeeMovieUrl(tmdbId: number) {
  return `https://player.vidzee.wtf/embed/movie/${tmdbId}`;
}
function buildVidZeeTvUrl(tmdbId: number, season: number, episode: number) {
  return `https://player.vidzee.wtf/embed/tv/${tmdbId}/${season}/${episode}`;
}
function buildVixSrcMovieUrl(tmdbId: number) {
  return `https://vixsrc.to/movie/${tmdbId}`;
}
function buildVixSrcTvUrl(tmdbId: number, season: number, episode: number) {
  return `https://vixsrc.to/tv/${tmdbId}/${season}/${episode}`;
}

async function setImmersive(on: boolean) {
  if (Platform.OS !== "android") return;
  try {
    await NavigationBar.setVisibilityAsync(on ? "hidden" : "visible");
    if (on) await NavigationBar.setBehaviorAsync("overlay-swipe");
  } catch {}
}

// ── Auto Scraper via Consumet ────────────────────────────────────────
async function scrapeM3u8(originalName: string, episode: number): Promise<string | null> {
  try {
    // Cari judul di GogoAnime
    const searchRes = await fetch(`${CONSUMET_BASE}/${encodeURIComponent(originalName)}`);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const results = searchData?.results ?? [];
    if (!results.length) return null;

    // Ambil hasil teratas
    const animeId = results[0]?.id;
    if (!animeId) return null;

    // Fetch link streaming episode
    const epRes = await fetch(`${CONSUMET_BASE}/watch/${animeId}-episode-${episode}`);
    if (!epRes.ok) return null;
    const epData = await epRes.json();

    // Ambil link m3u8 (prioritas default)
    const sources = epData?.sources ?? [];
    const defaultSrc = sources.find((s: any) => s.quality === "default" || s.isM3U8) ?? sources[0];
    if (defaultSrc?.url) return defaultSrc.url as string;
    return null;
  } catch {
    return null;
  }
}

export default function PlayerScreen() {
  const params = useLocalSearchParams<{
    url: string; title?: string; tmdbId?: string;
    mediaType?: string; season?: string; episode?: string;
    originalName?: string; totalEpisodes?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tmdbId      = params.tmdbId ? Number(params.tmdbId) : null;
  const mediaType   = params.mediaType ?? "movie";
  const title       = params.title ? decodeURIComponent(params.title) : "";
  const originalName = params.originalName ? decodeURIComponent(params.originalName) : title;
  const totalEp     = params.totalEpisodes ? Number(params.totalEpisodes) : null;

  const [season, setSeason]   = useState(params.season ? Number(params.season) : 1);
  const [episode, setEpisode] = useState(params.episode ? Number(params.episode) : 1);

  const [activeUrl, setActiveUrl]         = useState(params.url ? decodeURIComponent(params.url) : "");
  const [loading, setLoading]             = useState(true);
  const [fullscreen, setFullscreen]       = useState(false);
  const [screenSize, setScreenSize]       = useState(Dimensions.get("window"));
  const [servers, setServers]             = useState<ServerItem[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>("");
  const [scraping, setScraping]           = useState(false);
  const [scrapeStatus, setScrapeStatus]   = useState<string>("");

  // ── Fullscreen helpers ────────────────────────────────────────
  const enterFullscreen = useCallback(async () => {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    await setImmersive(true);
    setFullscreen(true);
  }, []);

  const exitFullscreen = useCallback(async () => {
    setFullscreen(false);
    await setImmersive(false);
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setScreenSize(window));
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (fullscreen) { exitFullscreen(); return true; }
      return false;
    });
    return () => h.remove();
  }, [fullscreen, exitFullscreen]);

  useEffect(() => {
    return () => {
      setImmersive(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // ── Build server list ────────────────────────────────────────
  const buildServers = useCallback((embeds: EmbedRecord[]): ServerItem[] => {
    const list: ServerItem[] = [];
    if (!tmdbId) return list;

    // 1. VidPlus (server baru)
    list.push({
      id: "vidplus",
      label: "VidPlus Premium",
      url: mediaType === "movie"
        ? buildVidPlusMovieUrl(tmdbId)
        : buildVidPlusTvUrl(tmdbId, season, episode),
      badge: "NEW",
      badgeColor: "#6C63FF",
      icon: "🎬",
    });

    // 2. VidZee
    list.push({
      id: "vidzee",
      label: "VidZee",
      url: mediaType === "movie"
        ? buildVidZeeMovieUrl(tmdbId)
        : buildVidZeeTvUrl(tmdbId, season, episode),
      badge: "HD",
      badgeColor: "#FF6B35",
      icon: "🎭",
    });

    // 3. VixSrc
    list.push({
      id: "vixsrc",
      label: "VixSrc",
      url: mediaType === "movie"
        ? buildVixSrcMovieUrl(tmdbId)
        : buildVixSrcTvUrl(tmdbId, season, episode),
      badge: "ALT",
      badgeColor: "#059669",
      icon: "🦊",
    });

    // 4. Peachify VIP
    list.push({
      id: "peachify",
      label: "Peachify VIP (Fast)",
      url: buildPeachifyUrl(tmdbId, mediaType, season, episode),
      badge: "VIP",
      badgeColor: "#ff4757",
      icon: "🍑",
    });

    // 3. Auto Scraper (Consumet)
    list.push({
      id: "scraper",
      label: "🚀 Auto Scraper (Clean)",
      url: "__scraper__",
      badge: "M3U8",
      badgeColor: GREEN,
      icon: "🚀",
      sub: `Cari: ${originalName} ep.${episode}`,
    });

    // 4. ZxcStream servers
    if (mediaType === "movie") {
      list.push(
        { id: "zxc1", label: "ZxcStream Server 1", url: buildZxcMovieUrl(tmdbId, 1), badge: "HD", badgeColor: RED, icon: "🖥️" },
        { id: "zxc2", label: "ZxcStream Server 2", url: buildZxcMovieUrl(tmdbId, 2), badge: "HD", badgeColor: "#3b82f6", icon: "🖥️" },
        { id: "zxc3", label: "ZxcStream Server 3", url: buildZxcMovieUrl(tmdbId, 3), badge: "ALT", badgeColor: "#8b5cf6", icon: "🖥️" },
      );
    } else {
      list.push(
        { id: "zxc1", label: "ZxcStream Server 1", url: buildZxcTvUrl(tmdbId, 1, season, episode), badge: "HD", badgeColor: RED, icon: "🖥️" },
        { id: "zxc2", label: "ZxcStream Server 2", url: buildZxcTvUrl(tmdbId, 2, season, episode), badge: "HD", badgeColor: "#3b82f6", icon: "🖥️" },
        { id: "zxc3", label: "ZxcStream Server 3", url: buildZxcTvUrl(tmdbId, 3, season, episode), badge: "ALT", badgeColor: "#8b5cf6", icon: "🖥️" },
      );
    }

    // 4. Custom embeds dari Firebase
    embeds.forEach((e, i) =>
      list.push({
        id: e.id, label: e.title || `Embed ${i + 1}`,
        url: e.url, badge: "EMBED", badgeColor: "#f59e0b", icon: "📡",
        sub: e.sub ? `Sub: ${e.sub}` : undefined,
      })
    );

    return list;
  }, [tmdbId, mediaType, season, episode, originalName]);

  // ── Load embeds & set default server ────────────────────────
  useEffect(() => {
    if (!tmdbId) return;
    fb.getEmbeds()
      .then((list: any[]) => {
        const matched = list.filter(e =>
          e.active && e.tmdbId === tmdbId &&
          (mediaType === "movie" ? e.type === "movie" : e.type === "series")
        );
        const allServers = buildServers(matched);
        setServers(allServers);
        // Default ke Peachify
        const first = allServers[0];
        if (first && !activeUrl) {
          setActiveServerId(first.id);
          setActiveUrl(first.url);
        } else if (first) {
          setActiveServerId(first.id);
        }
      })
      .catch(() => {
        const allServers = buildServers([]);
        setServers(allServers);
        if (allServers[0]) {
          setActiveServerId(allServers[0].id);
          setActiveUrl(allServers[0].url);
        }
      });
  }, [tmdbId, season, episode]);

  // ── Pilih server ────────────────────────────────────────────
  const selectServer = async (srv: ServerItem) => {
    setActiveServerId(srv.id);
    if (srv.id !== "scraper") {
      setActiveUrl(srv.url);
      return;
    }

    // Auto Scraper logic
    setScraping(true);
    setScrapeStatus("Mencari stream .m3u8...");
    try {
      const m3u8 = await scrapeM3u8(originalName, episode);
      if (m3u8) {
        setScrapeStatus("Link ditemukan!");
        setActiveUrl(m3u8);
      } else {
        // Fallback ke ZxcStream
        setScrapeStatus("Tidak ditemukan, beralih ke ZxcStream...");
        const fallback = servers.find(s => s.id === "zxc1");
        if (fallback) {
          setActiveServerId("zxc1");
          setActiveUrl(fallback.url);
        }
        Alert.alert(
          "Auto Scraper",
          `Tidak ada hasil untuk "${originalName}". Beralih ke ZxcStream secara otomatis.`,
          [{ text: "OK" }]
        );
      }
    } catch {
      const fallback = servers.find(s => s.id === "zxc1");
      if (fallback) { setActiveServerId("zxc1"); setActiveUrl(fallback.url); }
    } finally {
      setScraping(false);
      setTimeout(() => setScrapeStatus(""), 3000);
    }
  };

  // ── Episode navigation ───────────────────────────────────────
  const goEpisode = (ep: number) => {
    if (ep < 1) return;
    if (totalEp && ep > totalEp) return;
    setEpisode(ep);
    setLoading(true);
  };

  // Re-build URL when episode/season changes
  useEffect(() => {
    if (!tmdbId || servers.length === 0) return;
    const current = servers.find(s => s.id === activeServerId);
    if (!current || current.id === "scraper") return;

    if (mediaType !== "movie") {
      if (activeServerId.startsWith("zxc")) {
        const num = Number(activeServerId.replace("zxc", ""));
        setActiveUrl(buildZxcTvUrl(tmdbId, num, season, episode));
      } else if (activeServerId === "peachify") {
        setActiveUrl(buildPeachifyUrl(tmdbId, mediaType, season, episode));
      }
    }
  }, [season, episode]);

  const videoH = fullscreen ? screenSize.height : screenSize.width * (9 / 16);

  return (
    <View style={[S.root, fullscreen && { backgroundColor: "#000" }]}>
      <StatusBar hidden={fullscreen} barStyle="light-content" backgroundColor={BG} />

      {/* Video Player */}
      <View style={[S.playerBox, { height: videoH }]}>
        {scraping ? (
          <View style={S.scrapeOverlay}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={S.scrapeText}>{scrapeStatus}</Text>
          </View>
        ) : activeUrl ? (
          <WebView
            source={{ uri: activeUrl }}
            style={{ flex: 1, backgroundColor: "#000" }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            userAgent="Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          />
        ) : (
          <View style={S.noUrlBox}>
            <Text style={{ color: GRAY }}>Pilih server di bawah</Text>
          </View>
        )}
        {loading && !scraping && (
          <View style={S.loadingOverlay}>
            <ActivityIndicator color={RED} size="large" />
          </View>
        )}

        {/* Fullscreen toggle */}
        <TouchableOpacity
          style={[S.fsBtn, { top: fullscreen ? 20 : 8 }]}
          onPress={fullscreen ? exitFullscreen : enterFullscreen}
          activeOpacity={0.8}>
          <Text style={{ color: "#fff", fontSize: 16 }}>{fullscreen ? "⊠" : "⛶"}</Text>
        </TouchableOpacity>
      </View>

      {!fullscreen && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Judul */}
          <View style={S.titleRow}>
            <TouchableOpacity onPress={() => router.back()} style={S.backBtn} activeOpacity={0.8}>
              <Text style={S.backText}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={S.titleText} numberOfLines={2}>{title}</Text>
              {mediaType !== "movie" && (
                <Text style={S.epLabel}>S{season} · Episode {episode}</Text>
              )}
            </View>
          </View>

          {scrapeStatus ? (
            <View style={S.scrapeStatusBar}>
              <Text style={S.scrapeStatusText}>{scrapeStatus}</Text>
            </View>
          ) : null}

          {/* Episode navigation */}
          {mediaType !== "movie" && (
            <View style={S.epNav}>
              <TouchableOpacity
                style={[S.epNavBtn, episode <= 1 && S.epNavBtnDisabled]}
                onPress={() => goEpisode(episode - 1)}
                disabled={episode <= 1}
                activeOpacity={0.8}>
                <Text style={S.epNavText}>‹ Ep. Sebelumnya</Text>
              </TouchableOpacity>
              <View style={S.epCurrent}>
                <Text style={S.epCurrentText}>Ep. {episode}</Text>
              </View>
              <TouchableOpacity
                style={[S.epNavBtn, (totalEp !== null && episode >= totalEp) && S.epNavBtnDisabled]}
                onPress={() => goEpisode(episode + 1)}
                disabled={totalEp !== null && episode >= totalEp}
                activeOpacity={0.8}>
                <Text style={S.epNavText}>Ep. Selanjutnya ›</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Server List */}
          <Text style={S.serverLabel}>PILIH SERVER</Text>
          {servers.map((srv, i) => (
            <TouchableOpacity key={srv.id}
              style={[S.serverRow, activeServerId === srv.id && S.serverRowActive]}
              onPress={() => selectServer(srv)}
              activeOpacity={0.8}>
              <View style={[S.serverIconBox, activeServerId === srv.id && { backgroundColor: "#2a0000" }]}>
                <Text style={{ fontSize: 20 }}>{srv.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.serverName, activeServerId === srv.id && { color: "#fff" }]}>
                  {srv.label}
                </Text>
                {srv.sub ? <Text style={S.serverSub} numberOfLines={1}>{srv.sub}</Text> : null}
              </View>
              <View style={[S.badge, { backgroundColor: srv.badgeColor + "22", borderColor: srv.badgeColor }]}>
                <Text style={[S.badgeText, { color: srv.badgeColor }]}>{srv.badge}</Text>
              </View>
              {activeServerId === srv.id && (
                <View style={S.activeDot} />
              )}
            </TouchableOpacity>
          ))}

          {/* Tip */}
          <View style={S.tipBox}>
            <Text style={S.tipText}>
              💡 Jika video blank, coba server lain. Auto Scraper otomatis fallback ke ZxcStream jika gagal.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root:            { flex: 1, backgroundColor: BG },
  playerBox:       { backgroundColor: "#000", position: "relative" },
  loadingOverlay:  { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)" },
  scrapeOverlay:   { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", gap: 16 },
  scrapeText:      { color: GREEN, fontSize: 14, fontWeight: "600" },
  noUrlBox:        { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  fsBtn:           { position: "absolute", right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  titleRow:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center" },
  backText:        { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 28 },
  titleText:       { color: "#fff", fontSize: 16, fontWeight: "800" },
  epLabel:         { color: RED, fontSize: 12, fontWeight: "700", marginTop: 2 },
  scrapeStatusBar: { backgroundColor: "#0a3d1f", marginHorizontal: 16, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8 },
  scrapeStatusText: { color: GREEN, fontSize: 12, fontWeight: "600" },
  epNav:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 16, gap: 8 },
  epNavBtn:        { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#3a0000" },
  epNavBtnDisabled: { opacity: 0.35 },
  epNavText:       { color: "#fff", fontSize: 13, fontWeight: "700" },
  epCurrent:       { backgroundColor: RED, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  epCurrentText:   { color: "#fff", fontSize: 13, fontWeight: "800" },
  serverLabel:     { color: GRAY, fontSize: 11, fontWeight: "700", letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8 },
  serverRow:       { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD_BG, borderRadius: 12, padding: 14, gap: 12, borderWidth: 1.5, borderColor: "#2a0000" },
  serverRowActive: { borderColor: RED },
  serverIconBox:   { width: 44, height: 44, borderRadius: 12, backgroundColor: "#2a0000", alignItems: "center", justifyContent: "center" },
  serverName:      { color: GRAY, fontSize: 14, fontWeight: "700" },
  serverSub:       { color: "#555", fontSize: 11, marginTop: 2 },
  badge:           { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1.5 },
  badgeText:       { fontSize: 10, fontWeight: "800" },
  activeDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: RED },
  tipBox:          { margin: 16, backgroundColor: CARD_BG, borderRadius: 12, padding: 14 },
  tipText:         { color: GRAY, fontSize: 12, lineHeight: 18 },
});
