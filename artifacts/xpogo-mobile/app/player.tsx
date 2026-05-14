import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  View, StyleSheet, TouchableOpacity, Text,
  StatusBar, ActivityIndicator, Dimensions, ScrollView,
  BackHandler, Platform, Alert, Linking, Modal, TextInput,
} from "react-native";
import WebView from "react-native-webview";
import * as ScreenOrientation from "expo-screen-orientation";
import * as NavigationBar from "expo-navigation-bar";
import { fb } from "@/lib/firebase";
import SearchSubtitles from '../../components/SearchSubtitles';
import ShareSheet from "@/components/ShareSheet";

const BG = "#0d0000";
const CARD_BG = "#1a0000";
const RED = "#E50914";
const GRAY = "#8a9bb0";
const GREEN = "#00c853";

const LOADING_TIMEOUT_MS = 12000;
const OPENSUB_API = "https://opensubtitles.bymirrorx.eu.org/";

interface EmbedRecord {
  id: string; title: string; url: string;
  type: string; active: boolean; tmdbId?: number; sub?: string;
}
interface CustomServer {
  id: string; name: string; url: string; active: boolean;
}
interface ServerItem {
  id: string; label: string; url: string;
  badge: string; badgeColor: string; icon: string; sub?: string;
}
interface SubCue {
  start: number; end: number; text: string;
}
interface SubResult {
  SubFileName: string; SubDownloadLink: string;
  LanguageName: string; SubFormat: string;
}

function buildZxcMovieUrl(id: number, n: number) {
  return `https://zxcstream.xyz/player/movie/${id}?server=${n}&color=E50914&autoplay=true&back=true`;
}
function buildZxcTvUrl(id: number, n: number, s: number, e: number) {
  return `https://zxcstream.xyz/player/tv/${id}?server=${n}&color=E50914&autoplay=true&back=true&season=${s}&episode=${e}`;
}
function buildPeachifyUrl(id: number, mt: string, s: number, e: number) {
  return mt === "movie"
    ? `https://peachify.top/embed/movie/${id}?accent=E50914&autoplay=1`
    : `https://peachify.top/embed/tv/${id}/${s}/${e}?accent=E50914&autoNext=1&autoplay=1`;
}
function buildVidPlusMovieUrl(id: number) {
  return `https://player2.vidplus.pro/embed/movie/${id}?primarycolor=E50914&secondarycolor=170000&iconcolor=FFFFFF&autoplay=true&autonext=true&icons=netflix`;
}
function buildVidPlusTvUrl(id: number, s: number, e: number) {
  return `https://player2.vidplus.pro/embed/tv/${id}/${s}/${e}?primarycolor=E50914&secondarycolor=170000&iconcolor=FFFFFF&autoplay=true&autonext=true&icons=netflix`;
}
function build2EmbedMovieUrl(id: number) { return `https://www.2embed.cc/embed/${id}`; }
function build2EmbedTvUrl(id: number, s: number, e: number) { return `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`; }
function buildVidLinkMovieUrl(id: number) {
  return `https://vidlink.pro/movie/${id}?primaryColor=E50914&secondaryColor=170000&iconColor=FFFFFF&autoplay=true&nextbutton=true`;
}
function buildVidLinkTvUrl(id: number, s: number, e: number) {
  return `https://vidlink.pro/tv/${id}/${s}/${e}?primaryColor=E50914&secondaryColor=170000&iconColor=FFFFFF&autoplay=true&nextbutton=true`;
}
function buildNontongoMovieUrl(id: number) { return `https://www.nontongo.win/embed/movie/${id}`; }
function buildNontongoTvUrl(id: number, s: number, e: number) { return `https://nontongo.win/embed/tv/${id}/${s}/${e}`; }
function buildVidZeeMovieUrl(id: number) { return `https://player.vidzee.wtf/embed/movie/${id}`; }
function buildVidZeeTvUrl(id: number, s: number, e: number) { return `https://player.vidzee.wtf/embed/tv/${id}/${s}/${e}`; }
function buildVixSrcMovieUrl(id: number) { return `https://vixsrc.to/movie/${id}`; }
function buildVixSrcTvUrl(id: number, s: number, e: number) { return `https://vixsrc.to/tv/${id}/${s}/${e}`; }
function resolveCustomUrl(t: string, id: number, s: number, e: number, mt: string) {
  return t.replace(/\{id\}/g, String(id)).replace(/\{s\}/g, String(s))
    .replace(/\{e\}/g, String(e)).replace(/\{type\}/g, mt);
}

async function setImmersive(on: boolean) {
  if (Platform.OS !== "android") return;
  try {
    await NavigationBar.setVisibilityAsync(on ? "hidden" : "visible");
    if (on) await NavigationBar.setBehaviorAsync("overlay-swipe");
  } catch {}
}

// ── Redirect ad navigations to browser ─────────────────────────────
function openInBrowser(url: string) {
  if (!url || url.startsWith("data:") || url.startsWith("about:") || url.startsWith("blob:")) return;
  Linking.canOpenURL(url).then(can => { if (can) Linking.openURL(url); }).catch(() => {});
}

function isSameDomain(url1: string, url2: string): boolean {
  try {
    const h1 = new URL(url1).hostname.replace(/^www\./, "");
    const h2 = new URL(url2).hostname.replace(/^www\./, "");
    return h1 === h2 || h1.endsWith("." + h2) || h2.endsWith("." + h1);
  } catch {
    return false;
  }
}

