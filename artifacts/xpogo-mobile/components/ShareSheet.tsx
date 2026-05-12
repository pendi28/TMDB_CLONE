import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TouchableWithoutFeedback, Share, Alert,
  ScrollView, Image, ActivityIndicator,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const CARD_BG = "#1a2332";
const RED = "#E50914";
const GREEN = "#00c853";
const GRAY = "#8a9bb0";

const WEB_DOMAIN = process.env.EXPO_PUBLIC_WEB_DOMAIN || "apps-tmdb.web.app";
const API_DOMAIN = process.env.EXPO_PUBLIC_API_URL || `https://${WEB_DOMAIN}`;

const CONSUMET_BASE = "https://api-consumet-org-three.vercel.app/anime/gogoanime";

async function findM3u8Stream(originalName: string, episode = 1): Promise<string | null> {
  try {
    const searchRes = await fetch(`${CONSUMET_BASE}/${encodeURIComponent(originalName)}`);
    if (!searchRes.ok) return null;
    const { results = [] } = await searchRes.json();
    if (!results.length) return null;
    const animeId: string = results[0]?.id;
    if (!animeId) return null;
    const epRes = await fetch(`${CONSUMET_BASE}/watch/${animeId}-episode-${episode}`);
    if (!epRes.ok) return null;
    const { sources = [] } = await epRes.json();
    const src = sources.find((s: any) => s.quality === "default" || s.isM3U8) ?? sources[0];
    return (src?.url as string) ?? null;
  } catch {
    return null;
  }
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  year?: string;
  overview?: string;
  posterUrl?: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  originalName?: string;
  streamUrl?: string;
  episode?: number;
}

