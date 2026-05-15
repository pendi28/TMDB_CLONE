import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TouchableWithoutFeedback, Share, Alert,
  ScrollView, Image, ActivityIndicator, Linking,
} from "react-native";
import * as Clipboard from "expo-clipboard";

const CARD_BG = "#1a2332";
const RED = "#E50914";
const GREEN = "#00c853";
const GRAY = "#8a9bb0";

const WEB_DOMAIN = process.env.EXPO_PUBLIC_WEB_DOMAIN || "apps-tmdb.web.app";
const TMDB_KEY   = process.env.EXPO_PUBLIC_TMDB_KEY   || "";

async function fetchTrailerKey(tmdbId: number, mediaType: "movie" | "tv"): Promise<string | null> {
  try {
    const url = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/videos?api_key=${TMDB_KEY}&language=en-US`;
    const res  = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const vids: any[] = data.results ?? [];
    const trailer =
      vids.find((v: any) => v.type === "Trailer" && v.site === "YouTube") ??
      vids.find((v: any) => v.site === "YouTube") ??
      vids[0];
    return trailer?.key ?? null;
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
  episode?: number;
}

export default function ShareSheet({
  visible, onClose, title, year, overview, posterUrl,
  tmdbId, mediaType, episode = 1,
}: Props) {
  const [trailerLoading, setTrailerLoading] = useState(false);

  const webUrl = `https://${WEB_DOMAIN}/${mediaType}/${tmdbId}`;

  const copyLink = async () => {
    await Clipboard.setStringAsync(webUrl);
    Alert.alert("✅ Disalin!", "Link berhasil disalin ke clipboard.");
    onClose();
  };

  const shareLink = async () => {
    const text =
      `🎬 ${title}${year ? ` (${year})` : ""}` +
      `${overview ? `\n\n${overview.slice(0, 120)}...` : ""}` +
      `\n\nTonton di XpoGo: ${webUrl}`;
    await Share.share({ message: text, title }).catch(() => {});
    onClose();
  };

  const shareTrailer = async () => {
    setTrailerLoading(true);
    try {
      const key = await fetchTrailerKey(tmdbId, mediaType);
      if (!key) {
        Alert.alert(
          "Trailer Tidak Ditemukan",
          "Tidak ada trailer YouTube untuk judul ini di TMDB.",
        );
        return;
      }
      const ytUrl = `https://www.youtube.com/watch?v=${key}`;
      const text  = `🎬 Trailer — ${title}${year ? ` (${year})` : ""}\n\n${ytUrl}\n\nTonton filmnya di XpoGo: ${webUrl}`;
      await Share.share({ message: text, title: `Trailer ${title}` }).catch(() => {});
      onClose();
    } catch {
      Alert.alert("Gagal", "Terjadi kesalahan saat mengambil data trailer.");
    } finally {
      setTrailerLoading(false);
    }
  };

  const openTrailer = async () => {
    setTrailerLoading(true);
    try {
      const key = await fetchTrailerKey(tmdbId, mediaType);
      if (!key) {
        Alert.alert("Trailer Tidak Ditemukan", "Tidak ada trailer YouTube untuk judul ini.");
        return;
      }
      const ytUrl = `https://www.youtube.com/watch?v=${key}`;
      await Linking.openURL(ytUrl);
      onClose();
    } catch {
      Alert.alert("Gagal", "Tidak dapat membuka YouTube.");
    } finally {
      setTrailerLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={trailerLoading ? undefined : onClose}>
      <TouchableWithoutFeedback onPress={trailerLoading ? undefined : onClose}>
        <View style={S.overlay}>
          <TouchableWithoutFeedback>
            <View style={S.sheet}>
              <View style={S.handle} />

              {/* Header */}
              <View style={S.header}>
                {posterUrl ? <Image source={{ uri: posterUrl }} style={S.poster} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={S.movieTitle} numberOfLines={2}>{title}</Text>
                  {year ? <Text style={S.year}>{year}</Text> : null}
                </View>
              </View>

              {/* ── Tombol Trailer YouTube ── */}
              <TouchableOpacity
                style={[S.btnTrailer, trailerLoading && { opacity: 0.6 }]}
                onPress={shareTrailer}
                disabled={trailerLoading}
                activeOpacity={0.85}
              >
                {trailerLoading
                  ? <ActivityIndicator color="#fff" style={{ marginRight: 6 }} />
                  : <Text style={S.btnIcon}>▶️</Text>
                }
                <View style={{ flex: 1 }}>
                  <Text style={S.btnTrailerTitle}>
                    {trailerLoading ? "Mengambil trailer..." : "Share Trailer YouTube"}
                  </Text>
                  <Text style={S.btnTrailerSub}>Bagikan link trailer resmi dari YouTube</Text>
                </View>
                {!trailerLoading && <Text style={S.btnArrow}>›</Text>}
              </TouchableOpacity>

              {/* ── Buka Trailer ── */}
              <TouchableOpacity
                style={[S.btnOpen, trailerLoading && { opacity: 0.5 }]}
                onPress={openTrailer}
                disabled={trailerLoading}
                activeOpacity={0.85}
              >
                <Text style={S.btnIcon}>🎞️</Text>
                <Text style={S.btnOpenText}>Tonton Trailer di YouTube</Text>
              </TouchableOpacity>

              {/* ── Share & Salin link ── */}
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

              {/* ── URL bar ── */}
              <TouchableOpacity style={S.urlRow} onPress={copyLink} activeOpacity={0.75}>
                <Text style={S.urlIcon}>🌐</Text>
                <Text style={S.urlText} numberOfLines={1}>{webUrl}</Text>
                <Text style={S.urlCopy}>Salin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[S.cancelBtn, trailerLoading && { opacity: 0.5 }]}
                onPress={trailerLoading ? undefined : onClose}
                activeOpacity={0.8}
              >
                <Text style={S.cancelText}>{trailerLoading ? "Memuat..." : "Batal"}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay:         { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheet:           { backgroundColor: "#111d2e", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 36, borderTopWidth: 1, borderColor: "#2a3a4a" },
  handle:          { width: 40, height: 4, backgroundColor: "#2a3a4a", borderRadius: 2, alignSelf: "center", marginBottom: 16 },

  header:          { flexDirection: "row", gap: 12, marginBottom: 18, alignItems: "center" },
  poster:          { width: 56, height: 84, borderRadius: 8, backgroundColor: CARD_BG },
  movieTitle:      { color: "#fff", fontSize: 16, fontWeight: "800", lineHeight: 22 },
  year:            { color: GRAY, fontSize: 13, marginTop: 4 },

  btnTrailer:      { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: RED, borderRadius: 14, padding: 14, marginBottom: 10 },
  btnIcon:         { fontSize: 24 },
  btnTrailerTitle: { color: "#fff", fontSize: 14, fontWeight: "900" },
  btnTrailerSub:   { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2 },
  btnArrow:        { color: "rgba(255,255,255,0.7)", fontSize: 22, fontWeight: "700" },

  btnOpen:         { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1e2d3d", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 18, borderWidth: 1, borderColor: "#2a3a4a" },
  btnOpenText:     { color: "#c8d6e5", fontSize: 13, fontWeight: "700" },

  options:         { paddingVertical: 4, gap: 16, paddingBottom: 4, marginBottom: 14 },
  optBtn:          { alignItems: "center", gap: 5, minWidth: 72 },
  optIcon:         { width: 54, height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  optLabel:        { color: "#c8d6e5", fontSize: 11, fontWeight: "700", textAlign: "center" },
  optSub:          { fontSize: 10, fontWeight: "600", textAlign: "center" },

  urlRow:          { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: CARD_BG, borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: "#2a3a4a" },
  urlIcon:         { fontSize: 14 },
  urlText:         { flex: 1, color: GRAY, fontSize: 11, fontFamily: "monospace" },
  urlCopy:         { color: "#3b82f6", fontSize: 12, fontWeight: "700" },

  cancelBtn:       { backgroundColor: CARD_BG, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  cancelText:      { color: "#fff", fontWeight: "700", fontSize: 15 },
});
