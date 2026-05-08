import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { fb } from "@/lib/firebase";
import { tmdb } from "@/lib/tmdb";
import type { Ad, Settings, TmdbListResult } from "@/lib/types";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import MoviePage from "@/pages/movie";
import TvPage from "@/pages/tv";
import SearchPage from "@/pages/search";
import AdminPage from "@/pages/admin";
import Navbar from "@/components/Navbar";
import AdBanner from "@/components/AdBanner";
import ContentRow from "@/components/ContentRow";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

/* ── Maintenance Page ──────────────────────────────────── */
function MaintenancePage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-6">🔧</div>
      <h1 className="text-white text-2xl font-black mb-3">Sedang Maintenance</h1>
      <p className="text-gray-400 text-base max-w-sm leading-relaxed mb-8">
        {message || "Sedang dalam pemeliharaan. Silakan kembali lagi nanti."}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors"
      >
        Coba Lagi
      </button>
    </div>
  );
}

/* ── Announcement Banner ────────────────────────────────── */
function AnnouncementBanner({ message, color }: { message: string; color: string }) {
  const [dismissed, setDismissed] = useState(false);
  const hex = `#${color.replace("#", "").padEnd(6, "0").slice(0, 6)}`;

  if (dismissed || !message) return null;

  return (
    <div
      id="announcement-banner"
      className="fixed top-0 left-0 right-0 z-[10000] flex items-center justify-between px-4 py-2 text-white text-xs font-semibold shadow-lg"
      style={{ background: hex }}
    >
      <span className="flex-1 text-center truncate px-6">📢 {message}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white font-bold text-base leading-none"
        aria-label="Tutup"
      >
        ✕
      </button>
    </div>
  );
}

/* ── Page shells ─────────────────────────────────────────── */
function PageShell({ title, queryKey, queryFn, mediaType }: {
  title: string;
  queryKey: (string | number)[];
  queryFn: () => Promise<TmdbListResult>;
  mediaType?: "movie" | "tv";
}) {
  const { data } = useQuery<TmdbListResult>({ queryKey, queryFn });
  return (
    <div className="min-h-screen bg-[#141414] pt-24 pb-20 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-white text-3xl font-black mb-8">{title}</h1>
        {data?.results && <ContentRow title={title} items={data.results} mediaType={mediaType} />}
      </div>
    </div>
  );
}

function PeoplePage() {
  const { data } = useQuery<TmdbListResult>({ queryKey: ["people-popular", 1], queryFn: () => tmdb.peoplePopular(1) });
  return (
    <div className="min-h-screen bg-[#141414] pt-24 pb-20 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-white text-3xl font-black mb-8">Popular People</h1>
        {data?.results ? <ContentRow title="Popular People" items={data.results} /> : null}
      </div>
    </div>
  );
}

function AwardsPage() {
  return (
    <div className="min-h-screen bg-[#141414] pt-24 pb-20 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto text-white">
        <h1 className="text-3xl font-black mb-4">Awards</h1>
        <div className="space-y-3 text-gray-300">
          <p>Contribution Bible</p>
          <p>Discussions</p>
          <p>Leaderboard</p>
        </div>
      </div>
    </div>
  );
}