export default function ShareSheet({
  visible, onClose, title, year, overview, posterUrl,
  tmdbId, mediaType, originalName, streamUrl, episode = 1,
}: Props) {
  const [clipLoading, setClipLoading] = useState(false);
  const [clipStatus, setClipStatus] = useState("");

  const webUrl = `https://${WEB_DOMAIN}/${mediaType}/${tmdbId}`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(webUrl);
    Alert.alert("✅ Disalin!", "Link berhasil disalin ke clipboard.");
    onClose();
  };

  const shareLink = async () => {
    const text = `🎬 ${title}${year ? ` (${year})` : ""}${overview ? `\n\n${overview.slice(0, 120)}...` : ""}\n\nTonton di XpoGo: ${webUrl}`;
    await Share.share({ message: text, title }).catch(() => {});
    onClose();
  };

  const shareClip = async () => {
    setClipLoading(true);
    setClipStatus("Mencari stream...");
    try {
      let m3u8: string | null = streamUrl?.includes(".m3u8") ? streamUrl : null;

      if (!m3u8) {
        const searchName = originalName || title;
        setClipStatus(`Mencari: ${searchName}...`);
        m3u8 = await findM3u8Stream(searchName, episode);
      }

      if (!m3u8) {
        Alert.alert(
          "Stream Tidak Ditemukan",
          "Fitur Share Klip MP4 memerlukan sumber stream langsung (M3U8).\n\n" +
          "Cara: Buka video di Player → pilih server Auto Scraper → lalu tap Share dari player.",
        );
        return;
      }

      setClipStatus("Memproses klip 60 detik...");

      const safeName = title.replace(/[^\w\s]/g, "").trim().replace(/\s+/g, "_").slice(0, 30);
      const filename = `${safeName}_1menit.mp4`;
      const localPath = `${FileSystem.cacheDirectory ?? ""}${filename}`;

      const clipEndpoint =
        `${API_DOMAIN}/api/share/clip/generate` +
        `?url=${encodeURIComponent(m3u8)}` +
        `&title=${encodeURIComponent(title)}`;

      setClipStatus("Mengunduh klip MP4...");
      const { uri, status: dlStatus } = await FileSystem.downloadAsync(clipEndpoint, localPath);

      if (dlStatus !== 200) {
        Alert.alert("Gagal", "Server gagal memproses klip. Pastikan koneksi stabil dan coba lagi.");
        return;
      }

      setClipStatus("Membuka share...");

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Tidak Tersedia", "Sharing file tidak didukung di perangkat ini.");
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "video/mp4",
        dialogTitle: `${title} — Klip 1 Menit`,
        UTI: "public.mpeg-4",
      });

      await Share.share({
        message: `🎬 ${title}${year ? ` (${year})` : ""}\n\nTonton lengkap di XpoGo:\n${webUrl}`,
        title,
      }).catch(() => {});
    } catch {
      Alert.alert("Gagal", "Terjadi kesalahan saat membuat klip. Pastikan koneksi internet stabil.");
    } finally {
      setClipLoading(false);
      setClipStatus("");
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={clipLoading ? undefined : onClose}>
      <TouchableWithoutFeedback onPress={clipLoading ? undefined : onClose}>
        <View style={S.overlay}>
          <TouchableWithoutFeedback>
            <View style={S.sheet}>
              <View style={S.handle} />

              <View style={S.header}>
                {posterUrl ? (
                  <Image source={{ uri: posterUrl }} style={S.poster} />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={S.movieTitle} numberOfLines={2}>{title}</Text>
                  {year ? <Text style={S.year}>{year}</Text> : null}
                </View>
              </View>

              {clipLoading ? (
                <View style={S.loadingBox}>
                  <ActivityIndicator color={RED} size="large" />
                  <Text style={S.loadingText}>{clipStatus}</Text>
                  <Text style={S.loadingNote}>Proses bisa memakan 30–90 detik tergantung koneksi</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity style={S.btnClip} onPress={shareClip} activeOpacity={0.85}>
                    <Text style={S.btnClipIcon}>🎬</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={S.btnClipTitle}>Share Klip 1 Menit (MP4)</Text>
                      <Text style={S.btnClipSub}>Download klip video langsung dari app · beserta link tonton</Text>
                    </View>
                    <Text style={S.btnClipArrow}>›</Text>
                  </TouchableOpacity>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={S.options}
                  >
                    <TouchableOpacity style={S.optBtn} onPress={shareLink} activeOpacity={0.8}>
                      <View style={[S.optIcon, { backgroundColor: GREEN + "22", borderColor: GREEN }]}>
                        <Text style={{ fontSize: 22 }}>📤</Text>
                      </View>
                      <Text style={S.optLabel}>Bagikan</Text>
                      <Text style={[S.optSub, { color: GREEN }]}>Link Web</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={S.optBtn} onPress={copyLink} activeOpacity={0.8}>
                      <View style={[S.optIcon, { backgroundColor: "#3b82f622", borderColor: "#3b82f6" }]}>
                        <Text style={{ fontSize: 22 }}>🔗</Text>
                      </View>
                      <Text style={S.optLabel}>Salin</Text>
                      <Text style={[S.optSub, { color: "#3b82f6" }]}>Link Web</Text>
                    </TouchableOpacity>
                  </ScrollView>

                  <TouchableOpacity style={S.urlRow} onPress={copyLink} activeOpacity={0.75}>
                    <Text style={S.urlIcon}>🌐</Text>
                    <Text style={S.urlText} numberOfLines={1}>{webUrl}</Text>
                    <Text style={S.urlCopy}>Salin</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={[S.cancelBtn, clipLoading && { opacity: 0.5 }]}
                onPress={clipLoading ? undefined : onClose}
                activeOpacity={0.8}
              >
                <Text style={S.cancelText}>{clipLoading ? "Memproses..." : "Batal"}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet:         { backgroundColor: "#111d2e", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 36, borderTopWidth: 1, borderColor: "#2a3a4a" },
  handle:        { width: 40, height: 4, backgroundColor: "#2a3a4a", borderRadius: 2, alignSelf: "center", marginBottom: 16 },

  header:        { flexDirection: "row", gap: 12, marginBottom: 18, alignItems: "center" },
  poster:        { width: 56, height: 84, borderRadius: 8, backgroundColor: CARD_BG },
  movieTitle:    { color: "#fff", fontSize: 16, fontWeight: "800", lineHeight: 22 },
  year:          { color: GRAY, fontSize: 13, marginTop: 4 },

  loadingBox:    { alignItems: "center", paddingVertical: 28, gap: 14 },
  loadingText:   { color: "#fff", fontSize: 14, fontWeight: "700", textAlign: "center" },
  loadingNote:   { color: GRAY, fontSize: 12, textAlign: "center" },

  btnClip:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: RED, borderRadius: 14, padding: 14, marginBottom: 18 },
  btnClipIcon:   { fontSize: 26 },
  btnClipTitle:  { color: "#fff", fontSize: 14, fontWeight: "900" },
  btnClipSub:    { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2 },
  btnClipArrow:  { color: "rgba(255,255,255,0.7)", fontSize: 22, fontWeight: "700" },

  options:       { paddingVertical: 4, gap: 16, paddingBottom: 4, marginBottom: 14 },
  optBtn:        { alignItems: "center", gap: 5, minWidth: 72 },
  optIcon:       { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  optLabel:      { color: "#c8d6e5", fontSize: 11, fontWeight: "700", textAlign: "center" },
  optSub:        { fontSize: 10, fontWeight: "600", textAlign: "center" },

  urlRow:        { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: CARD_BG, borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: "#2a3a4a" },
  urlIcon:       { fontSize: 14 },
  urlText:       { flex: 1, color: GRAY, fontSize: 11, fontFamily: "monospace" },
  urlCopy:       { color: "#3b82f6", fontSize: 12, fontWeight: "700" },

  cancelBtn:     { backgroundColor: CARD_BG, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  cancelText:    { color: "#fff", fontWeight: "700", fontSize: 15 },
});
