import { useEffect, useRef, useState } from "react";
import type { Ad } from "@/lib/types";

interface AdBannerProps {
  ads: Ad[];
}

function injectScripts(code: string) {
  const el = document.createElement("div");
  el.style.display = "none";
  el.innerHTML = code;
  const scripts = el.querySelectorAll("script");
  if (scripts.length === 0) {
    document.body.appendChild(el);
    return;
  }
  scripts.forEach((s) => {
    const ns = document.createElement("script");
    if (s.src) {
      ns.src = s.src;
      ns.async = true;
    } else {
      ns.textContent = s.textContent;
    }
    document.body.appendChild(ns);
  });
}

function BannerSlot({ ad }: { ad: Ad }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    try {
      const range = document.createRange();
      range.selectNode(ref.current);
      const fragment = range.createContextualFragment(ad.code);
      ref.current.appendChild(fragment);
    } catch {
      if (ref.current) ref.current.innerHTML = ad.code;
    }
  }, [ad.code]);
  return <div ref={ref} className="w-full overflow-hidden" />;
}

function PopunderSlot({ ad }: { ad: Ad }) {
  useEffect(() => {
    const key = `pu_${ad.id}`;
    if (sessionStorage.getItem(key)) return;
    const delay = ad.delay ?? 0;
    const timer = setTimeout(() => {
      sessionStorage.setItem(key, "1");
      try { injectScripts(ad.code); } catch { /* ignore */ }
    }, delay);
    return () => clearTimeout(timer);
  }, [ad.id, ad.code, ad.delay]);
  return null;
}

function SocialBarSlot({ ad }: { ad: Ad }) {
  useEffect(() => {
    const key = `sb_${ad.id}`;
    if (document.getElementById(key)) return;
    try {
      injectScripts(ad.code);
      const marker = document.createElement("meta");
      marker.id = key;
      document.head.appendChild(marker);
    } catch { /* ignore */ }
  }, [ad.id, ad.code]);
  return null;
}

function InterstitialSlot({ ad }: { ad: Ad }) {
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = `itl_${ad.id}`;
    const freq = ad.frequency ?? 1;
    const seen = Number(sessionStorage.getItem(key) ?? "0");
    if (seen >= freq) return;
    const delay = ad.delay ?? 2000;
    const timer = setTimeout(() => {
      sessionStorage.setItem(key, String(seen + 1));
      setShow(true);
      setCountdown(5);
    }, delay);
    return () => clearTimeout(timer);
  }, [ad.id, ad.delay, ad.frequency]);

  useEffect(() => {
    if (!show) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [show, countdown]);

  useEffect(() => {
    if (!show || !ref.current) return;
    ref.current.innerHTML = "";
    try {
      const range = document.createRange();
      range.selectNode(ref.current);
      const fragment = range.createContextualFragment(ad.code);
      ref.current.appendChild(fragment);
    } catch {
      if (ref.current) ref.current.innerHTML = ad.code;
    }
  }, [show, ad.code]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90"
      style={{ backdropFilter: "blur(4px)" }}
    >
      <div className="relative w-full max-w-lg mx-4">
        <button
          onClick={() => setShow(false)}
          disabled={countdown > 0}
          className="absolute -top-10 right-0 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {countdown > 0 ? `Tutup dalam ${countdown}s` : "✕ Tutup"}
        </button>
        <div
          ref={ref}
          className="w-full overflow-hidden rounded-xl bg-black"
          style={{ minHeight: 60 }}
        />
      </div>
    </div>
  );
}

export function NativeVideoAd({ ads }: { ads: Ad[] }) {
  const active = ads.filter(
    (a) => a.active && a.type === "native-video" && (a.platform === "web" || a.platform === "both")
  );
  if (active.length === 0) return null;
  return (
    <div className="w-full my-4 space-y-3">
      {active.map((ad) => (
        <NativeVideoSlot key={ad.id} ad={ad} />
      ))}
    </div>
  );
}

function NativeVideoSlot({ ad }: { ad: Ad }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    try {
      const range = document.createRange();
      range.selectNode(ref.current);
      const fragment = range.createContextualFragment(ad.code);
      ref.current.appendChild(fragment);
    } catch {
      if (ref.current) ref.current.innerHTML = ad.code;
    }
  }, [ad.code]);
  return (
    <div
      ref={ref}
      className="w-full overflow-hidden rounded-lg"
      style={{ minHeight: 60 }}
    />
  );
}

export default function AdBanner({ ads }: AdBannerProps) {
  const webAds = ads.filter((a) => a.active && (!a.platform || a.platform === "web" || a.platform === "both"));

  const bannerTop     = webAds.filter((a) => a.type === "banner-top");
  const bannerBottom  = webAds.filter((a) => a.type === "banner-bottom");
  const popunders     = webAds.filter((a) => a.type === "popunder");
  const socialBars    = webAds.filter((a) => a.type === "social-bar");
  const interstitials = webAds.filter((a) => a.type === "interstitial");

  return (
    <>
      {bannerTop.length > 0 && (
        <div
          id="ad-banner-top"
          className="fixed top-0 left-0 right-0 z-[9999] bg-black overflow-hidden"
          style={{ maxHeight: 100 }}
        >
          {bannerTop.map((ad) => <BannerSlot key={ad.id} ad={ad} />)}
        </div>
      )}

      {bannerBottom.length > 0 && (
        <div
          id="ad-banner-bottom"
          className="fixed left-0 right-0 z-[9999] bg-black overflow-hidden"
          style={{
            bottom: "env(safe-area-inset-bottom, 0px)",
            maxHeight: 90,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {bannerBottom.map((ad) => <BannerSlot key={ad.id} ad={ad} />)}
        </div>
      )}

      {popunders.map((ad) => <PopunderSlot key={ad.id} ad={ad} />)}
      {socialBars.map((ad) => <SocialBarSlot key={ad.id} ad={ad} />)}
      {interstitials.map((ad) => <InterstitialSlot key={ad.id} ad={ad} />)}
    </>
  );
}
