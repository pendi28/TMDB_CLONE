import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fb, hashPassword } from "@/lib/firebase";
import { tmdb } from "@/lib/tmdb";
import { getToken, setToken, clearToken } from "@/lib/auth";
import type {
  Settings, Ad, Embed, CustomMovie, SeriesEpisode,
  CustomServer, BuiltinServerState,
  TmdbListItem, TmdbFindResult, TmdbTvShow,
} from "@/lib/types";
import {
  LogOut, Plus, Trash2, Eye, EyeOff, Save, Lock, Tv,
  Pencil, Search, Check, X, Loader2, Film,
  LayoutList, Server, Palette,
  Megaphone, Link2, Smartphone,
  ExternalLink, RefreshCw,
  Globe, Video, PanelTop, PanelBottom,
  MousePointerClick, Share2, SquarePlay, Maximize2, ChevronDown,
  Play, Copy, CheckCheck,
} from "lucide-react";

const IMG = "https://image.tmdb.org/t/p";

/* ── helpers ─────────────────────────────────────────────── */
const inp = "w-full bg-[#1e2535] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600";
const yaBtn = "bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-50";
const card = "bg-[#161b27] border border-white/[0.08] rounded-xl";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <label className="block text-yellow-400 text-xs font-bold mb-1.5 uppercase tracking-widest">{label}</label>
      {children}
      {hint && <p className="text-gray-500 text-[10px] mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${value ? "bg-yellow-400" : "bg-gray-700"}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${value ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

/* ── BUILTIN SERVERS (semua server yg didukung) ──────────── */
type BuiltinDef = {
  id: string;
  name: string;
  movieUrl: string;
  tvUrl: string;
  badge: string;
  badgeColor: string;
  note?: string;
};

const ALL_BUILTIN: BuiltinDef[] = [
  {
    id: "vidplus",
    name: "🎬 VidPlus",
    movieUrl: "https://player.vidplus.to/embed/movie/{id}?primarycolor=E50914&secondarycolor=170000&iconcolor=FFFFFF&autoplay=true&icons=netflix",
    tvUrl:    "https://player.vidplus.to/embed/tv/{id}/{s}/{e}?primarycolor=E50914&secondarycolor=170000&iconcolor=FFFFFF&autoplay=true&autonext=true&icons=netflix",
    badge: "NEW", badgeColor: "#6C63FF",
    note: "Player premium dengan Netflix UI",
  },
  {
    id: "peachify",
    name: "🍑 Peachify VIP",
    movieUrl: "https://peachify.top/embed/movie/{id}?accent=E50914",
    tvUrl:    "https://peachify.top/embed/tv/{id}?season={s}&episode={e}&accent=E50914&autoNext=1",
    badge: "VIP", badgeColor: "#ff4757",
    note: "Server utama, cepat & stabil",
  },
  {
    id: "vidzee",
    name: "🎭 VidZee",
    movieUrl: "https://player.vidzee.wtf/embed/movie/{id}",
    tvUrl:    "https://player.vidzee.wtf/embed/tv/{id}/{s}/{e}",
    badge: "HD", badgeColor: "#FF6B35",
    note: "Multi server, kualitas tinggi",
  },
  {
    id: "vixsrc",
    name: "🦊 VixSrc",
    movieUrl: "https://vixsrc.to/movie/{id}",
    tvUrl:    "https://vixsrc.to/tv/{id}/{s}/{e}",
    badge: "ALT", badgeColor: "#059669",
    note: "Alternatif cepat",
  },
  {
    id: "myvercel",
    name: "⚡ Server Utama",
    movieUrl: "https://myvercel-player.vercel.app/embed/movie/{id}",
    tvUrl:    "https://myvercel-player.vercel.app/embed/tv/{id}",
    badge: "FAST", badgeColor: "#0ea5e9",
    note: "Server custom (no ads)",
  },
  {
    id: "vidking",
    name: "🖥️ ZxcStream",
    movieUrl: "https://zxcstream.xyz/player/movie/{id}?color=E50914&autoplay=true",
    tvUrl:    "https://zxcstream.xyz/player/tv/{id}/{s}/{e}?color=E50914&autoplay=true",
    badge: "HD", badgeColor: "#E50914",
    note: "Multi server ZxcStream",
  },
  {
    id: "vidsrc",
    name: "🌐 VidSrc",
    movieUrl: "https://vidsrc.to/embed/movie/{id}",
    tvUrl:    "https://vidsrc.to/embed/tv/{id}/{s}/{e}",
    badge: "FREE", badgeColor: "#6b7280",
    note: "Gratis, kadang lambat",
  },
  {
    id: "vidsrcxyz",
    name: "🌐 VidSrc.xyz",
    movieUrl: "https://vidsrc.xyz/embed/movie/{id}",
    tvUrl:    "https://vidsrc.xyz/embed/tv?tmdb={id}&season={s}&episode={e}",
    badge: "FREE", badgeColor: "#6b7280",
    note: "Alternatif VidSrc",
  },
  {
    id: "2embed",
    name: "📺 2Embed",
    movieUrl: "https://www.2embed.cc/embed/{id}",
    tvUrl:    "https://www.2embed.cc/embedtv/{id}&s={s}&e={e}",
    badge: "HD", badgeColor: "#0ea5e9",
    note: "Server 2Embed",
  },
  {
    id: "vidlink",
    name: "🔗 VidLink",
    movieUrl: "https://vidlink.pro/movie/{id}",
    tvUrl:    "https://vidlink.pro/tv/{id}/{s}/{e}",
    badge: "NEW", badgeColor: "#f59e0b",
    note: "VidLink player",
  },
  {
    id: "nontongo",
    name: "🎥 Nontongo",
    movieUrl: "https://www.nontongo.win/embed/movie/{id}",
    tvUrl:    "https://nontongo.win/embed/tv/{id}/{s}/{e}",
    badge: "ALT", badgeColor: "#10b981",
    note: "Server Nontongo",
  },
  {
    id: "autoembed",
    name: "🌐 AutoEmbed",
    movieUrl: "https://autoembed.cc/embed/movie/{id}",
    tvUrl:    "https://autoembed.cc/embed/tv/{id}?s={s}&e={e}",
    badge: "FREE", badgeColor: "#16a34a",
    note: "AutoEmbed gratis",
  },
  {
    id: "psyplay",
    name: "🎭 PsyPlay",
    movieUrl: "https://autoembed.co/embed/movie/{id}",
    tvUrl:    "https://autoembed.co/embed/tv/{id}/{s}/{e}",
    badge: "PSY", badgeColor: "#7c3aed",
    note: "PsyPlay via autoembed.co",
  },
];

const SAMPLE_MOVIE_ID = "550";
const SAMPLE_TV_ID = "94997";

function resolveUrl(template: string, id: string, s = "1", e = "1") {
  return template
    .replace(/\{id\}/g, id)
    .replace(/\{type\}/g, "movie")
    .replace(/\{s\}/g, s)
    .replace(/\{e\}/g, e);
}

type NavTab = "daftar" | "tambah" | "server" | "iklan" | "tema" | "build";

/* ── AD META ─────────────────────────────────────────────── */
type AdType = Ad["type"];
type Platform = Ad["platform"];

const AD_META: Record<AdType, { label: string; desc: string; colorClass: string; icon: React.ReactNode; platformNote: string }> = {
  "banner-top":    { label: "Banner Atas",    desc: "Strip iklan tetap di atas halaman",         colorClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",   icon: <PanelTop size={14}/>,        platformNote: "Web & APK WebView" },
  "banner-bottom": { label: "Banner Bawah",   desc: "Strip iklan tetap di bawah halaman",        colorClass: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: <PanelBottom size={14}/>,  platformNote: "Web & APK WebView" },
  "popunder":      { label: "Pop-under",      desc: "Tab/jendela buka di belakang halaman",      colorClass: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: <MousePointerClick size={14}/>, platformNote: "Web only" },
  "social-bar":    { label: "Social Bar",     desc: "Bar ikon melayang di bawah (Adsterra dll)", colorClass: "bg-green-500/20 text-green-400 border-green-500/30",  icon: <Share2 size={14}/>,          platformNote: "Web & APK WebView" },
  "native-video":  { label: "Native Video",   desc: "Video iklan tertanam dalam konten",         colorClass: "bg-red-500/20 text-red-400 border-red-500/30",        icon: <SquarePlay size={14}/>,      platformNote: "Web only" },
  "interstitial":  { label: "Interstitial",   desc: "Layar penuh, ada tombol tutup countdown",   colorClass: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Maximize2 size={14}/>,    platformNote: "Web & APK AdMob" },
};

const SIZE_PRESETS = [
  { label: "Responsif (otomatis)", value: "responsive" },
  { label: "Leaderboard 728×90",   value: "728x90" },
  { label: "Banner Mobile 320×50", value: "320x50" },
  { label: "Medium Rect 300×250",  value: "300x250" },
  { label: "Half Page 300×600",    value: "300x600" },
  { label: "Large Rect 336×280",   value: "336x280" },
];

/* ══════════════════════════════════════════════════════════ */
/* IKLAN TAB                                                 */
/* ══════════════════════════════════════════════════════════ */
type IklanSub = "semua" | AdType;

const emptyAd = (): Omit<Ad, "id"> => ({
  type: "banner-top", label: "", code: "", active: true,
  platform: "both", delay: 0, frequency: 1, adMobId: "", size: "responsive",
});

function IklanTab() {
  const qc = useQueryClient();
  const [sub, setSub] = useState<IklanSub>("semua");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Ad, "id">>(emptyAd());

  const { data: ads = [], isLoading } = useQuery<Ad[]>({ queryKey: ["ads"], queryFn: fb.getAds });

  const addAd = useMutation({ mutationFn: () => fb.addAd(form), onSuccess: () => { qc.invalidateQueries({ queryKey: ["ads"] }); setShowForm(false); setForm(emptyAd()); setEditId(null); } });
  const updateAd = useMutation({ mutationFn: () => fb.updateAd(editId!, form), onSuccess: () => { qc.invalidateQueries({ queryKey: ["ads"] }); setShowForm(false); setForm(emptyAd()); setEditId(null); } });
  const deleteAd = useMutation({ mutationFn: (id: string) => fb.deleteAd(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["ads"] }) });
  const toggleActive = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => fb.updateAd(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ["ads"] }) });

  const filtered = sub === "semua" ? ads : ads.filter((a) => a.type === sub);
  const openEdit = (ad: Ad) => { setEditId(ad.id); setForm({ type: ad.type, label: ad.label, code: ad.code, active: ad.active, platform: ad.platform ?? "both", delay: ad.delay ?? 0, frequency: ad.frequency ?? 1, adMobId: ad.adMobId ?? "", size: ad.size ?? "responsive" }); setShowForm(true); };
  const openNew = (type?: AdType) => { setEditId(null); setForm({ ...emptyAd(), type: type ?? "banner-top" }); setShowForm(true); };
  const isPending = addAd.isPending || updateAd.isPending;

  const SUBS: { id: IklanSub; label: string }[] = [
    { id: "semua", label: "Semua" }, { id: "banner-top", label: "Atas" }, { id: "banner-bottom", label: "Bawah" },
    { id: "popunder", label: "Pop-under" }, { id: "social-bar", label: "Social Bar" },
    { id: "native-video", label: "Video" }, { id: "interstitial", label: "Interstitial" },
  ];

  return (
    <div className="pb-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-yellow-400 text-xl font-black">Ads Manager</h2>
        <button onClick={() => openNew()} className={`${yaBtn} flex items-center gap-1.5 py-2`}><Plus size={14} /> Tambah</button>
      </div>
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="flex gap-1.5 min-w-max">
          {SUBS.map((s) => (
            <button key={s.id} onClick={() => setSub(s.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${sub === s.id ? "bg-yellow-400 text-black" : "bg-[#1e2535] text-gray-400 hover:text-white"}`}>
              {s.label}{s.id !== "semua" && <span className="ml-1.5 opacity-60">{ads.filter((a) => a.type === s.id).length}</span>}
            </button>
          ))}
        </div>
      </div>
      {sub === "semua" && !showForm && (
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(AD_META) as AdType[]).map((t) => (
            <button key={t} onClick={() => openNew(t)} className={`${card} flex items-center gap-2.5 px-3 py-2.5 text-left border hover:border-yellow-400/30 transition-colors`}>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${AD_META[t].colorClass}`}>{AD_META[t].icon}</span>
              <div className="min-w-0"><p className="text-white text-xs font-bold truncate">{AD_META[t].label}</p><p className="text-gray-600 text-[10px] truncate">{AD_META[t].desc}</p></div>
              <Plus size={12} className="text-gray-600 flex-shrink-0 ml-auto" />
            </button>
          ))}
        </div>
      )}
      {showForm && (
        <div className={`${card} p-5 space-y-4`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-black">{editId ? "Edit Iklan" : "Tambah Iklan"}</p>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyAd()); }} className="text-gray-500 hover:text-white"><X size={18}/></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama Iklan"><input className={inp} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Contoh: Banner Atas Utama" /></Field>
            <Field label="Tipe Iklan">
              <select className={inp} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AdType })}>
                {(Object.keys(AD_META) as AdType[]).map((t) => <option key={t} value={t}>{AD_META[t].label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Platform">
            <div className="flex gap-2">
              {(["web", "apk", "both"] as Platform[]).map((p) => (
                <button key={p} type="button" onClick={() => setForm({ ...form, platform: p })} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${form.platform === p ? "bg-yellow-400 text-black border-yellow-400" : "bg-[#1e2535] text-gray-400 border-white/10 hover:text-white"}`}>
                  {p === "web" ? "🌐 Web" : p === "apk" ? "📱 APK" : "✅ Keduanya"}
                </button>
              ))}
            </div>
          </Field>
          {(form.type === "banner-top" || form.type === "banner-bottom") && (
            <Field label="Ukuran Banner">
              <select className={inp} value={form.size ?? "responsive"} onChange={(e) => setForm({ ...form, size: e.target.value })}>
                {SIZE_PRESETS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          )}
          {(form.type === "popunder" || form.type === "interstitial") && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Delay (detik)"><input type="number" min={0} max={60} className={inp} value={(form.delay ?? 0) / 1000} onChange={(e) => setForm({ ...form, delay: Number(e.target.value) * 1000 })} /></Field>
              <Field label="Frekuensi/Sesi"><input type="number" min={1} max={10} className={inp} value={form.frequency ?? 1} onChange={(e) => setForm({ ...form, frequency: Number(e.target.value) })} /></Field>
            </div>
          )}
          {(form.platform === "apk" || form.platform === "both") && (form.type === "banner-top" || form.type === "banner-bottom" || form.type === "interstitial") && (
            <Field label="AdMob Unit ID (APK)" hint="ca-app-pub-xxxxxxxx/xxxxxxxxxx">
              <input className={inp} value={form.adMobId ?? ""} onChange={(e) => setForm({ ...form, adMobId: e.target.value })} placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx" />
            </Field>
          )}
          <Field label="Kode Script / HTML Iklan">
            <textarea className={`${inp} font-mono text-xs leading-relaxed resize-y`} rows={6} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder='<script async src="https://pagead2.googlesyndication.com/..."></script>' />
          </Field>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white font-bold">Aktifkan sekarang</span>
            <Toggle value={form.active} onChange={(v) => setForm({ ...form, active: v })} />
          </div>
          <button onClick={() => editId ? updateAd.mutate() : addAd.mutate()} disabled={isPending || !form.label.trim()} className={`${yaBtn} w-full flex items-center justify-center gap-2`}>
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editId ? "Update Iklan" : "Simpan Iklan"}
          </button>
        </div>
      )}
      {isLoading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-yellow-400" /></div> :
       filtered.length === 0 && !showForm ? (
        <div className={`${card} p-8 text-center`}>
          <Megaphone className="mx-auto mb-2 text-gray-700" size={32} />
          <p className="text-gray-500 text-sm">Belum ada iklan</p>
          <button onClick={() => openNew()} className="mt-3 text-yellow-400 text-xs font-bold">+ Tambah sekarang</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ad) => {
            const meta = AD_META[ad.type] ?? AD_META["banner-top"];
            const platform = ad.platform ?? "both";
            return (
              <div key={ad.id} className={`${card} px-4 py-3`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${meta.colorClass}`}>{meta.icon} {meta.label}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${platform === "web" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : platform === "apk" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-white/5 text-gray-400 border-white/10"}`}>
                        {platform === "web" ? "🌐 Web" : platform === "apk" ? "📱 APK" : "✅ Semua"}
                      </span>
                    </div>
                    <p className="text-white text-sm font-bold truncate">{ad.label || "(tanpa nama)"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Toggle value={ad.active} onChange={(v) => toggleActive.mutate({ id: ad.id, active: v })} />
                    <button onClick={() => openEdit(ad)} className="text-gray-500 hover:text-yellow-400 p-1"><Pencil size={14} /></button>
                    <button onClick={() => { if (confirm(`Hapus iklan "${ad.label}"?`)) deleteAd.mutate(ad.id); }} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* LOGIN                                                     */
/* ══════════════════════════════════════════════════════════ */
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLd] = useState(false);
  const [show, setShow] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setLd(true);
    try {
      const hash = await hashPassword(pw);
      const stored = await fb.getPasswordHash();
      if (!stored || hash !== stored) throw new Error();
      setToken(hash); onLogin();
    } catch { setErr("Password salah."); }
    finally { setLd(false); }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4">
      <div className={`${card} w-full max-w-sm p-8`}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center"><Tv className="w-5 h-5 text-black" /></div>
          <div><h1 className="text-white font-black text-lg">XpoGo Admin</h1><p className="text-gray-500 text-xs">Streaming Management</p></div>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <Field label="Password Admin">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Masukkan password" autoFocus className={`${inp} pl-10 pr-10`} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {err && <p className="text-red-400 text-xs mt-1">{err}</p>}
          </Field>
          <button type="submit" disabled={loading} className={`${yaBtn} w-full`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* SERVER TAB — diperbaiki                                   */
/* ══════════════════════════════════════════════════════════ */
const URL_VARS = ["{id}", "{type}", "{s}", "{e}", "{imdb}"];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button onClick={doCopy} className="text-gray-500 hover:text-yellow-400 p-1 transition-colors" title="Salin URL">
      {copied ? <CheckCheck size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  );
}

function ServerTab() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editSrv, setEditSrv] = useState<CustomServer | null>(null);
  const [srvName, setSrvName] = useState("");
  const [srvMovieUrl, setSrvMovieUrl] = useState("");
  const [srvTvUrl, setSrvTvUrl]       = useState("");
  const [previewType, setPreviewType] = useState<"movie" | "tv">("movie");

  const { data: builtinStates = {} } = useQuery<BuiltinServerState>({ queryKey: ["builtin_states"], queryFn: async () => (await fb.getBuiltinServerStates()) ?? {} });
  const { data: customSrvs = [] }    = useQuery<CustomServer[]>({ queryKey: ["custom_servers"], queryFn: fb.getCustomServers });

  const toggleBuiltin = useMutation({ mutationFn: ({ id, val }: { id: string; val: boolean }) => fb.setBuiltinServerState(id, val), onSuccess: () => qc.invalidateQueries({ queryKey: ["builtin_states"] }) });
  const addSrv  = useMutation({
    mutationFn: () => fb.addCustomServer({ name: srvName, url: srvMovieUrl, active: true, createdAt: Date.now() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom_servers"] }); setSrvName(""); setSrvMovieUrl(""); setSrvTvUrl(""); setAddOpen(false); },
  });
  const updateSrv = useMutation({
    mutationFn: () => fb.updateCustomServer(editSrv!.id, { name: srvName, url: srvMovieUrl }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom_servers"] }); setEditSrv(null); setSrvName(""); setSrvMovieUrl(""); setSrvTvUrl(""); },
  });
  const delSrv = useMutation({ mutationFn: (id: string) => fb.deleteCustomServer(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_servers"] }) });
  const toggleCustom = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => fb.updateCustomServer(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_servers"] }) });

  const openEdit = (s: CustomServer) => { setEditSrv(s); setSrvName(s.name); setSrvMovieUrl(s.url); setSrvTvUrl(""); setAddOpen(false); };
  const openNew  = () => { setEditSrv(null); setSrvName(""); setSrvMovieUrl(""); setSrvTvUrl(""); setAddOpen(true); };
  const closeForm = () => { setAddOpen(false); setEditSrv(null); setSrvName(""); setSrvMovieUrl(""); setSrvTvUrl(""); };

  const previewUrl = previewType === "movie"
    ? resolveUrl(srvMovieUrl, SAMPLE_MOVIE_ID)
    : resolveUrl(srvTvUrl || srvMovieUrl, SAMPLE_TV_ID, "1", "1");

  return (
    <div className="pb-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-yellow-400 text-xl font-black">Server Player</h2>
        <button onClick={openNew} className={`${yaBtn} flex items-center gap-1.5 py-2`}><Plus size={14} /> Tambah Server</button>
      </div>

      {/* Panduan variabel */}
      <div className={`${card} p-4 bg-blue-500/5 border-blue-500/20`}>
        <p className="text-blue-400 text-xs font-bold mb-2">📌 Variabel URL Template</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["{id}", "TMDB ID film/series"],
            ["{s}", "Nomor Season"],
            ["{e}", "Nomor Episode"],
            ["{type}", "movie atau tv"],
            ["{imdb}", "IMDB ID"],
          ].map(([v, d]) => (
            <div key={v} className="bg-[#0d1117] rounded-lg px-2 py-1.5">
              <code className="text-yellow-400 text-[10px] font-bold block">{v}</code>
              <p className="text-gray-500 text-[9px]">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* BUILTIN SERVERS */}
      <div>
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Server Bawaan ({ALL_BUILTIN.length})</p>
        <div className="space-y-2">
          {ALL_BUILTIN.map((s) => {
            const isOn = builtinStates[s.id] !== false;
            return (
              <div key={s.id} className={`${card} px-4 py-3 transition-all ${isOn ? "" : "opacity-50"}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white font-bold text-sm">{s.name}</p>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: s.badgeColor + "33", color: s.badgeColor, border: `1px solid ${s.badgeColor}55` }}>{s.badge}</span>
                    </div>
                    {s.note && <p className="text-gray-600 text-[10px]">{s.note}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-700 text-[9px] font-mono truncate max-w-[180px]">{s.movieUrl.replace("https://", "")}</p>
                      <a href={resolveUrl(s.movieUrl, SAMPLE_MOVIE_ID)} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-yellow-400 flex-shrink-0" title="Test URL">
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                  <Toggle value={isOn} onChange={(v) => toggleBuiltin.mutate({ id: s.id, val: v })} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CUSTOM SERVERS */}
      {customSrvs.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Server Custom ({customSrvs.length})</p>
          <div className="space-y-2">
            {customSrvs.map((s) => (
              <div key={s.id} className={`${card} px-4 py-3 ${s.active ? "" : "opacity-50"}`}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{s.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-gray-600 text-[9px] font-mono truncate max-w-[180px]">{s.url}</p>
                      <CopyBtn text={s.url} />
                      <a href={resolveUrl(s.url, SAMPLE_MOVIE_ID)} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-yellow-400" title="Test"><ExternalLink size={10} /></a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Toggle value={s.active} onChange={(v) => toggleCustom.mutate({ id: s.id, active: v })} />
                    <button onClick={() => openEdit(s)} className="text-gray-500 hover:text-yellow-400 p-1"><Pencil size={14} /></button>
                    <button onClick={() => { if (confirm(`Hapus server "${s.name}"?`)) delSrv.mutate(s.id); }} className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD / EDIT FORM */}
      {(addOpen || editSrv) && (
        <div className={`${card} p-5 space-y-4 border-yellow-400/20`}>
          <div className="flex items-center justify-between">
            <p className="text-white font-black">{editSrv ? "Edit Server" : "Tambah Server Custom"}</p>
            <button onClick={closeForm} className="text-gray-500 hover:text-white"><X size={16}/></button>
          </div>

          <Field label="Nama Server">
            <input className={inp} value={srvName} onChange={e => setSrvName(e.target.value)} placeholder="Contoh: Server Saya" />
          </Field>

          <Field label="URL Template — Movie" hint="Gunakan {id} untuk TMDB ID film">
            <input className={inp} value={srvMovieUrl} onChange={e => setSrvMovieUrl(e.target.value)} placeholder="https://example.com/embed/movie/{id}" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {URL_VARS.slice(0, 3).map(v => (
                <button key={v} type="button" onClick={() => setSrvMovieUrl(prev => prev + v)} className="bg-[#1e2535] text-[10px] px-2 py-1 rounded text-yellow-400 border border-white/5 hover:border-yellow-400/30 font-mono">{v}</button>
              ))}
            </div>
          </Field>

          <Field label="URL Template — TV Show (opsional)" hint="Kosongkan jika sama dengan Movie URL. Gunakan {s} = season, {e} = episode">
            <input className={inp} value={srvTvUrl} onChange={e => setSrvTvUrl(e.target.value)} placeholder="https://example.com/embed/tv/{id}/{s}/{e}" />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {URL_VARS.map(v => (
                <button key={v} type="button" onClick={() => setSrvTvUrl(prev => prev + v)} className="bg-[#1e2535] text-[10px] px-2 py-1 rounded text-yellow-400 border border-white/5 hover:border-yellow-400/30 font-mono">{v}</button>
              ))}
            </div>
          </Field>

          {/* URL Preview */}
          {srvMovieUrl && (
            <div className="bg-[#0d1117] rounded-lg p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Preview URL</p>
                <div className="flex gap-1">
                  {(["movie", "tv"] as const).map(t => (
                    <button key={t} onClick={() => setPreviewType(t)} className={`text-[9px] px-2 py-0.5 rounded font-bold ${previewType === t ? "bg-yellow-400 text-black" : "bg-white/5 text-gray-500"}`}>{t.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <p className="text-gray-400 text-[10px] font-mono break-all leading-relaxed">{previewUrl || "—"}</p>
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 text-yellow-400 text-[10px] font-bold hover:underline">
                  <ExternalLink size={10} /> Test URL sekarang
                </a>
              )}
            </div>
          )}

          <button
            onClick={() => editSrv ? updateSrv.mutate() : addSrv.mutate()}
            disabled={(editSrv ? updateSrv.isPending : addSrv.isPending) || !srvName.trim() || !srvMovieUrl.trim()}
            className={`${yaBtn} w-full flex items-center justify-center gap-2`}
          >
            {(editSrv ? updateSrv.isPending : addSrv.isPending) ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {editSrv ? "Update Server" : "Simpan Server"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* TAMBAH TAB — diperbaiki dengan server picker              */
/* ══════════════════════════════════════════════════════════ */
type AddSubTab = "cari" | "id" | "pilihan";
type TmdbItem = TmdbListItem & { imdb_id?: string };

type FilmForm = {
  title: string; description: string; posterUrl: string; backdropUrl: string;
  year: string; embedUrl: string; type: "movie" | "series"; tmdbId: string; imdbId: string;
};
const emptyFilm: FilmForm = {
  title: "", description: "", posterUrl: "", backdropUrl: "",
  year: "", embedUrl: "", type: "movie", tmdbId: "", imdbId: "",
};

function buildEmbedUrl(serverId: string, tmdbId: string, type: "movie" | "series") {
  const srv = ALL_BUILTIN.find(s => s.id === serverId);
  if (!srv) return "";
  const template = type === "movie" ? srv.movieUrl : srv.tvUrl;
  return template.replace(/\{id\}/g, tmdbId).replace(/\{type\}/g, type === "movie" ? "movie" : "tv");
}

function TambahTab() {
  const qc = useQueryClient();
  const [sub, setSub]         = useState<AddSubTab>("cari");
  const [mediaType, setMt]    = useState<"movie" | "tv">("movie");
  const [q, setQ]             = useState("");
  const [results, setResults] = useState<TmdbItem[]>([]);
  const [loading, setLd]      = useState(false);
  const [selected, setSel]    = useState<TmdbItem | null>(null);
  const [form, setForm]       = useState<FilmForm>({ ...emptyFilm });
  const [idInput, setIdInput] = useState("");
  const [saved, setSaved]     = useState(false);
  const [selectedServer, setSelectedServer] = useState<string>("vidplus");
  const formRef = useRef<HTMLDivElement>(null);

  const applyItem = (item: TmdbItem) => {
    setSel(item);
    const type = item.media_type === "tv" ? "series" : "movie";
    const tmdbId = String(item.id);
    const embedUrl = buildEmbedUrl(selectedServer, tmdbId, type);
    setForm({
      title:       item.title ?? item.name ?? "",
      description: item.overview ?? "",
      posterUrl:   item.poster_path   ? `${IMG}/w500${item.poster_path}`       : "",
      backdropUrl: item.backdrop_path ? `${IMG}/original${item.backdrop_path}` : "",
      year:        (item.release_date ?? item.first_air_date ?? "").slice(0, 4),
      type, tmdbId, imdbId: item.imdb_id ?? "", embedUrl,
    });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleServerChange = (serverId: string) => {
    setSelectedServer(serverId);
    if (form.tmdbId) {
      setForm(f => ({ ...f, embedUrl: buildEmbedUrl(serverId, f.tmdbId, f.type) }));
    }
  };

  const doSearch = async () => {
    if (!q.trim()) return;
    setLd(true); setResults([]); setSel(null);
    try {
      const res = await tmdb.search(q.trim());
      const filtered = res.results.filter((r) => mediaType === "movie" ? r.media_type === "movie" : r.media_type === "tv");
      setResults(filtered.slice(0, 12));
    } catch { /* ignore */ }
    finally { setLd(false); }
  };

  const doFetchId = async () => {
    if (!idInput.trim()) return;
    setLd(true); setSel(null);
    try {
      const isImdb = idInput.trim().toLowerCase().startsWith("tt");
      let item: TmdbItem;
      if (isImdb) {
        const res: TmdbFindResult = await tmdb.findByImdb(idInput.trim());
        const raw = res.movie_results[0] ?? res.tv_results[0];
        if (!raw) throw new Error();
        item = { ...raw, media_type: res.movie_results[0] ? "movie" : "tv", imdb_id: idInput.trim() };
      } else {
        const num = Number(idInput.trim());
        const res = mediaType === "tv" ? await tmdb.tvDetail(num) : await tmdb.movieDetail(num);
        item = {
          id: res.id,
          title: "title" in res ? res.title : undefined,
          name:  "name"  in res ? res.name  : undefined,
          overview: res.overview,
          poster_path: res.poster_path,
          backdrop_path: res.backdrop_path,
          release_date:   "release_date"    in res ? res.release_date    : undefined,
          first_air_date: "first_air_date"  in res ? res.first_air_date  : undefined,
          media_type: mediaType === "tv" ? "tv" : "movie",
          imdb_id: "imdb_id" in res ? (res as { imdb_id?: string }).imdb_id : undefined,
        };
      }
      applyItem(item);
    } catch { alert("Tidak ditemukan. Cek ID-nya."); }
    finally { setLd(false); }
  };

  const { data: trending = [] } = useQuery<TmdbItem[]>({
    queryKey: ["trending_all"],
    queryFn: async () => { const r = await tmdb.trending("all", "week"); return r.results.slice(0, 18); },
    staleTime: 1000 * 60 * 10,
  });

  const save = useMutation({
    mutationFn: () => fb.addCustomMovie({
      title: form.title, description: form.description || undefined,
      posterUrl: form.posterUrl || undefined, backdropUrl: form.backdropUrl || undefined,
      year: form.year ? Number(form.year) : undefined,
      embedUrl: form.embedUrl?.trim() || buildEmbedUrl("vidplus", form.tmdbId, form.type),
      type: form.type, tmdbId: form.tmdbId ? Number(form.tmdbId) : undefined, imdbId: form.imdbId || undefined,
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["custom_movies"] });
      setForm({ ...emptyFilm }); setSel(null); setResults([]);
      setQ(""); setIdInput(""); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="pb-4">
      <h2 className="text-yellow-400 text-xl font-black mb-4">Tambah Film / Series</h2>

      <div className="flex bg-[#161b27] rounded-xl p-1 mb-5 border border-white/[0.08]">
        {(["cari", "id", "pilihan"] as AddSubTab[]).map((t) => (
          <button key={t} onClick={() => { setSub(t); setSel(null); setResults([]); }}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${sub === t ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}>
            {t === "cari" ? "🔍 Cari" : t === "id" ? "🔢 ID Manual" : "🔥 Trending"}
          </button>
        ))}
      </div>

      {sub === "cari" && (
        <div className="flex gap-2 mb-4">
          <select value={mediaType} onChange={(e) => setMt(e.target.value as "movie" | "tv")} className="bg-[#1e2535] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500 flex-shrink-0">
            <option value="movie">🎬 Film</option>
            <option value="tv">📺 Series</option>
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="Judul film/series..." className={`${inp} flex-1`} />
          <button onClick={doSearch} disabled={loading} className={`${yaBtn} flex-shrink-0 flex items-center gap-1.5`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
      )}

      {sub === "id" && (
        <div className="mb-5 space-y-3">
          <div className="flex gap-2">
            <select value={mediaType} onChange={(e) => setMt(e.target.value as "movie" | "tv")} className="bg-[#1e2535] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500 flex-shrink-0">
              <option value="movie">🎬 Film</option>
              <option value="tv">📺 Series</option>
            </select>
            <input value={idInput} onChange={(e) => setIdInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doFetchId()} placeholder="TMDB ID atau IMDB ID (tt...)" className={`${inp} flex-1`} />
            <button onClick={doFetchId} disabled={loading} className={`${yaBtn} flex-shrink-0`}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Fetch"}
            </button>
          </div>
          <div className={`${card} p-3 bg-yellow-400/5 border-yellow-400/20`}>
            <p className="text-yellow-400 text-[10px] font-bold mb-1">💡 Tips mencari TMDB ID</p>
            <p className="text-gray-500 text-[10px]">Buka <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="text-blue-400 underline">themoviedb.org</a>, cari film, lalu lihat angka di URL-nya. Contoh: /movie/<span className="text-white font-bold">550</span></p>
          </div>
        </div>
      )}

      {/* Grid hasil pencarian / trending */}
      {(results.length > 0 || sub === "pilihan") && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-5">
          {(sub === "pilihan" ? trending : results).map((r) => (
            <button key={r.id} onClick={() => applyItem(r)} className={`text-left rounded-xl overflow-hidden border-2 transition-all ${selected?.id === r.id ? "border-yellow-400 scale-95" : "border-transparent hover:border-white/20"}`}>
              <div className="aspect-[2/3] bg-[#1e2535]">{r.poster_path ? <img src={`${IMG}/w185${r.poster_path}`} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-gray-700" /></div>}</div>
              <div className="p-1.5"><p className="text-white text-xs font-semibold truncate leading-tight">{r.title ?? r.name}</p><p className="text-gray-500 text-[10px]">{(r.release_date ?? r.first_air_date ?? "").slice(0,4)}</p></div>
            </button>
          ))}
        </div>
      )}

      {/* Form setelah pilih item */}
      {selected && (
        <div ref={formRef} className={`${card} p-5 mt-2 space-y-5`}>
          {/* Header */}
          <div className="flex items-start gap-4">
            {selected.poster_path && <img src={`${IMG}/w154${selected.poster_path}`} alt="" className="w-14 rounded-lg object-cover flex-shrink-0 shadow-lg" />}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base leading-tight">{selected.title ?? selected.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">TMDB ID: <span className="text-yellow-400 font-mono">{form.tmdbId}</span></p>
              <div className="flex gap-1.5 mt-1.5">
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${form.type === "movie" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                  {form.type === "movie" ? "🎬 Movie" : "📺 Series"}
                </span>
                {form.year && <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-white/5 text-gray-400">{form.year}</span>}
              </div>
            </div>
            <button onClick={() => { setSel(null); setForm({ ...emptyFilm }); }} className="text-gray-500 hover:text-white flex-shrink-0"><X className="w-5 h-5" /></button>
          </div>

          {/* ── PILIH SERVER ── */}
          <div>
            <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2">🎥 Pilih Server Streaming</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_BUILTIN.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleServerChange(s.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${selectedServer === s.id ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-[#1e2535] hover:border-white/20"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${selectedServer === s.id ? "text-yellow-400" : "text-white"}`}>{s.name}</p>
                  </div>
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: s.badgeColor + "33", color: s.badgeColor }}>{s.badge}</span>
                  {selectedServer === s.id && <Check size={12} className="text-yellow-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Preview embed URL */}
          {form.embedUrl && (
            <div className="bg-[#0d1117] rounded-lg p-3 border border-white/5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Embed URL</p>
                <div className="flex gap-1">
                  <CopyBtn text={form.embedUrl} />
                  <a href={form.embedUrl} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-yellow-400 p-1" title="Test"><ExternalLink size={12} /></a>
                </div>
              </div>
              <p className="text-gray-400 text-[9px] font-mono break-all">{form.embedUrl}</p>
            </div>
          )}

          {/* URL manual override */}
          <Field label="URL Override (opsional)" hint="Kosongkan untuk pakai URL dari server yang dipilih. Isi jika punya link embed khusus.">
            <input
              className={`${inp} font-mono text-xs`}
              value={form.embedUrl}
              onChange={(e) => setForm({ ...form, embedUrl: e.target.value })}
              placeholder="https://..."
            />
          </Field>

          {/* Simpan */}
          <button onClick={() => save.mutate()} disabled={save.isPending || !form.title.trim()} className={`${yaBtn} w-full flex items-center justify-center gap-2`}>
            {save.isPending ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16}/> : <Plus size={16} />}
            {saved ? "✓ Tersimpan!" : "Simpan ke Daftar"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* DAFTAR TAB                                               */
/* ══════════════════════════════════════════════════════════ */
type DaftarSub = "film" | "episode";

function DaftarTab() {
  const qc = useQueryClient();
  const [sub, setSub] = useState<DaftarSub>("film");
  const [epFilter, setEpFilter] = useState("");

  const { data: movies = [], isLoading: ldM } = useQuery<CustomMovie[]>({ queryKey: ["custom_movies"], queryFn: fb.getCustomMovies });
  const { data: episodes = [], isLoading: ldE } = useQuery<SeriesEpisode[]>({ queryKey: ["series_episodes"], queryFn: fb.getSeriesEpisodes });

  const delMovie = useMutation({ mutationFn: (id: string) => fb.deleteCustomMovie(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_movies"] }) });
  const toggleEp = useMutation({ mutationFn: ({ id, active }: { id: string; active: boolean }) => fb.updateSeriesEpisode(id, { active }), onSuccess: () => qc.invalidateQueries({ queryKey: ["series_episodes"] }) });

  const grouped = episodes.reduce<Record<string, SeriesEpisode[]>>((acc, ep) => {
    const k = `${ep.tmdbId}`;
    if (!acc[k]) acc[k] = [];
    acc[k].push(ep);
    return acc;
  }, {});

  const filteredGroups = Object.entries(grouped).filter(([, eps]) =>
    !epFilter || eps[0]?.seriesTitle?.toLowerCase().includes(epFilter.toLowerCase())
  );

  return (
    <div className="pb-4">
      <div className="flex bg-[#161b27] rounded-xl p-1 mb-5 border border-white/[0.08]">
        <button onClick={() => setSub("film")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${sub === "film" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}>
          🎬 Film / Series {movies.length > 0 && <span className="ml-1 opacity-60">({movies.length})</span>}
        </button>
        <button onClick={() => setSub("episode")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${sub === "episode" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}>
          📺 Episodes {episodes.length > 0 && <span className="ml-1 opacity-60">({episodes.length})</span>}
        </button>
      </div>

      {sub === "film" && (
        ldM ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-yellow-400"/></div> :
        movies.length === 0 ? (
          <div className={`${card} p-8 text-center`}>
            <Film className="mx-auto mb-2 text-gray-700" size={32} />
            <p className="text-gray-500 text-sm">Belum ada film tersimpan</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3">
            {movies.map((m) => (
              <div key={m.id} className={`${card} overflow-hidden group`}>
                <div className="aspect-[2/3] bg-[#1e2535] relative">
                  {m.posterUrl && <img src={m.posterUrl} alt="" className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                    {m.tmdbId && (
                      <a href={`/${m.type === "movie" ? "movie" : "tv"}/${m.tmdbId}`} target="_blank" rel="noreferrer" className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center"><Play size={14} /></a>
                    )}
                    <button onClick={() => confirm(`Hapus "${m.title}"?`) && delMovie.mutate(m.id)} className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center"><Trash2 size={14} /></button>
                  </div>
                  <div className="absolute top-1.5 left-1.5">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${m.type === "movie" ? "bg-blue-600" : "bg-purple-600"} text-white`}>{m.type === "movie" ? "FILM" : "SERIES"}</span>
                  </div>
                </div>
                <p className="px-2 pt-1.5 pb-1 text-white text-[10px] font-bold truncate">{m.title}</p>
                {m.year && <p className="px-2 pb-1.5 text-gray-600 text-[9px]">{m.year}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {sub === "episode" && (
        <div className="space-y-4">
          <input value={epFilter} onChange={e => setEpFilter(e.target.value)} placeholder="Filter series..." className={inp} />
          {ldE ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-yellow-400"/></div> :
           filteredGroups.length === 0 ? (
            <div className={`${card} p-8 text-center`}>
              <p className="text-gray-500 text-sm">Belum ada episode tersimpan</p>
            </div>
          ) : filteredGroups.map(([tmdbId, eps]) => (
            <div key={tmdbId} className={card + " overflow-hidden"}>
              <div className="px-4 py-2 border-b border-white/5 bg-white/5 font-bold text-sm flex items-center justify-between">
                <span>{eps[0]?.seriesTitle}</span>
                <span className="text-gray-600 text-[10px] font-normal">{eps.length} episode</span>
              </div>
              <div className="grid grid-cols-2 divide-y divide-white/5">
                {eps.map(ep => (
                  <div key={ep.id} className="px-4 py-2 flex justify-between items-center text-xs border-r border-white/5">
                    <span className="text-gray-300 font-mono">S{ep.season}E{ep.episode}</span>
                    <Toggle value={ep.active} onChange={(v) => toggleEp.mutate({ id: ep.id, active: v })} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* TEMA TAB                                                  */
/* ══════════════════════════════════════════════════════════ */
function TemaTab() {
  const qc = useQueryClient();
  const { data: settings, isLoading: loadingSettings } = useQuery({ queryKey: ["settings"], queryFn: fb.getSettings });

  const [form, setForm] = useState({
    siteTitle: "", playerColor: "E50914", autoplay: "true",
    announcementActive: "false", announcement: "",
    maintenanceMode: "false", maintenanceMessage: "Sedang dalam pemeliharaan. Silakan kembali lagi nanti. 🔧",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      siteTitle:          settings.siteTitle          || "",
      playerColor:        (settings.playerColor        || "E50914").replace("#", ""),
      autoplay:           settings.autoplay            !== "false" ? "true" : "false",
      announcementActive: settings.announcementActive  || "false",
      announcement:       settings.announcement        || "",
      maintenanceMode:    settings.maintenanceMode     || "false",
      maintenanceMessage: settings.maintenanceMessage  || "Sedang dalam pemeliharaan. Silakan kembali lagi nanti. 🔧",
    });
  }, [settings]);

  const save = useMutation({
    mutationFn: () => fb.setSettings({ ...settings, ...form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); setSaved(true); setTimeout(() => setSaved(false), 2500); },
  });

  const [oldPw, setOldPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confPw, setConfPw] = useState("");
  const [showOld, setShowOld] = useState(false); const [showNew, setShowNew] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const changePw = async () => {
    setPwMsg(null);
    if (!oldPw || !newPw || !confPw) { setPwMsg({ text: "Semua field harus diisi.", ok: false }); return; }
    if (newPw !== confPw) { setPwMsg({ text: "Password baru tidak cocok.", ok: false }); return; }
    if (newPw.length < 6) { setPwMsg({ text: "Password minimal 6 karakter.", ok: false }); return; }
    setPwLoading(true);
    try {
      const oldHash = await hashPassword(oldPw);
      const stored  = await fb.getPasswordHash();
      if (!stored || oldHash !== stored) { setPwMsg({ text: "Password lama salah.", ok: false }); return; }
      const newHash = await hashPassword(newPw);
      await fb.setPasswordHash(newHash); setToken(newHash);
      setPwMsg({ text: "Password berhasil diubah! ✓", ok: true });
      setOldPw(""); setNewPw(""); setConfPw("");
    } catch { setPwMsg({ text: "Gagal menyimpan. Coba lagi.", ok: false }); }
    finally { setPwLoading(false); }
  };

  const colorHex = `#${form.playerColor.replace("#", "").padEnd(6, "0").slice(0, 6)}`;
  if (loadingSettings) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-yellow-400" /></div>;

  return (
    <div className="pb-6 space-y-5">
      <h2 className="text-yellow-400 text-xl font-black">Tema & Pengaturan</h2>
      <div className={card + " p-5 space-y-4"}>
        <p className="text-white font-black text-sm">🎨 Tampilan</p>
        <Field label="Nama Situs"><input className={inp} value={form.siteTitle} onChange={e => setForm({ ...form, siteTitle: e.target.value })} placeholder="XpoGo" /></Field>
        <Field label="Warna Aksen Player" hint="Warna tombol & aksen Peachify player (hex tanpa #)">
          <div className="flex gap-3 items-center">
            <input type="color" value={colorHex} onChange={e => setForm({ ...form, playerColor: e.target.value.replace("#", "") })} className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent p-0.5" />
            <input className={`${inp} flex-1 font-mono uppercase`} value={form.playerColor} onChange={e => setForm({ ...form, playerColor: e.target.value.replace("#", "").slice(0, 6) })} placeholder="E50914" maxLength={6} />
            <div className="w-10 h-10 rounded-lg border border-white/10 flex-shrink-0" style={{ background: colorHex }} />
          </div>
        </Field>
      </div>

      <div className={card + " p-5 space-y-4"}>
        <p className="text-white font-black text-sm">⚙️ Player</p>
        <div className="flex items-center justify-between">
          <div><p className="text-white text-sm font-bold">Autoplay Video</p><p className="text-gray-500 text-[11px]">Video langsung putar saat halaman dibuka</p></div>
          <Toggle value={form.autoplay === "true"} onChange={v => setForm({ ...form, autoplay: v ? "true" : "false" })} />
        </div>
      </div>

      <div className={card + " p-5 space-y-4"}>
        <div className="flex items-center justify-between">
          <div><p className="text-white font-black text-sm">📢 Banner Pengumuman</p><p className="text-gray-500 text-[11px]">Tampilkan notifikasi di bagian atas website</p></div>
          <Toggle value={form.announcementActive === "true"} onChange={v => setForm({ ...form, announcementActive: v ? "true" : "false" })} />
        </div>
        {form.announcementActive === "true" && (
          <Field label="Teks Pengumuman">
            <textarea className={`${inp} resize-none`} rows={2} value={form.announcement} onChange={e => setForm({ ...form, announcement: e.target.value })} placeholder="Contoh: Server sedang dalam perbaikan..." />
          </Field>
        )}
      </div>

      <div className={`${card} p-5 space-y-4 ${form.maintenanceMode === "true" ? "border-orange-500/40 bg-orange-500/5" : ""}`}>
        <div className="flex items-center justify-between">
          <div><p className="text-white font-black text-sm">🔧 Mode Maintenance</p><p className="text-gray-500 text-[11px]">Semua halaman tampilkan pesan maintenance</p></div>
          <Toggle value={form.maintenanceMode === "true"} onChange={v => setForm({ ...form, maintenanceMode: v ? "true" : "false" })} />
        </div>
        {form.maintenanceMode === "true" && (
          <>
            <div className="flex items-center gap-2 text-orange-400 text-xs font-bold bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">⚠️ Mode Maintenance AKTIF — Website tidak bisa diakses user!</div>
            <Field label="Pesan Maintenance"><textarea className={`${inp} resize-none`} rows={2} value={form.maintenanceMessage} onChange={e => setForm({ ...form, maintenanceMessage: e.target.value })} /></Field>
          </>
        )}
      </div>

      <button onClick={() => save.mutate()} disabled={save.isPending} className={`${yaBtn} w-full flex items-center justify-center gap-2`}>
        {save.isPending ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
        {saved ? "Tersimpan! ✓" : "Simpan Semua Pengaturan"}
      </button>

      <div className={card + " p-5 space-y-4"}>
        <p className="text-white font-black text-sm">🔐 Ganti Password Admin</p>
        <Field label="Password Lama">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type={showOld ? "text" : "password"} className={`${inp} pl-10 pr-10`} value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="Password saat ini" />
            <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showOld ? <EyeOff size={14} /> : <Eye size={14} />}</button>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password Baru">
            <div className="relative">
              <input type={showNew ? "text" : "password"} className={`${inp} pr-10`} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 karakter" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showNew ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
          </Field>
          <Field label="Konfirmasi Password"><input type="password" className={inp} value={confPw} onChange={e => setConfPw(e.target.value)} placeholder="Ulangi password baru" /></Field>
        </div>
        {pwMsg && <p className={`text-xs font-bold px-3 py-2 rounded-lg ${pwMsg.ok ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>{pwMsg.text}</p>}
        <button onClick={changePw} disabled={pwLoading || !oldPw || !newPw || !confPw} className={`${yaBtn} w-full flex items-center justify-center gap-2`}>
          {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />} Ganti Password
        </button>
      </div>
    </div>
  );
}

/* ── BUILD TAB ──────────────────────────────────────────── */
function BuildTab() {
  return (
    <div className="pb-8 space-y-5">
      <h2 className="text-yellow-400 text-xl font-black">Build APK Android</h2>
      <div className={card + " p-4"}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-400/15 rounded-xl flex items-center justify-center"><Smartphone className="text-yellow-400"/></div>
          <div><p className="font-bold text-white">EAS Expo Build</p><p className="text-gray-500 text-xs">Build & deploy APK Android</p></div>
        </div>
        <a href="https://expo.dev/accounts/pendi55/projects/xpogo-mobile/builds" target="_blank" rel="noreferrer" className={yaBtn + " w-full block text-center"}>Lihat Build Terbaru</a>
      </div>
      <div className={card + " p-4 bg-blue-500/5 border-blue-500/20"}>
        <p className="text-blue-400 text-xs font-bold mb-2">ℹ️ Sinkronisasi Otomatis</p>
        <p className="text-gray-500 text-[11px] leading-relaxed">Server, iklan, dan pengaturan tersimpan di Firebase dan langsung tersinkron ke APK tanpa perlu rebuild.</p>
      </div>
    </div>
  );
}

/* ── MAIN ADMIN ─────────────────────────────────────────── */
const NAV: { id: NavTab; label: string; icon: any; special?: boolean }[] = [
  { id: "daftar",  label: "Daftar",  icon: LayoutList },
  { id: "tambah",  label: "Tambah",  icon: Plus, special: true },
  { id: "server",  label: "Server",  icon: Server },
  { id: "iklan",   label: "Iklan",   icon: Megaphone },
  { id: "tema",    label: "Tema",    icon: Palette },
  { id: "build",   label: "Build",   icon: Smartphone },
];

export default function AdminPage() {
  const [loggedIn, setLI] = useState(false);
  const [verifying, setV] = useState(true);
  const [tab, setTab]     = useState<NavTab>("tambah");
  const qc = useQueryClient();

  useEffect(() => {
    const token = getToken();
    if (!token) { setV(false); return; }
    fb.getPasswordHash().then((hash) => { if (hash && token === hash) setLI(true); else clearToken(); }).finally(() => setV(false));
  }, []);

  if (verifying) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!loggedIn) return <LoginPage onLogin={() => setLI(true)} />;

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col text-white">
      <div className="bg-[#0d1117] border-b border-white/[0.08] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-yellow-400 rounded-lg flex items-center justify-center"><Tv size={14} className="text-black" /></div>
          <h1 className="text-yellow-400 font-black text-lg">XpoGo Admin</h1>
        </div>
        <button onClick={() => { clearToken(); setLI(false); qc.clear(); }} className="text-red-500 p-2 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors">
          <LogOut size={18}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-28">
        {tab === "daftar" && <DaftarTab />}
        {tab === "tambah" && <TambahTab />}
        {tab === "server" && <ServerTab />}
        {tab === "iklan"  && <IklanTab />}
        {tab === "tema"   && <TemaTab />}
        {tab === "build"  && <BuildTab />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#0d1117] border-t border-white/[0.08] z-20 flex justify-around items-end pb-4 pt-2" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setTab(n.id)} className={`flex flex-col items-center transition-all ${tab === n.id ? "text-yellow-400 scale-110" : "text-gray-600"}`}>
            {n.special ? (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center -mb-2 border-4 border-[#0d1117] ${tab === n.id ? "bg-yellow-400 text-black" : "bg-[#1e2535] text-white"}`}>
                <n.icon size={24} />
              </div>
            ) : (
              <>
                <n.icon size={20} />
                <span className="text-[9px] font-bold mt-1 uppercase">{n.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