/* ── App Content ─────────────────────────────────────────── */
function AppContent() {
  const { data: ads = [] }      = useQuery({ queryKey: ["ads"],      queryFn: fb.getAds });
  const { data: settings }      = useQuery({ queryKey: ["settings"], queryFn: fb.getSettings });

  const activeAds   = (ads as Ad[]).filter((a) => a.active);
  const hasTop      = activeAds.some((a) => a.type === "banner-top");
  const hasBottom   = activeAds.some((a) => a.type === "banner-bottom");

  const maintenance        = (settings as Settings | null)?.maintenanceMode === "true";
  const maintenanceMsg     = (settings as Settings | null)?.maintenanceMessage ?? "";
  const announcementActive = (settings as Settings | null)?.announcementActive === "true";
  const announcementText   = (settings as Settings | null)?.announcement ?? "";
  const accentColor        = (settings as Settings | null)?.playerColor ?? "E50914";

  const [topH,    setTopH]    = useState(0);
  const [bottomH, setBottomH] = useState(0);

  useEffect(() => {
    const update = () => {
      const t = document.getElementById("ad-banner-top");
      const b = document.getElementById("ad-banner-bottom");
      const a = document.getElementById("announcement-banner");
      const th = (t?.offsetHeight ?? 0) + (a?.offsetHeight ?? 0);
      const bh = b?.offsetHeight ?? 0;
      setTopH(th);
      setBottomH(bh);
      document.documentElement.style.setProperty("--banner-top-height", `${th}px`);
    };
    update();
    const timer = setTimeout(update, 500);
    const ro = new ResizeObserver(update);
    const els = ["ad-banner-top", "ad-banner-bottom", "announcement-banner"].map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    els.forEach(el => ro.observe(el));
    return () => { clearTimeout(timer); ro.disconnect(); };
  }, [hasTop, hasBottom, activeAds.length, announcementActive]);

  /* Allow /admin even during maintenance */
  const [path] = useState(() => window.location.pathname);
  const isAdmin = path.includes("/admin");

  return (
    <div className="dark">
      <AnnouncementBanner message={announcementText} color={accentColor} />
      <AdBanner ads={activeAds} />

      {maintenance && !isAdmin ? (
        <div style={{ paddingTop: topH }}>
          <MaintenancePage message={maintenanceMsg} />
        </div>
      ) : (
        <div style={{ paddingTop: topH, paddingBottom: bottomH }}>
          <Navbar />
          <main>
            <Switch>
              <Route path="/"                  component={HomePage} />
              <Route path="/movie/:id"          component={MoviePage} />
              <Route path="/tv/:id"             component={TvPage} />
              <Route path="/movies"             component={() => <PageShell title="Popular Movies"       queryKey={["popular-movies", 1]}   queryFn={() => tmdb.popularMovies(1)}  mediaType="movie" />} />
              <Route path="/movies/top-rated"   component={() => <PageShell title="Top Rated Movies"    queryKey={["top-movies", 1]}        queryFn={() => tmdb.topMovies(1)}      mediaType="movie" />} />
              <Route path="/movies/upcoming"    component={() => <PageShell title="Upcoming Movies"     queryKey={["upcoming-movies", 1]}   queryFn={() => tmdb.upcoming(1)}       mediaType="movie" />} />
              <Route path="/movies/now-playing" component={() => <PageShell title="Now Playing"         queryKey={["now-playing-movies", 1]} queryFn={() => tmdb.nowPlaying(1)}    mediaType="movie" />} />
              <Route path="/tv"                 component={() => <PageShell title="Popular TV Shows"    queryKey={["popular-tv", 1]}        queryFn={() => tmdb.popularTv(1)}      mediaType="tv" />} />
              <Route path="/tv/top-rated"       component={() => <PageShell title="Top Rated TV Shows"  queryKey={["top-tv", 1]}            queryFn={() => tmdb.topTv(1)}          mediaType="tv" />} />
              <Route path="/tv/on-tv"           component={() => <PageShell title="On TV"               queryKey={["on-tv", 1]}             queryFn={() => tmdb.onTv(1)}           mediaType="tv" />} />
              <Route path="/tv/airing-today"    component={() => <PageShell title="Airing Today"        queryKey={["airing-today", 1]}      queryFn={() => tmdb.airingToday(1)}    mediaType="tv" />} />
              <Route path="/people"             component={PeoplePage} />
              <Route path="/awards"             component={AwardsPage} />
              <Route path="/awards/:section"    component={AwardsPage} />
              <Route path="/search"             component={SearchPage} />
              <Route path="/admin"              component={AdminPage} />
              <Route                            component={NotFound} />
            </Switch>
          </main>
        </div>
      )}
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppContent />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
