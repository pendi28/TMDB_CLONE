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
import MovieCard from "@/components/MovieCard";
import AnimePage from "@/pages/anime";
import AnimeDetailPage from "@/pages/anime-detail";
import { MangaListPage, MangaDetailPage } from "@/pages/manga";
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

/* ── Maintenance Page ──────────────────────────────────── */
function MaintenancePage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ background: "#0d0000" }}>
      <div className="text-6xl mb-6">🔧</div>
      <h1 className="text-white text-2xl font-black mb-3">Sedang Maintenance</h1>
      <p className="text-gray-400 text-base max-w-sm leading-relaxed mb-8">
        {message || "Sedang dalam pemeliharaan. Silakan kembali lagi nanti."}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-[#E50914] hover:bg-[#CC0000] text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors"
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

/* ── Page shells for list pages ──────────────────────────── */
function PageShell({ title, queryKey, queryFn, mediaType }: {
  title: string;
  queryKey: (string | number)[];
  queryFn: () => Promise<TmdbListResult>;
  mediaType?: "movie" | "tv";
}) {
  const { data } = useQuery<TmdbListResult>({ queryKey, queryFn });
  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: "linear-gradient(to bottom, #0d0000, #0a0000)",
        paddingTop: "calc(56px + var(--banner-top-height, 0px) + 32px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-[#E50914] rounded-full" />
          <h1 className="text-white text-2xl font-black uppercase tracking-widest">{title}</h1>
        </div>
        {data?.results && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {data.results.map((item) => {
              const type = (item.media_type as "movie" | "tv") ?? mediaType ?? "movie";
              const itemTitle = item.title ?? item.name ?? "";
              const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
              return (
                <MovieCard
                  key={item.id}
                  id={item.id}
                  title={itemTitle}
                  posterPath={item.poster_path}
                  rating={item.vote_average}
                  year={year}
                  mediaType={type}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PeoplePage() {
  const { data } = useQuery<TmdbListResult>({ queryKey: ["people-popular", 1], queryFn: () => tmdb.peoplePopular(1) });
  return (
    <div
      className="min-h-screen pb-20"
      style={{
        background: "linear-gradient(to bottom, #0d0000, #0a0000)",
        paddingTop: "calc(56px + var(--banner-top-height, 0px) + 32px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-[#E50914] rounded-full" />
          <h1 className="text-white text-2xl font-black uppercase tracking-widest">Popular People</h1>
        </div>
        {data?.results && <ContentRow title="Popular People" items={data.results} />}
      </div>
    </div>
  );
}

function AwardsPage() {
  return (
    <div
      className="min-h-screen pb-20 text-white"
      style={{
        background: "linear-gradient(to bottom, #0d0000, #0a0000)",
        paddingTop: "calc(56px + var(--banner-top-height, 0px) + 32px)",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-[#E50914] rounded-full" />
          <h1 className="text-2xl font-black uppercase tracking-widest">Awards</h1>
        </div>
        <div className="space-y-3 text-gray-400">
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
  const { data: ads = [] } = useQuery({ queryKey: ["ads"], queryFn: fb.getAds });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fb.getSettings });

  const activeAds = (ads as Ad[]).filter((a) => a.active);
  const hasTop = activeAds.some((a) => a.type === "banner-top");
  const hasBottom = activeAds.some((a) => a.type === "banner-bottom");

  const maintenance = (settings as Settings | null)?.maintenanceMode === "true";
  const maintenanceMsg = (settings as Settings | null)?.maintenanceMessage ?? "";
  const announcementActive = (settings as Settings | null)?.announcementActive === "true";
  const announcementText = (settings as Settings | null)?.announcement ?? "";
  const accentColor = (settings as Settings | null)?.playerColor ?? "E50914";

  const [topH, setTopH] = useState(0);
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
    const els = ["ad-banner-top", "ad-banner-bottom", "announcement-banner"]
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    els.forEach((el) => ro.observe(el));
    return () => { clearTimeout(timer); ro.disconnect(); };
  }, [hasTop, hasBottom, activeAds.length, announcementActive]);

  const [path] = useState(() => window.location.pathname);
  const isAdmin = path.includes("/admin");

  return (
    <div className="dark">
      {announcementActive && announcementText && (
        <AnnouncementBanner message={announcementText} color={accentColor} />
      )}
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
              
              <Route path="/anime" component={AnimePage} />
              <Route path="/anime/:id" component={AnimeDetailPage} />
              <Route path="/manga" component={MangaListPage} />
              <Route path="/manga/:id" component={MangaDetailPage} />
              <Route path="/" component={HomePage} />
              <Route path="/movie/:id" component={MoviePage} />
              <Route path="/tv/:id" component={TvPage} />
              <Route path="/movies" component={() => <PageShell title="Popular Movies" queryKey={["popular-movies", 1]} queryFn={() => tmdb.popularMovies(1)} mediaType="movie" />} />
              <Route path="/movies/top-rated" component={() => <PageShell title="Top Rated Movies" queryKey={["top-movies", 1]} queryFn={() => tmdb.topMovies(1)} mediaType="movie" />} />
              <Route path="/movies/upcoming" component={() => <PageShell title="Upcoming Movies" queryKey={["upcoming-movies", 1]} queryFn={() => tmdb.upcoming(1)} mediaType="movie" />} />
              <Route path="/movies/now-playing" component={() => <PageShell title="Now Playing" queryKey={["now-playing-movies", 1]} queryFn={() => tmdb.nowPlaying(1)} mediaType="movie" />} />
              <Route path="/tv" component={() => <PageShell title="Popular TV Shows" queryKey={["popular-tv", 1]} queryFn={() => tmdb.popularTv(1)} mediaType="tv" />} />
              <Route path="/tv/top-rated" component={() => <PageShell title="Top Rated TV Shows" queryKey={["top-tv", 1]} queryFn={() => tmdb.topTv(1)} mediaType="tv" />} />
              <Route path="/tv/on-tv" component={() => <PageShell title="On TV" queryKey={["on-tv", 1]} queryFn={() => tmdb.onTv(1)} mediaType="tv" />} />
              <Route path="/tv/airing-today" component={() => <PageShell title="Airing Today" queryKey={["airing-today", 1]} queryFn={() => tmdb.airingToday(1)} mediaType="tv" />} />
              
{/* TAMBAHKAN ROUTE DONGHUA DI SINI */}
<Route path="/donghua" component={() => (
  <PageShell 
    title="Donghua China" 
    queryKey={["donghua", 1]} 
    queryFn={() => tmdb.donghua(1)} 
    mediaType="tv" 
  />
)} />
              <Route path="/people" component={PeoplePage} />
              <Route path="/awards" component={AwardsPage} />
              <Route path="/awards/:section" component={AwardsPage} />
              <Route path="/search" component={SearchPage} />
              <Route path="/admin" component={AdminPage} />
              <Route component={NotFound} />
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
