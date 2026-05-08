import { useEffect, useRef, useCallback } from "react";

export interface PeachifyProgressEntry {
  id: number;
  type: "movie" | "tv";
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  progress: { watched: number; duration: number };
  last_season_watched?: string;
  last_episode_watched?: string;
  last_updated?: number;
  show_progress?: Record<string, {
    season: string;
    episode: string;
    progress: { watched: number; duration: number };
  }>;
}

export type PeachifyProgressStore = Record<string, PeachifyProgressEntry>;

const STORAGE_KEY = "peachifyProgress";

export function getStoredProgress(): PeachifyProgressStore {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getSavedStartAt(tmdbId: number, season?: number, episode?: number): number {
  const store = getStoredProgress();
  const entry = store[String(tmdbId)];
  if (!entry) return 0;

  if (season !== undefined && episode !== undefined) {
    const key = `s${season}e${episode}`;
    return entry.show_progress?.[key]?.progress?.watched ?? 0;
  }
  return entry.progress?.watched ?? 0;
}

export function usePeachifyPostMessage(
  isActive: boolean,
  onProgress?: (entry: PeachifyProgressEntry) => void
) {
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    if (!isActive) return;

    const handler = (event: MessageEvent) => {
      if (event.origin !== "https://peachify.top") return;

      if (event.data?.type === "MEDIA_DATA") {
        const incoming: PeachifyProgressStore = event.data.data;
        const current = getStoredProgress();
        const merged = { ...current, ...incoming };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        const firstEntry = Object.values(incoming)[0];
        if (firstEntry) onProgressRef.current?.(firstEntry);
      }

      if (event.data?.type === "PLAYER_EVENT") {
        const { event: playerEvent, currentTime, duration } = event.data.data ?? {};
        if (playerEvent === "timeupdate" || playerEvent === "ended") return;
        console.debug(`[Peachify] ${playerEvent} at ${currentTime}s / ${duration}s`);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isActive]);
}

export function usePeachifyIframeRef() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const sendCommand = useCallback((command: string, value?: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      value !== undefined ? { command, value } : { command },
      "*"
    );
  }, []);

  return { iframeRef, sendCommand };
}