// ── GoGoAnime Scraper ───────────────────────────────────────────────
async function scrapeM3u8(name: string, ep: number): Promise<string | null> {
  const instances = [
    "https://api-consumet-org-three.vercel.app",
    "https://consumet-api.onrender.com",
    "https://api.consumet.org",
  ];
  for (const base of instances) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const searchRes = await fetch(`${base}/anime/gogoanime/${encodeURIComponent(name)}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!searchRes.ok) continue;
      const { results = [] } = await searchRes.json();
      if (!results.length) continue;
      const animeId = results[0]?.id;
      if (!animeId) continue;
      const ctrl2 = new AbortController();
      const timer2 = setTimeout(() => ctrl2.abort(), 8000);
      const epRes = await fetch(`${base}/anime/gogoanime/watch/${animeId}-episode-${ep}`, { signal: ctrl2.signal });
      clearTimeout(timer2);
      if (!epRes.ok) continue;
      const { sources = [] } = await epRes.json();
      const src = sources.find((s: any) => s.quality === "default" || s.isM3U8) ?? sources[0];
      if (src?.url) return src.url as string;
    } catch { continue; }
  }
  return null;
}

// ── Subtitle parser (SRT + VTT) ─────────────────────────────────────
function timeToSeconds(t: string): number {
  const parts = t.replace(",", ".").split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

function parseSrt(text: string): SubCue[] {
  const cues: SubCue[] = [];
  const blocks = text.trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const timeLine = lines.find(l => l.includes("-->"));
    if (!timeLine) continue;
    const [startStr, endStr] = timeLine.split("-->").map(s => s.trim());
    const textLines = lines.filter(l => l !== timeLine && !/^\d+$/.test(l.trim()));
    cues.push({
      start: timeToSeconds(startStr),
      end: timeToSeconds(endStr),
      text: textLines.join("\n").replace(/<[^>]+>/g, ""),
    });
  }
  return cues;
}

function parseVtt(text: string): SubCue[] {
  const cues: SubCue[] = [];
  const blocks = text.replace(/^WEBVTT.*\n/, "").trim().split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const timeLine = lines.find(l => l.includes("-->"));
    if (!timeLine) continue;
    const [startStr, endStr] = timeLine.split("-->").map(s => s.trim().split(" ")[0]);
    const textLines = lines.filter(l => l !== timeLine && !l.startsWith("NOTE") && !/^\w+:/.test(l));
    cues.push({
      start: timeToSeconds(startStr),
      end: timeToSeconds(endStr),
      text: textLines.join("\n").replace(/<[^>]+>/g, ""),
    });
  }
  return cues;
}

// ── WebView M3U8 interceptor ────────────────────────────────────────
// Known ad network domains to block at JS level
const AD_DOMAINS = [
  "doubleclick.net","googlesyndication.com","googleadservices.com","adnxs.com",
  "propellerads.com","adskeeper.com","popcash.net","popads.net","trafficjunky.net",
  "exoclick.com","juicyads.com","adsterra.com","hilltopads.com","richpush.co",
  "bidvertiser.com","revcontent.com","outbrain.com","taboola.com","media.net",
  "mgid.com","adtelligent.com","adspyglass.com","hlsvideo.live","hlsplay.site",
  "playerads.net","streamads.xyz","vidads.net","embedads.pro","adplayer.pro",
];

function isAdDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return AD_DOMAINS.some(d => host === d || host.endsWith("." + d));
  } catch { return false; }
}

// Comprehensive ZxcStream + generic ad blocker injection
const INJECT_JS = `
(function() {
  /* ── 1. M3U8 interceptor ─────────────────────────── */
  var sent = {};
  function reportM3u8(url) {
    if (!url || sent[url]) return;
    if (url.includes('.m3u8') || (url.includes('playlist') && url.includes('http'))) {
      sent[url] = true;
      try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'m3u8',url:url})); } catch(e){}
    }
  }

  /* ── 2. Block ad network fetch/XHR ──────────────── */
  var AD_HOSTS = ${JSON.stringify(AD_DOMAINS)};
  function isAd(url) {
    if (!url) return false;
    try {
      var h = new URL(url).hostname.replace(/^www\\./, '');
      return AD_HOSTS.some(function(d){ return h === d || h.endsWith('.'+d); });
    } catch(e){ return false; }
  }

  var _fetch = window.fetch;
  window.fetch = function(input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (isAd(url)) return Promise.resolve(new Response('', {status:200}));
    try { reportM3u8(url); } catch(e){}
    return _fetch.apply(this, arguments);
  };

  var _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    if (isAd(url)) {
      this._blocked = true;
      return;
    }
    try { reportM3u8(url); } catch(e){}
    return _xhrOpen.apply(this, arguments);
  };
  var _xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function() {
    if (this._blocked) return;
    return _xhrSend.apply(this, arguments);
  };

  /* ── 3. Block window.open popups ─────────────────── */
  window.open = function(url) {
    if (url) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify({type:'popup',url:url})); } catch(e){}
    }
    return null;
  };

  /* ── 4. Auto-dismiss/skip/remove ad overlays ─────── */
  var SKIP_SELECTORS = [
    '.skip-button','.skip-ad','.skipAd','.skip_button','.skipButton',
    '.close-ad','.closeAd','.close_ad','.ad-close','.adClose',
    '[class*="skip"]','[class*="Skip"]','[id*="skip"]','[id*="Skip"]',
    '[class*="close-ad"]','[class*="closeAd"]','[id*="close-ad"]',
    '.overlay-close','.overlayClose','.btn-close','[aria-label="Close"]',
    '[aria-label="close"]','[aria-label="Skip"]','[aria-label="skip"]',
    '.vjs-skip-button','.ima-skip-button','.ytp-ad-skip-button',
  ];
  var AD_ELEM_SELECTORS = [
    '.ad-container','.ads-container','.ad-overlay','.adOverlay',
    '#ad-overlay','#adOverlay','#ads-overlay','.advertisement',
    '[id^="google_ads"]','[id^="div-gpt-ad"]','[id*="adsense"]',
    'iframe[src*="doubleclick"]','iframe[src*="googlesyndication"]',
    'iframe[src*="propellerads"]','iframe[src*="exoclick"]',
    '.jw-ad','#jw-ad','[class*="jw-plugin-googima"]',
    '.vast-ad','.preroll','.preroll-ad','.ima-container',
    '.VideoAd','[class*="VideoAd"]','[id*="VideoAd"]',
    '.player-ad-container','[class*="playerAd"]','[class*="player-ad"]',
    '.vjs-ima-ad-container','[class*="ImaAd"]','[class*="ima-ad"]',
    'div[style*="z-index: 9999"]','div[style*="z-index:9999"]',
    'div[style*="z-index: 99999"]','div[style*="z-index:99999"]',
  ];

  function nukeAds() {
    /* Click skip/close buttons */
    for (var i = 0; i < SKIP_SELECTORS.length; i++) {
      try {
        var btns = document.querySelectorAll(SKIP_SELECTORS[i]);
        btns.forEach(function(b){ b.click(); });
      } catch(e){}
    }

    /* Remove ad containers */
    for (var j = 0; j < AD_ELEM_SELECTORS.length; j++) {
      try {
        var els = document.querySelectorAll(AD_ELEM_SELECTORS[j]);
        els.forEach(function(el){
          if (el && el.parentNode) el.parentNode.removeChild(el);
        });
      } catch(e){}
    }

    /* Skip video ads: if a <video> has short duration it might be an ad */
    try {
      var videos = document.querySelectorAll('video');
      videos.forEach(function(v) {
        if (!isNaN(v.duration) && v.duration > 0 && v.duration < 90) {
          /* Jump to end so "ad ended" triggers */
          try { v.currentTime = v.duration - 0.1; } catch(e){}
        }
      });
    } catch(e){}

    /* Remove ad iframes from ad domains */
    try {
      var iframes = document.querySelectorAll('iframe');
      iframes.forEach(function(f) {
        var src = f.src || '';
        if (isAd(src) && f.parentNode) f.parentNode.removeChild(f);
      });
    } catch(e){}
  }

  /* Run immediately + every 500ms */
  nukeAds();
  setInterval(nukeAds, 500);

  /* Also run after DOM mutations (for lazy-loaded ads) */
  try {
    new MutationObserver(function(){ nukeAds(); })
      .observe(document.documentElement, { childList: true, subtree: true });
  } catch(e){}

  true;
})();
`;

export default function PlayerScreen() {
  const params = useLocalSearchParams<{
    url: string; title?: string; tmdbId?: string;
    mediaType?: string; season?: string; episode?: string;
    originalName?: string; totalEpisodes?: string;
  }>();
  const router = useRouter();

  const tmdbId       = params.tmdbId ? Number(params.tmdbId) : null;
  const mediaType    = params.mediaType ?? "movie";
  const title        = params.title ? decodeURIComponent(params.title) : "";
  const originalName = params.originalName ? decodeURIComponent(params.originalName) : title;
  const totalEp      = params.totalEpisodes ? Number(params.totalEpisodes) : null;

  const [season, setSeason]     = useState(params.season ? Number(params.season) : 1);
  const [episode, setEpisode]   = useState(params.episode ? Number(params.episode) : 1);
  const [activeUrl, setActiveUrl]           = useState(params.url ? decodeURIComponent(params.url) : "");
  const [loading, setLoading]               = useState(true);
  const [fullscreen, setFullscreen]         = useState(false);
  const [screenSize, setScreenSize]         = useState(Dimensions.get("window"));
  const [servers, setServers]               = useState<ServerItem[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>("");
  const [scraping, setScraping]             = useState(false);
  const [scrapeStatus, setScrapeStatus]     = useState<string>("");
  const [webviewKey, setWebviewKey]         = useState(0);
  const [shareVisible, setShareVisible]     = useState(false);
  const [capturedM3u8, setCapturedM3u8]     = useState<string | undefined>(undefined);
  const [builtinStates, setBuiltinStates]   = useState<Record<string, boolean>>({});
  const [customServers, setCustomServers]   = useState<CustomServer[]>([]);

  // ── Subtitle overlay state ──────────────────────────────────────
  const [showSubPanel, setShowSubPanel]       = useState(false);
  const [subSearchQuery, setSubSearchQuery]   = useState("");
  const [subSearching, setSubSearching]       = useState(false);
  const [subResults, setSubResults]           = useState<SubResult[]>([]);
  const [subCues, setSubCues]                 = useState<SubCue[]>([]);
  const [subActive, setSubActive]             = useState(false);
  const [subOffset, setSubOffset]             = useState(0);
  const [subTimer, setSubTimer]               = useState(0);
  const [subRunning, setSubRunning]           = useState(false);
  const subIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeUrlRef = useRef(activeUrl);
  activeUrlRef.current = activeUrl;

  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearLoadingTimer = () => {
    if (loadingTimerRef.current) { clearTimeout(loadingTimerRef.current); loadingTimerRef.current = null; }
  };
  const startLoadingWithTimeout = () => {
    clearLoadingTimer();
    setLoading(true);
    loadingTimerRef.current = setTimeout(() => setLoading(false), LOADING_TIMEOUT_MS);
  };
  useEffect(() => () => clearLoadingTimer(), []);

  // ── Subtitle timer ──────────────────────────────────────────────
  useEffect(() => {
    if (subRunning) {
      subIntervalRef.current = setInterval(() => setSubTimer(t => t + 1), 1000);
    } else {
      if (subIntervalRef.current) { clearInterval(subIntervalRef.current); subIntervalRef.current = null; }
    }
    return () => { if (subIntervalRef.current) clearInterval(subIntervalRef.current); };
  }, [subRunning]);

  const currentSubText = (() => {
    if (!subActive || !subCues.length) return "";
    const t = subTimer + subOffset;
    const cue = subCues.find(c => t >= c.start && t <= c.end);
    return cue?.text ?? "";
  })();

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
    return () => { setImmersive(false); ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP); };
  }, []);

  useEffect(() => {
    Promise.all([
      fb.getBuiltinServerStates().then(d => setBuiltinStates(d ?? {})).catch(() => {}),
      fb.getCustomServers().then(list => setCustomServers((list as CustomServer[]).filter(s => s.active))).catch(() => {}),
    ]);
  }, []);

  const buildServers = useCallback((
    embeds: EmbedRecord[], states: Record<string, boolean>, customs: CustomServer[],
  ): ServerItem[] => {
    const list: ServerItem[] = [];
    if (!tmdbId) return list;
    const active = (id: string) => states[id] === undefined ? true : states[id];

    if (active("vidplus")) list.push({ id: "vidplus", label: "VidPlus Pro",
      url: mediaType === "movie" ? buildVidPlusMovieUrl(tmdbId) : buildVidPlusTvUrl(tmdbId, season, episode),
      badge: "PRO", badgeColor: "#6C63FF", icon: "🎬" });
    if (active("vidzee")) list.push({ id: "vidzee", label: "VidZee",
      url: mediaType === "movie" ? buildVidZeeMovieUrl(tmdbId) : buildVidZeeTvUrl(tmdbId, season, episode),
      badge: "HD", badgeColor: "#FF6B35", icon: "🎭" });
    if (active("vixsrc")) list.push({ id: "vixsrc", label: "VixSrc",
      url: mediaType === "movie" ? buildVixSrcMovieUrl(tmdbId) : buildVixSrcTvUrl(tmdbId, season, episode),
      badge: "ALT", badgeColor: "#059669", icon: "🦊" });
    if (active("peachify")) list.push({ id: "peachify", label: "Peachify VIP",
      url: buildPeachifyUrl(tmdbId, mediaType, season, episode),
      badge: "VIP", badgeColor: "#ff4757", icon: "🍑" });
    if (active("2embed")) list.push({ id: "2embed", label: "2Embed",
      url: mediaType === "movie" ? build2EmbedMovieUrl(tmdbId) : build2EmbedTvUrl(tmdbId, season, episode),
      badge: "HD", badgeColor: "#0ea5e9", icon: "📺" });
    if (active("vidlink")) list.push({ id: "vidlink", label: "VidLink",
      url: mediaType === "movie" ? buildVidLinkMovieUrl(tmdbId) : buildVidLinkTvUrl(tmdbId, season, episode),
      badge: "NEW", badgeColor: "#f59e0b", icon: "🔗" });
    if (active("nontongo")) list.push({ id: "nontongo", label: "Nontongo",
      url: mediaType === "movie" ? buildNontongoMovieUrl(tmdbId) : buildNontongoTvUrl(tmdbId, season, episode),
      badge: "ALT", badgeColor: "#10b981", icon: "🎥" });

    list.push({ id: "scraper", label: "🚀 Auto Scraper (Clean)",
      url: "__scraper__", badge: "M3U8", badgeColor: GREEN, icon: "🚀",
      sub: `Cari: ${title || originalName} ep.${episode}` });

    if (active("vidking")) {
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
    }

    customs.forEach(cs => list.push({
      id: `custom_${cs.id}`, label: cs.name,
      url: resolveCustomUrl(cs.url, tmdbId, season, episode, mediaType),
      badge: "CUSTOM", badgeColor: "#f59e0b", icon: "⚙️",
    }));
    embeds.forEach((e, i) => list.push({
      id: e.id, label: e.title || `Embed ${i + 1}`,
      url: e.url, badge: "EMBED", badgeColor: "#f59e0b", icon: "📡",
      sub: e.sub ? `Sub: ${e.sub}` : undefined,
    }));
    return list;
  }, [tmdbId, mediaType, season, episode, originalName, title]);

  useEffect(() => {
    if (!tmdbId) return;
    fb.getEmbeds()
      .then((list: any[]) => {
        const matched = list.filter(e =>
          e.active && e.tmdbId === tmdbId &&
          (mediaType === "movie" ? e.type === "movie" : e.type === "series")
        );
        const all = buildServers(matched, builtinStates, customServers);
        setServers(all);
        const first = all[0];
        if (first && !activeUrl) { setActiveServerId(first.id); setActiveUrl(first.url); }
        else if (first) setActiveServerId(first.id);
      })
      .catch(() => {
        const all = buildServers([], builtinStates, customServers);
        setServers(all);
        if (all[0]) { setActiveServerId(all[0].id); setActiveUrl(all[0].url); }
      });
  }, [tmdbId, season, episode, builtinStates, customServers]);

  // ── Select server ───────────────────────────────────────────────
  const selectServer = async (srv: ServerItem) => {
    setCapturedM3u8(undefined);
    setActiveServerId(srv.id);
    if (srv.id !== "scraper") {
      setActiveUrl(srv.url);
      setWebviewKey(k => k + 1);
      startLoadingWithTimeout();
      return;
    }
    setScraping(true);
    setScrapeStatus("Mencari stream .m3u8...");
    try {
      // Use English title first, fallback to original name
      const searchName = title || originalName;
      const m3u8 = await scrapeM3u8(searchName, episode);
      if (m3u8) {
        setScrapeStatus("Stream ditemukan!");
        setActiveUrl(m3u8);
        setCapturedM3u8(m3u8);
        setWebviewKey(k => k + 1);
        startLoadingWithTimeout();
      } else {
        setScrapeStatus("Tidak ditemukan, beralih ke ZxcStream...");
        const fallback = servers.find(s => s.id === "zxc1");
        if (fallback) { setActiveServerId("zxc1"); setActiveUrl(fallback.url); setWebviewKey(k => k + 1); startLoadingWithTimeout(); }
        Alert.alert("Auto Scraper", `Tidak ada hasil untuk "${searchName}". Semua sumber sedang tidak tersedia.\n\nCoba gunakan server lain.`, [{ text: "OK" }]);
      }
    } catch {
      const fallback = servers.find(s => s.id === "zxc1");
      if (fallback) { setActiveServerId("zxc1"); setActiveUrl(fallback.url); setWebviewKey(k => k + 1); startLoadingWithTimeout(); }
    } finally {
      setScraping(false);
      setTimeout(() => setScrapeStatus(""), 3000);
    }
  };

  const goEpisode = (ep: number) => {
    if (ep < 1 || (totalEp && ep > totalEp)) return;
    setEpisode(ep);
    setCapturedM3u8(undefined);
    startLoadingWithTimeout();
  };

  useEffect(() => {
    if (!tmdbId || servers.length === 0) return;
    const current = servers.find(s => s.id === activeServerId);
    if (!current || current.id === "scraper" || mediaType === "movie") return;
    let newUrl = "";
    if (activeServerId.startsWith("zxc")) {
      const num = Number(activeServerId.replace("zxc", ""));
      newUrl = buildZxcTvUrl(tmdbId, num, season, episode);
    } else if (activeServerId === "peachify") {
      newUrl = buildPeachifyUrl(tmdbId, mediaType, season, episode);
    } else if (activeServerId === "vidzee") {
      newUrl = buildVidZeeTvUrl(tmdbId, season, episode);
    } else if (activeServerId === "vixsrc") {
      newUrl = buildVixSrcTvUrl(tmdbId, season, episode);
    } else if (activeServerId === "vidplus") {
      newUrl = buildVidPlusTvUrl(tmdbId, season, episode);
    } else if (activeServerId === "2embed") {
      newUrl = build2EmbedTvUrl(tmdbId, season, episode);
    } else if (activeServerId === "vidlink") {
      newUrl = buildVidLinkTvUrl(tmdbId, season, episode);
    } else if (activeServerId === "nontongo") {
      newUrl = buildNontongoTvUrl(tmdbId, season, episode);
    } else if (activeServerId.startsWith("custom_")) {
      const cs = customServers.find(s => `custom_${s.id}` === activeServerId);
      if (cs) newUrl = resolveCustomUrl(cs.url, tmdbId, season, episode, mediaType);
    }
    if (newUrl) { setCapturedM3u8(undefined); setActiveUrl(newUrl); setWebviewKey(k => k + 1); }
  }, [season, episode]);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "m3u8" && msg.url && !capturedM3u8) {
        setCapturedM3u8(msg.url);
      } else if (msg.type === "popup" && msg.url) {
        // window.open() popup from inside player (usually ads) → open in browser
        openInBrowser(msg.url);
      }
    } catch {}
  }, [capturedM3u8]);

  // ── Subtitle search (OpenSubtitles) ────────────────────────────
  const searchSubtitles = async (q: string) => {
    if (!q.trim()) return;
    setSubSearching(true);
    setSubResults([]);
    try {
      const url = `${OPENSUB_API}/query-${encodeURIComponent(q)}/sublanguageid-ind,eng/season-${season}/episode-${episode}`;
      const res = await fetch(url, { headers: { "X-User-Agent": "TemporaryUserAgent" } });
      if (!res.ok) throw new Error("fail");
      const data: SubResult[] = await res.json();
      setSubResults(data.slice(0, 15));
    } catch {
      setSubResults([]);
    } finally {
      setSubSearching(false);
    }
  };

  const loadSubtitle = async (sub: SubResult) => {
    try {
      const res = await fetch(sub.SubDownloadLink);
      const text = await res.text();
      const cues = sub.SubFormat.toLowerCase() === "srt" ? parseSrt(text) : parseVtt(text);
      setSubCues(cues);
      setSubActive(true);
      setSubTimer(0);
      setSubOffset(0);
      setSubRunning(false);
      setShowSubPanel(false);
      Alert.alert("Subtitle Dimuat", `"${sub.SubFileName}"\n\nTekan ▶ pada panel subtitle untuk mulai sync timer saat video mulai.`, [{ text: "OK" }]);
    } catch {
      Alert.alert("Gagal", "Subtitle tidak dapat dimuat. Coba yang lain.", [{ text: "OK" }]);
    }
  };

  const videoH = fullscreen ? screenSize.height : screenSize.width * (9 / 16);
  const streamUrlForShare = capturedM3u8 ?? (activeUrl.includes(".m3u8") ? activeUrl : undefined);

  return (
    <View style={[S.root, fullscreen && { backgroundColor: "#000" }]}>
      <StatusBar hidden={fullscreen} barStyle="light-content" backgroundColor={BG} />

      <View style={[S.playerBox, { height: videoH }]}>
        {scraping ? (
          <View style={S.scrapeOverlay}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={S.scrapeText}>{scrapeStatus}</Text>
          </View>
        ) : activeUrl ? (
          <WebView
            key={webviewKey}
            source={{
              uri: activeUrl,
              headers: { Referer: "https://www.google.com", Origin: "https://www.google.com" },
            }}
            style={{ flex: 1, backgroundColor: "#000" }}
            onLoadStart={() => startLoadingWithTimeout()}
            onLoadEnd={() => { clearLoadingTimer(); setLoading(false); }}
            onError={() => { clearLoadingTimer(); setLoading(false); }}
            onHttpError={() => { clearLoadingTimer(); setLoading(false); }}
            onMessage={handleWebViewMessage}
            injectedJavaScript={INJECT_JS}
            allowsFullscreenVideo
            javaScriptEnabled
            domStorageEnabled
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            allowsProtectedMedia
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            originWhitelist={["*"]}
            mixedContentMode="always"
            setSupportMultipleWindows={false}
            userAgent="Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
            onShouldStartLoadWithRequest={(req) => {
              const url = req.url;
              if (!url || url.startsWith("data:") || url.startsWith("about:") || url.startsWith("blob:")) return true;
              // Block known ad network domains at native level (sub-frames too)
              if (isAdDomain(url)) return false;
              // Allow same domain as the current player URL
              if (activeUrlRef.current && !activeUrlRef.current.startsWith("__")) {
                if (isSameDomain(url, activeUrlRef.current)) return true;
              }
              // Redirect top-frame navigations (ads/redirects) to browser
              if (req.isTopFrame) {
                openInBrowser(url);
                return false;
              }
              return true;
            }}
            onOpenWindow={(e) => {
              // Catch popups opened by window.open inside the player
              openInBrowser(e.nativeEvent.targetUrl);
            }}
          />
        ) : (
          <View style={S.noUrlBox}>
            <Text style={{ color: GRAY }}>Pilih server di bawah</Text>
          </View>
        )}

        {loading && !scraping && activeUrl ? (
          <View style={S.loadingOverlay}>
            <ActivityIndicator color={RED} size="large" />
            <Text style={S.loadingText}>Memuat video...</Text>
          </View>
        ) : null}

        {/* Subtitle overlay text */}
        {subActive && currentSubText !== "" && (
          <View style={S.subOverlay} pointerEvents="none">
            <Text style={S.subText}>{currentSubText}</Text>
          </View>
        )}

        {/* Fullscreen & CC buttons */}
        <TouchableOpacity
          style={[S.fsBtn, { top: fullscreen ? 20 : 8 }]}
          onPress={fullscreen ? exitFullscreen : enterFullscreen}
          activeOpacity={0.8}>
          <Text style={{ color: "#fff", fontSize: 16 }}>{fullscreen ? "⊠" : "⛶"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[S.ccBtn, { top: fullscreen ? 20 : 8 }]}
          onPress={() => { setSubSearchQuery(title || originalName); setShowSubPanel(true); }}
          activeOpacity={0.8}>
          <Text style={[S.ccBtnText, subActive && { color: GREEN }]}>CC</Text>
        </TouchableOpacity>
      </View>

      {/* Subtitle timer controls (shown when subtitle loaded) */}
      {subActive && !fullscreen && (
        <View style={S.subControls}>
          <TouchableOpacity onPress={() => setSubOffset(o => o - 1)} style={S.subCtrlBtn} activeOpacity={0.8}>
            <Text style={S.subCtrlText}>-1s</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSubRunning(r => !r)} style={[S.subCtrlBtn, { backgroundColor: subRunning ? "#1a3d0a" : RED }]} activeOpacity={0.8}>
            <Text style={S.subCtrlText}>{subRunning ? "⏸ Pause" : "▶ Mulai"}</Text>
          </TouchableOpacity>
          <Text style={S.subTimerText}>{Math.floor(subTimer / 60)}:{String(subTimer % 60).padStart(2, "0")}</Text>
          <TouchableOpacity onPress={() => setSubOffset(o => o + 1)} style={S.subCtrlBtn} activeOpacity={0.8}>
            <Text style={S.subCtrlText}>+1s</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setSubActive(false); setSubCues([]); setSubRunning(false); }} style={S.subCtrlBtn} activeOpacity={0.8}>
            <Text style={[S.subCtrlText, { color: RED }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {!fullscreen && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
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
            <TouchableOpacity style={S.shareBtn} onPress={() => setShareVisible(true)} activeOpacity={0.8}>
              <Text style={S.shareBtnIcon}>🎬</Text>
              <Text style={S.shareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>

          {streamUrlForShare ? (
            <View style={S.m3u8Badge}>
              <Text style={S.m3u8BadgeText}>● Stream tertangkap — Share Klip MP4 siap</Text>
            </View>
          ) : (
            <View style={S.m3u8Hint}>
              <Text style={S.m3u8HintText}>💡 Putar video terlebih dahulu agar Share Klip MP4 tersedia</Text>
            </View>
          )}

          {scrapeStatus ? (
            <View style={S.scrapeStatusBar}>
              <Text style={S.scrapeStatusText}>{scrapeStatus}</Text>
            </View>
          ) : null}

          {mediaType !== "movie" && (
            <View style={S.epNav}>
              <TouchableOpacity style={[S.epNavBtn, episode <= 1 && S.epNavBtnDisabled]}
                onPress={() => goEpisode(episode - 1)} disabled={episode <= 1} activeOpacity={0.8}>
                <Text style={S.epNavText}>‹ Ep. Sebelumnya</Text>
              </TouchableOpacity>
              <View style={S.epCurrent}>
                <Text style={S.epCurrentText}>Ep. {episode}</Text>
              </View>
              <TouchableOpacity
                style={[S.epNavBtn, (totalEp !== null && episode >= totalEp) && S.epNavBtnDisabled]}
                onPress={() => goEpisode(episode + 1)}
                disabled={totalEp !== null && episode >= totalEp} activeOpacity={0.8}>
                <Text style={S.epNavText}>Ep. Selanjutnya ›</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={S.serverLabel}>PILIH SERVER</Text>
          {servers.length === 0 ? (
            <View style={S.tipBox}>
              <Text style={[S.tipText, { color: RED }]}>⚠️ Semua server dinonaktifkan dari admin panel.</Text>
            </View>
          ) : (
            servers.map(srv => (
              <TouchableOpacity key={srv.id}
                style={[S.serverRow, activeServerId === srv.id && S.serverRowActive]}
                onPress={() => selectServer(srv)} activeOpacity={0.8}>
                <View style={[S.serverIconBox, activeServerId === srv.id && { backgroundColor: "#2a0000" }]}>
                  <Text style={{ fontSize: 20 }}>{srv.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.serverName, activeServerId === srv.id && { color: "#fff" }]}>{srv.label}</Text>
                  {srv.sub ? <Text style={S.serverSub} numberOfLines={1}>{srv.sub}</Text> : null}
                </View>
                <View style={[S.badge, { backgroundColor: srv.badgeColor + "22", borderColor: srv.badgeColor }]}>
                  <Text style={[S.badgeText, { color: srv.badgeColor }]}>{srv.badge}</Text>
                </View>
                {activeServerId === srv.id && <View style={S.activeDot} />}
              </TouchableOpacity>
            ))
          )}

          <View style={S.tipBox}>
            <Text style={S.tipText}>
              💡 Iklan di dalam player otomatis dibuka di browser.{"\n"}
              Untuk subtitle eksternal: tap tombol CC di atas video.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ── Subtitle Panel Modal ──────────────────────────────────── */}
      <Modal visible={showSubPanel} transparent animationType="slide" onRequestClose={() => setShowSubPanel(false)}>
        <View style={S.subModal}>
          <View style={S.subModalHeader}>
            <Text style={S.subModalTitle}>🗣 Cari Subtitle</Text>
            <TouchableOpacity onPress={() => setShowSubPanel(false)} activeOpacity={0.8}>
              <Text style={{ color: GRAY, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={S.subSearchRow}>
            <TextInput
              style={S.subSearchInput}
              value={subSearchQuery}
              onChangeText={setSubSearchQuery}
              placeholder="Judul film/serial..."
              placeholderTextColor={GRAY}
              returnKeyType="search"
              onSubmitEditing={() => searchSubtitles(subSearchQuery)}
            />
            <TouchableOpacity style={S.subSearchBtn} onPress={() => searchSubtitles(subSearchQuery)} activeOpacity={0.8}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>Cari</Text>
            </TouchableOpacity>
          </View>
          <Text style={S.subHint}>Subtitle diunduh dari OpenSubtitles. Setelah dimuat, tap ▶ untuk sync.</Text>
          {subSearching
            ? <ActivityIndicator color={RED} style={{ marginTop: 30 }} />
            : subResults.length > 0
              ? <ScrollView style={{ flex: 1 }}>
                  {subResults.map((r, i) => (
                    <TouchableOpacity key={i} style={S.subResultRow} onPress={() => loadSubtitle(r)} activeOpacity={0.85}>
                      <View style={{ flex: 1 }}>
                        <Text style={S.subResultName} numberOfLines={2}>{r.SubFileName}</Text>
                        <Text style={S.subResultLang}>{r.LanguageName} · {r.SubFormat.toUpperCase()}</Text>
                      </View>
                      <Text style={{ color: GREEN, fontSize: 20 }}>↓</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              : <View style={{ alignItems: "center", marginTop: 40 }}>
                  <Text style={{ fontSize: 32 }}>🔍</Text>
                  <Text style={{ color: GRAY, marginTop: 10, fontSize: 13, textAlign: "center" }}>
                    Ketik judul dan tekan Cari{"\n"}untuk mencari subtitle
                  </Text>
                </View>
          }
        </View>
      </Modal>

      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        title={title}
        tmdbId={tmdbId ?? 0}
        mediaType={mediaType as "movie" | "tv"}
        originalName={originalName}
        streamUrl={streamUrlForShare}
        episode={episode}
      />
    </View>
  );
}

const S = StyleSheet.create({
  root:             { flex: 1, backgroundColor: BG },
  playerBox:        { backgroundColor: "#000", position: "relative" },
  loadingOverlay:   { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)", gap: 12 },
  loadingText:      { color: "#fff", fontSize: 13, fontWeight: "600", opacity: 0.8 },
  scrapeOverlay:    { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000", gap: 16 },
  scrapeText:       { color: GREEN, fontSize: 14, fontWeight: "600" },
  noUrlBox:         { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  fsBtn:            { position: "absolute", right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  ccBtn:            { position: "absolute", right: 56, width: 36, height: 36, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)" },
  ccBtnText:        { color: "#fff", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  subOverlay:       { position: "absolute", bottom: 20, left: 12, right: 12, alignItems: "center" },
  subText:          { color: "#fff", fontSize: 15, fontWeight: "700", textAlign: "center", backgroundColor: "rgba(0,0,0,0.75)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, lineHeight: 22, textShadowColor: "#000", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  subControls:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#0a0a0a", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1a0000" },
  subCtrlBtn:       { backgroundColor: CARD_BG, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, minWidth: 44, alignItems: "center" },
  subCtrlText:      { color: "#fff", fontSize: 12, fontWeight: "700" },
  subTimerText:     { color: GREEN, fontSize: 14, fontWeight: "800", minWidth: 44, textAlign: "center" },
  titleRow:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 10 },
  backBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: CARD_BG, alignItems: "center", justifyContent: "center" },
  backText:         { color: "#fff", fontSize: 22, fontWeight: "700", lineHeight: 28 },
  titleText:        { color: "#fff", fontSize: 16, fontWeight: "800" },
  epLabel:          { color: RED, fontSize: 12, fontWeight: "700", marginTop: 2 },
  shareBtn:         { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: RED, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  shareBtnIcon:     { fontSize: 14 },
  shareBtnText:     { color: "#fff", fontSize: 12, fontWeight: "800" },
  m3u8Badge:        { marginHorizontal: 16, marginBottom: 8, backgroundColor: "#071a07", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: GREEN + "60" },
  m3u8BadgeText:    { color: GREEN, fontSize: 12, fontWeight: "700" },
  m3u8Hint:         { marginHorizontal: 16, marginBottom: 8, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  m3u8HintText:     { color: GRAY, fontSize: 11 },
  scrapeStatusBar:  { backgroundColor: "#0a3d1f", marginHorizontal: 16, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 8 },
  scrapeStatusText: { color: GREEN, fontSize: 12, fontWeight: "600" },
  epNav:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 16, marginBottom: 16, gap: 8 },
  epNavBtn:         { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#3a0000" },
  epNavBtnDisabled: { opacity: 0.35 },
  epNavText:        { color: "#fff", fontSize: 13, fontWeight: "700" },
  epCurrent:        { backgroundColor: RED, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  epCurrentText:    { color: "#fff", fontSize: 13, fontWeight: "800" },
  serverLabel:      { color: GRAY, fontSize: 11, fontWeight: "700", letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8 },
  serverRow:        { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 10, backgroundColor: CARD_BG, borderRadius: 12, padding: 14, gap: 12, borderWidth: 1.5, borderColor: "#2a0000" },
  serverRowActive:  { borderColor: RED },
  serverIconBox:    { width: 44, height: 44, borderRadius: 12, backgroundColor: "#2a0000", alignItems: "center", justifyContent: "center" },
  serverName:       { color: GRAY, fontSize: 14, fontWeight: "700" },
  serverSub:        { color: "#555", fontSize: 11, marginTop: 2 },
  badge:            { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1.5 },
  badgeText:        { fontSize: 10, fontWeight: "800" },
  activeDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: RED },
  tipBox:           { margin: 16, backgroundColor: CARD_BG, borderRadius: 12, padding: 14 },
  tipText:          { color: GRAY, fontSize: 12, lineHeight: 18 },
  subModal:         { flex: 1, backgroundColor: BG, paddingTop: 50 },
  subModalHeader:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#2a0000" },
  subModalTitle:    { color: "#fff", fontSize: 18, fontWeight: "900" },
  subSearchRow:     { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  subSearchInput:   { flex: 1, backgroundColor: CARD_BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "#3a0000" },
  subSearchBtn:     { backgroundColor: RED, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, justifyContent: "center" },
  subHint:          { color: GRAY, fontSize: 11, paddingHorizontal: 16, marginBottom: 8 },
  subResultRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1a0000", gap: 10 },
  subResultName:    { color: "#fff", fontSize: 13, fontWeight: "600" },
  subResultLang:    { color: GRAY, fontSize: 11, marginTop: 3 },
});
