import { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, AppState } from "react-native";
import WebView from "react-native-webview";

export interface Ad {
  id: string;
  type: "banner-top" | "banner-bottom" | "popunder";
  label: string;
  code: string;
  active: boolean;
}

const W = Dimensions.get("window").width;
const WEB_DOMAIN = "https://apps-tmdb.web.app";
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

function buildHtml(code: string) {
  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
      img, iframe { max-width: 100%; }
    </style>
  </head><body>${code}</body></html>`;
}

function BannerWebView({ code, height }: { code: string; height: number }) {
  const [failed, setFailed] = useState(false);
  const [key, setKey] = useState(0);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", next => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        setKey(k => k + 1);
        setFailed(false);
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  if (failed) {
    return (
      <View style={[S.fallback, { height }]}>
        <Text style={S.fallbackText}>Ruang Iklan</Text>
      </View>
    );
  }

  return (
    <WebView
      key={key}
      source={{ html: buildHtml(code), baseUrl: WEB_DOMAIN }}
      style={{ width: W, height, backgroundColor: "#000" }}
      originWhitelist={["*"]}
      userAgent={MOBILE_UA}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      javaScriptEnabled
      domStorageEnabled
      thirdPartyCookiesEnabled
      mixedContentMode="always"
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      setSupportMultipleWindows={false}
      allowsFullscreenVideo={false}
      onError={() => setFailed(true)}
      onHttpError={() => setFailed(true)}
    />
  );
}

function PopunderWebView({ code }: { code: string }) {
  return (
    <View style={S.popunderWrap}>
      <WebView
        source={{ html: buildHtml(code), baseUrl: WEB_DOMAIN }}
        style={{ width: 1, height: 1 }}
        originWhitelist={["*"]}
        userAgent={MOBILE_UA}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

export default function AdBanner({ ads }: { ads: Ad[] }) {
  const active = ads.filter(a => a.active);
  const bannerTop = active.filter(a => a.type === "banner-top");
  const bannerBottom = active.filter(a => a.type === "banner-bottom");
  const popunders = active.filter(a => a.type === "popunder");

  if (!active.length) return null;

  return (
    <>
      {bannerTop.length > 0 && (
        <View style={[S.banner, S.top]}>
          {bannerTop.map(ad => (
            <BannerWebView key={ad.id} code={ad.code} height={80} />
          ))}
        </View>
      )}
      {bannerBottom.length > 0 && (
        <View style={[S.banner, S.bottom]}>
          {bannerBottom.map(ad => (
            <BannerWebView key={ad.id} code={ad.code} height={60} />
          ))}
        </View>
      )}
      {popunders.map(ad => (
        <PopunderWebView key={ad.id} code={ad.code} />
      ))}
    </>
  );
}

const S = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  top: { top: 0 },
  bottom: { bottom: 0 },
  fallback: {
    width: W,
    backgroundColor: "#0d1117",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: "#2a3a4a",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  popunderWrap: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 1,
    height: 1,
    opacity: 0,
    zIndex: -999,
  },
});
