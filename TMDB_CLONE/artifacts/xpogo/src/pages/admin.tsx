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
  Pencil, Search, Check, X, Loader2, ListVideo, Film,
  LayoutList, Server, Palette, MessageSquare, Phone,
  Megaphone, ChevronRight, Link2, AlignJustify, Smartphone,
  ExternalLink, Github, Package, RefreshCw, CheckCircle2,
  Globe, MonitorSmartphone, Video, Layers, PanelTop, PanelBottom,
  MousePointerClick, Share2, SquarePlay, Maximize2, ChevronDown, ChevronUp,
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

/* ── BUILTIN SERVERS ─────────────────────────────────────── */
const BUILTIN = [
  { id: "myvercel",  name: "Server Utama (No Ads)", url: "https://myvercel-player.vercel.app/embed/{type}/{id}" },
  { id: "vidking",   name: "ZxcStream",             url: "https://vidking.xyz/embed/{type}/{id}" },
  { id: "vidsrc",    name: "VidSrc",                url: "https://vidsrc.to/embed/{type}/{id}" },
  { id: "vidsrcxyz", name: "VidSrc.xyz",            url: "https://vidsrc.xyz/embed/{type}/{id}" },
];
const DEFAULT_EMBED_URL = BUILTIN[0]?.url ?? "https://myvercel-player.vercel.app/embed/{type}/{id}";

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

function PositionDiagram({ type }: { type: AdType }) {
  const base = "w-full rounded-lg border border-white/10 bg-[#0d1117] overflow-hidden flex flex-col";
  const bar  = "bg-yellow-400/30 border border-yellow-400/40 flex items-center justify-center text-yellow-400 text-[9px] font-bold uppercase tracking-widest";

  if (type === "banner-top") return (
    <div className={base} style={{ height: 80 }}>
      <div className={bar} style={{ height: 18 }}>Banner Atas</div>
      <div className="flex-1 bg-white/5 flex items-center justify-center"><p className="text-gray-700 text-[10px]">Konten</p></div>
    </div>
  );
  if (type === "banner-bottom") return (
    <div className={base} style={{ height: 80 }}>
      <div className="flex-1 bg-white/5 flex items-center justify-center"><p className="text-gray-700 text-[10px]">Konten</p></div>
      <div className={bar} style={{ height: 18 }}>Banner Bawah</div>
    </div>
  );
  if (type === "social-bar") return (
    <div className={`${base} relative`} style={{ height: 80 }}>
      <div className="flex-1 bg-white/5 flex items-center justify-center"><p className="text-gray-700 text-[10px]">Konten</p></div>
      <div className={`${bar} absolute bottom-0 left-0 right-0`} style={{ height: 16 }}>Social Bar (melayang)</div>
    </div>
  );
  if (type === "popunder") return (
    <div className={base} style={{ height: 80 }}>
      <div className="flex-1 bg-white/5 flex items-center justify-center relative">
        <div className="absolute inset-2 bg-[#1e2535] rounded border border-white/5 flex items-center justify-center z-10"><p className="text-gray-600 text-[9px]">Halaman Utama</p></div>
        <div className="absolute inset-0 border-2 border-dashed border-orange-400/40 rounded flex items-end justify-end p-1"><p className="text-orange-400/60 text-[8px]">Pop di belakang</p></div>
      </div>
    </div>
  );
  if (type === "native-video") return (
    <div className={base} style={{ height: 80 }}>
      <div className="bg-white/5 h-6 flex items-center px-2"><div className="w-2 h-1 rounded-full bg-white/20 mr-1"/><div className="w-8 h-1 rounded-full bg-white/10"/></div>
      <div className={bar} style={{ height: 30 }}>▶ Video Iklan (dalam konten)</div>
      <div className="bg-white/5 flex-1 flex items-center px-2"><div className="w-12 h-1 rounded-full bg-white/10"/></div>
    </div>
  );
  if (type === "interstitial") return (
    <div className={base} style={{ height: 80 }}>
      <div className="flex-1 flex flex-col items-center justify-center bg-black/60 gap-1">
        <div className={`${bar} w-3/4 rounded`} style={{ height: 36, padding: 4 }}>Interstitial<br/><span className="text-[8px] font-normal opacity-60">Layar penuh</span></div>
        <div className="text-[9px] text-gray-600">Tutup dalam 5s...</div>
      </div>
    </div>
  );
  return null;
}

/* ══════════════════════════════════════════════════════════ */
/* IKLAN TAB                                                 */
/* ══════════════════════════════════════════════════════════ */
type IklanSub = "semua" | AdType;

const emptyAd = (): Omit<Ad, "id"> => ({
  type: "banner-top",
  label: "",
  code: "",
  active: true,
  platform: "both",
  delay: 0,
  frequency: 1,
  adMobId: "",
  size: "responsive",
});

function IklanTab() {
  const qc = useQueryClient();
  const [sub, setSub]         = useState<IklanSub>("semua");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState<Omit<Ad, "id">>(emptyAd());

  const { data: ads = [], isLoading } = useQuery<Ad[]>({ queryKey: ["ads"], queryFn: fb.getAds });

  const addAd = useMutation({
    mutationFn: () => fb.addAd(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ads"] }); setShowForm(false); setForm(emptyAd()); setEditId(null); },
  });

  const updateAd = useMutation({
    mutationFn: () => fb.updateAd(editId!, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ads"] }); setShowForm(false); setForm(emptyAd()); setEditId(null); },
  });

  const deleteAd = useMutation({
    mutationFn: (id: string) => fb.deleteAd(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads"] }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => fb.updateAd(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ads"] }),
  });

  const filtered = sub === "semua" ? ads : ads.filter((a) => a.type === sub);

  const openEdit = (ad: Ad) => {
    setEditId(ad.id);
    setForm({ type: ad.type, label: ad.label, code: ad.code, active: ad.active, platform: ad.platform ?? "both", delay: ad.delay ?? 0, frequency: ad.frequency ?? 1, adMobId: ad.adMobId ?? "", size: ad.size ?? "responsive" });
    setShowForm(true);
  };

  const openNew = (type?: AdType) => {
    setEditId(null);
    setForm({ ...emptyAd(), type: type ?? "banner-top" });
    setShowForm(true);
  };

  const SUBS: { id: IklanSub; label: string }[] = [
    { id: "semua",       label: "Semua" },
    { id: "banner-top",  label: "Atas" },
    { id: "banner-bottom", label: "Bawah" },
    { id: "popunder",    label: "Pop-under" },
    { id: "social-bar",  label: "Social Bar" },
    { id: "native-video", label: "Video" },
    { id: "interstitial", label: "Interstitial" },
  ];

  const isPending = addAd.isPending || updateAd.isPending;

  return (
    <div className="pb-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-yellow-400 text-xl font-black">Ads Manager</h2>
        <button onClick={() => openNew()} className={`${yaBtn} flex items-center gap-1.5 py-2`}>
          <Plus size={14} /> Tambah
        </button>
      </div>

      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="flex gap-1.5 min-w-max">
          {SUBS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSub(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${sub === s.id ? "bg-yellow-400 text-black" : "bg-[#1e2535] text-gray-400 hover:text-white"}`}
            >
              {s.label}
              {s.id !== "semua" && (
                <span className="ml-1.5 opacity-60">{ads.filter((a) => a.type === s.id).length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quick add buttons */}
      {sub === "semua" && !showForm && (
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(AD_META) as AdType[]).map((t) => (
            <button
              key={t}
              onClick={() => openNew(t)}
              className={`${card} flex items-center gap-2.5 px-3 py-2.5 text-left border hover:border-yellow-400/30 transition-colors`}
            >
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${AD_META[t].colorClass}`}>
                {AD_META[t].icon}
              </span>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{AD_META[t].label}</p>
                <p className="text-gray-600 text-[10px] truncate">{AD_META[t].desc}</p>
              </div>
              <Plus size={12} className="text-gray-600 flex-shrink-0 ml-auto" />
            </button>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className={`${card} p-5 space-y-4`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-white font-black">{editId ? "Edit Iklan" : "Tambah Iklan"}</p>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(emptyAd()); }} className="text-gray-500 hover:text-white"><X size={18}/></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama Iklan">
              <input className={inp} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Contoh: Banner Atas Utama" />
            </Field>
            <Field label="Tipe Iklan">
              <select className={inp} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AdType })}>
                {(Object.keys(AD_META) as AdType[]).map((t) => (
                  <option key={t} value={t}>{AD_META[t].label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Position Diagram */}
          <div>
            <p className="text-yellow-400 text-xs font-bold mb-2 uppercase tracking-widest">Posisi Iklan</p>
            <PositionDiagram type={form.type} />
            <p className="text-gray-500 text-[10px] mt-1.5">{AD_META[form.type].desc} — {AD_META[form.type].platformNote}</p>
          </div>

          {/* Platform */}
          <Field label="Platform">
            <div className="flex gap-2">
              {(["web", "apk", "both"] as Platform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, platform: p })}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${form.platform === p ? "bg-yellow-400 text-black border-yellow-400" : "bg-[#1e2535] text-gray-400 border-white/10 hover:text-white"}`}
                >
                  {p === "web" ? "🌐 Web" : p === "apk" ? "📱 APK" : "✅ Keduanya"}
                </button>
              ))}
            </div>
          </Field>

          {/* Size preset for banners */}
          {(form.type === "banner-top" || form.type === "banner-bottom") && (
            <Field label="Ukuran Banner" hint="Pilih ukuran sesuai kode iklan dari jaringan iklanmu">
              <select className={inp} value={form.size ?? "responsive"} onChange={(e) => setForm({ ...form, size: e.target.value })}>
                {SIZE_PRESETS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
          )}

          {/* Delay for popunder / interstitial */}
          {(form.type === "popunder" || form.type === "interstitial") && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Delay Tampil (detik)" hint="Iklan muncul setelah N detik">
                <input
                  type="number" min={0} max={60} className={inp}
                  value={form.delay ?? 0}
                  onChange={(e) => setForm({ ...form, delay: Number(e.target.value) * 1000 })}
                  placeholder="0"
                />
              </Field>
              <Field label="Frekuensi per Sesi" hint="Muncul maksimal N kali per sesi">
                <input
                  type="number" min={1} max={10} className={inp}
                  value={form.frequency ?? 1}
                  onChange={(e) => setForm({ ...form, frequency: Number(e.target.value) })}
                  placeholder="1"
                />
              </Field>
            </div>
          )}

          {/* AdMob ID for APK */}
          {(form.platform === "apk" || form.platform === "both") && (form.type === "banner-top" || form.type === "banner-bottom" || form.type === "interstitial") && (
            <Field label="AdMob Unit ID (APK)" hint="ca-app-pub-xxxxxxxx/xxxxxxxxxx — untuk AdMob di APK">
              <input className={inp} value={form.adMobId ?? ""} onChange={(e) => setForm({ ...form, adMobId: e.target.value })} placeholder="ca-app-pub-xxxxxxxx/xxxxxxxxxx" />
            </Field>
          )}

          {/* Code / Script */}
          <Field
            label={form.type === "interstitial" && (form.platform === "apk") ? "AdMob Unit ID / Kode HTML" : "Kode Script / HTML Iklan"}
            hint={
              form.type === "popunder" ? "Tempel script dari Adsterra, PropellerAds, atau jaringan lain" :
              form.type === "social-bar" ? "Tempel script Social Bar dari Adsterra — diinjeksikan 1x ke halaman" :
              form.type === "native-video" ? "Tempel kode embed video iklan (iframe atau script)" :
              form.type === "interstitial" ? "Tempel kode HTML/script. Untuk APK isi AdMob ID di field atas" :
              "Tempel kode HTML/script dari jaringan iklanmu (Google AdSense, Adsterra, dll)"
            }
          >
            <textarea
              className={`${inp} font-mono text-xs leading-relaxed resize-y`}
              rows={6}
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder={
                form.type === "popunder" ? '<script type="text/javascript">\n  /* kode pop-under dari jaringan iklan */\n</script>' :
                form.type === "social-bar" ? '<script async="async" data-cfasync="false" src="//...adsterra.com/..."></script>' :
                form.type === "native-video" ? '<div id="ad-video-container">\n  <script src="..."></script>\n</div>' :
                '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-xxx" crossorigin="anonymous"></script>\n<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-xxx" data-ad-slot="xxx" data-ad-format="auto" data-full-width-responsive="true"></ins>\n<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>'
              }
            />
          </Field>

          {/* Active */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-white font-bold">Aktifkan sekarang</span>
            <Toggle value={form.active} onChange={(v) => setForm({ ...form, active: v })} />
          </div>

          <button
            onClick={() => editId ? updateAd.mutate() : addAd.mutate()}
            disabled={isPending || !form.label.trim()}
            className={`${yaBtn} w-full flex items-center justify-center gap-2`}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {editId ? "Update Iklan" : "Simpan Iklan"}
          </button>
        </div>
      )}

      {/* Ad List */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-yellow-400" /></div>
      ) : filtered.length === 0 && !showForm ? (
        <div className={`${card} p-8 text-center`}>
          <Megaphone className="mx-auto mb-2 text-gray-700" size={32} />
          <p className="text-gray-500 text-sm">Belum ada iklan</p>
          <button onClick={() => openNew(sub !== "semua" ? sub : undefined)} className="mt-3 text-yellow-400 text-xs font-bold">+ Tambah sekarang</button>
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
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${meta.colorClass}`}>
                        {meta.icon} {meta.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${platform === "web" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : platform === "apk" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-white/5 text-gray-400 border-white/10"}`}>
                        {platform === "web" ? "🌐 Web" : platform === "apk" ? "📱 APK" : "✅ Semua"}
                      </span>
                      {ad.size && ad.size !== "responsive" && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-500 border border-white/5 text-[10px]">{ad.size}</span>
                      )}
                    </div>
                    <p className="text-white text-sm font-bold truncate">{ad.label || "(tanpa nama)"}</p>
                    {(ad.type === "popunder" || ad.type === "interstitial") && ad.delay && ad.delay > 0 && (
                      <p className="text-gray-600 text-[10px] mt-0.5">⏱ Muncul setelah {ad.delay / 1000}s · {ad.frequency ?? 1}× per sesi</p>
                    )}
                    {ad.adMobId && (
                      <p className="text-gray-600 text-[10px] mt-0.5 font-mono truncate">{ad.adMobId}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Toggle
                      value={ad.active}
                      onChange={(v) => toggleActive.mutate({ id: ad.id, active: v })}
                    />
                    <button onClick={() => openEdit(ad)} className="text-gray-500 hover:text-yellow-400 transition-colors p-1">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Hapus iklan "${ad.label}"?`)) deleteAd.mutate(ad.id); }}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APK sync notice */}
      <div className={`${card} p-4 bg-green-500/5 border-green-500/20`}>
        <p className="text-green-400 text-xs font-bold mb-1">📱 Sinkronisasi APK Otomatis</p>
        <p className="text-gray-500 text-[11px] leading-relaxed">
          Semua iklan tersimpan di Firebase dan langsung tersinkron ke APK Android.
          APK membaca iklan dengan <span className="text-white font-mono">platform = "apk"</span> atau <span className="text-white font-mono">"both"</span>.
          Gunakan <span className="text-white font-mono">adMobId</span> untuk unit iklan AdMob di APK.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* LOGIN                                                     */
/* ══════════════════════════════════════════════════════════ */
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw]       = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLd]  = useState(false);
  const [show, setShow]   = useState(false);

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
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
            <Tv className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-white font-black text-lg">XpoGo Admin</h1>
            <p className="text-gray-500 text-xs">Streaming Management</p>
          </div>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <Field label="Password Admin">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={show ? "text" : "password"} value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Masukkan password" autoFocus
                className={`${inp} pl-10 pr-10`}
              />
              <button type="button" onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
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
/* TAMBAH TAB                                                */
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
  const formRef               = useRef<HTMLDivElement>(null);

  const applyItem = (item: TmdbItem) => {
    setSel(item);
    setForm({
      title:       item.title ?? item.name ?? "",
      description: item.overview ?? "",
      posterUrl:   item.poster_path   ? `${IMG}/w500${item.poster_path}`       : "",
      backdropUrl: item.backdrop_path ? `${IMG}/original${item.backdrop_path}` : "",
      year:        (item.release_date ?? item.first_air_date ?? "").slice(0, 4),
      type:        item.media_type === "tv" ? "series" : "movie",
      tmdbId:      String(item.id),
      imdbId:      item.imdb_id ?? "",
      embedUrl:    DEFAULT_EMBED_URL,
    });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const doSearch = async () => {
    if (!q.trim()) return;
    setLd(true); setResults([]); setSel(null);
    try {
      const res = await tmdb.search(q.trim());
      const filtered = res.results.filter((r) =>
        mediaType === "movie" ? r.media_type === "movie" : r.media_type === "tv"
      );
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
    queryFn: async () => {
      const r = await tmdb.trending("all", "week");
      return r.results.slice(0, 18);
    },
    staleTime: 1000 * 60 * 10,
  });

  const save = useMutation({
    mutationFn: () => fb.addCustomMovie({
      title: form.title, description: form.description || undefined,
      posterUrl: form.posterUrl || undefined, backdropUrl: form.backdropUrl || undefined,
      year: form.year ? Number(form.year) : undefined, embedUrl: form.embedUrl?.trim() || DEFAULT_EMBED_URL,
      type: form.type, tmdbId: form.tmdbId ? Number(form.tmdbId) : undefined,
      imdbId: form.imdbId || undefined,
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
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors capitalize ${sub === t ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}>
            {t === "cari" ? "Cari" : t === "id" ? "ID Manual" : "Pilihan"}
          </button>
        ))}
      </div>

      {sub === "cari" && (
        <div>
          <div className="flex gap-2 mb-4">
            <select value={mediaType} onChange={(e) => setMt(e.target.value as "movie" | "tv")}
              className="bg-[#1e2535] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-yellow-500 flex-shrink-0">
              <option value="movie">Film</option>
              <option value="tv">Series</option>
            </select>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} placeholder="Judul film/series..." className={`${inp} flex-1`} />
            <button onClick={doSearch} disabled={loading} className={`${yaBtn} flex-shrink-0 flex items-center gap-1.5`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Cari
            </button>
          </div>
          {results.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-5">
              {results.map((r) => (
                <button key={r.id} onClick={() => applyItem(r)} className={`text-left rounded-xl overflow-hidden border-2 transition-all ${selected?.id === r.id ? "border-yellow-400" : "border-transparent"}`}>
                  <div className="aspect-[2/3] bg-[#1e2535]">{r.poster_path ? <img src={`${IMG}/w185${r.poster_path}`} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-gray-700" /></div>}</div>
                  <div className="p-1.5"><p className="text-white text-xs font-semibold truncate leading-tight">{r.title ?? r.name}</p><p className="text-gray-500 text-[10px]">{(r.release_date ?? r.first_air_date ?? "").slice(0,4)}</p></div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {sub === "id" && (
        <div className="mb-5 flex gap-2">
          <input value={idInput} onChange={(e) => setIdInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doFetchId()} placeholder="TMDB/IMDB ID" className={`${inp} flex-1`} />
          <button onClick={doFetchId} className={yaBtn}>Fetch</button>
        </div>
      )}

      {sub === "pilihan" && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-5">
          {trending.map((r) => (
            <button key={r.id} onClick={() => applyItem(r)} className={`text-left rounded-xl overflow-hidden border-2 transition-all ${selected?.id === r.id ? "border-yellow-400" : "border-transparent"}`}>
              <div className="aspect-[2/3] bg-[#1e2535]">{r.poster_path ? <img src={`${IMG}/w185${r.poster_path}`} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Film className="w-6 h-6 text-gray-700" /></div>}</div>
              <div className="p-1.5"><p className="text-white text-xs font-semibold truncate leading-tight">{r.title ?? r.name}</p></div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div ref={formRef} className={`${card} p-5 mt-2`}>
          <div className="flex items-start gap-4 mb-5">
            {selected.poster_path && <img src={`${IMG}/w154${selected.poster_path}`} alt="" className="w-16 rounded-lg object-cover flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-base leading-tight">{selected.title ?? selected.name}</p>
            </div>
            <button onClick={() => { setSel(null); setForm({ ...emptyFilm }); }} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Judul"><input className={inp} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
              <Field label="Tipe"><select className={inp} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "movie" | "series" })}><option value="movie">Movie</option><option value="series">Series</option></select></Field>
              <Field label="TMDB ID"><input className={inp} value={form.tmdbId} readOnly /></Field>
              <Field label="IMDB ID"><input className={inp} value={form.imdbId} onChange={(e) => setForm({ ...form, imdbId: e.target.value })} placeholder="tt..." /></Field>
            </div>
            <button onClick={() => save.mutate()} disabled={save.isPending} className={`${yaBtn} w-full flex items-center justify-center gap-2`}>
              {save.isPending ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16}/> : <Plus size={16} />}
              {saved ? "Tersimpan!" : "Simpan ke Daftar"}
            </button>
          </div>
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
  const [sub, setSub]     = useState<DaftarSub>("film");
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
        <button onClick={() => setSub("film")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${sub === "film" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}>Film / Series</button>
        <button onClick={() => setSub("episode")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${sub === "episode" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}>Episodes</button>
      </div>

      {sub === "film" && (
        ldM ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-yellow-400"/></div> :
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3">
          {movies.map((m) => (
            <div key={m.id} className={`${card} overflow-hidden group`}>
              <div className="aspect-[2/3] bg-[#1e2535] relative">
                {m.posterUrl && <img src={m.posterUrl} alt="" className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => confirm("Hapus?") && delMovie.mutate(m.id)} className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="p-2 text-white text-[10px] font-bold truncate">{m.title}</p>
            </div>
          ))}
        </div>
      )}

      {sub === "episode" && (
        <div className="space-y-4">
          <input value={epFilter} onChange={e => setEpFilter(e.target.value)} placeholder="Filter series..." className={inp} />
          {filteredGroups.map(([tmdbId, eps]) => (
            <div key={tmdbId} className={card + " overflow-hidden"}>
              <div className="px-4 py-2 border-b border-white/5 bg-white/5 font-bold text-sm">{eps[0]?.seriesTitle}</div>
              {eps.map(ep => (
                <div key={ep.id} className="px-4 py-2 flex justify-between items-center text-xs border-b border-white/5 last:border-0">
                  <span className="text-gray-300">S{ep.season}E{ep.episode}</span>
                  <Toggle value={ep.active} onChange={(v) => toggleEp.mutate({ id: ep.id, active: v })} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* SERVER TAB                                                */
/* ══════════════════════════════════════════════════════════ */
const VARS = ["{id}", "{type}", "{s}", "{e}", "{imdb}", "+sub"];

function ServerTab() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [srvName, setSrvName] = useState("");
  const [srvUrl, setSrvUrl]   = useState("");

  const { data: builtinStates = {} } = useQuery<BuiltinServerState>({ queryKey: ["builtin_states"], queryFn: async () => (await fb.getBuiltinServerStates()) ?? {} });
  const { data: customSrvs = [] }    = useQuery<CustomServer[]>({ queryKey: ["custom_servers"], queryFn: fb.getCustomServers });

  const toggleBuiltin = useMutation({ mutationFn: ({ id, val }: { id: string; val: boolean }) => fb.setBuiltinServerState(id, val), onSuccess: () => qc.invalidateQueries({ queryKey: ["builtin_states"] }) });
  const addSrv  = useMutation({ mutationFn: () => fb.addCustomServer({ name: srvName, url: srvUrl, active: true, createdAt: Date.now() }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom_servers"] }); setSrvName(""); setSrvUrl(""); setAddOpen(false); } });
  const delSrv  = useMutation({ mutationFn: (id: string) => fb.deleteCustomServer(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["custom_servers"] }) });

  return (
    <div className="pb-4 space-y-6">
      <h2 className="text-yellow-400 text-xl font-black">Server Player</h2>
      <div className={`${card} p-4 bg-yellow-400/5 text-[11px] text-gray-400`}>
        <p className="font-bold text-yellow-400 uppercase mb-1">Panduan:</p>
        <p>Isi angka <span className="text-white font-bold">"5"</span> untuk server ZxcStream atau link lengkap untuk embed luar.</p>
      </div>

      <div className="space-y-2">
        {BUILTIN.map((s) => (
          <div key={s.id} className={`${card} flex items-center justify-between px-4 py-3`}>
            <div>
              <p className="text-white font-bold text-sm">{s.name}</p>
              <p className="text-gray-600 text-[10px] font-mono truncate max-w-[200px]">{s.url}</p>
            </div>
            <Toggle value={builtinStates[s.id] !== false} onChange={(v) => toggleBuiltin.mutate({ id: s.id, val: v })} />
          </div>
        ))}
        {customSrvs.map((s) => (
          <div key={s.id} className={`${card} flex items-center justify-between px-4 py-3`}>
            <div>
              <p className="text-white font-bold text-sm">{s.name}</p>
              <p className="text-gray-600 text-[10px] font-mono truncate max-w-[200px]">{s.url}</p>
            </div>
            <button onClick={() => delSrv.mutate(s.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      {!addOpen ? (
        <button onClick={() => setAddOpen(true)} className="w-full text-yellow-400 border-2 border-dashed border-yellow-400/30 rounded-xl py-3 font-bold hover:border-yellow-400/60 transition-colors">
          + Tambah Server Custom
        </button>
      ) : (
        <div className={`${card} p-5 space-y-4`}>
          <div className="flex items-center justify-between"><p className="text-white font-bold">Server Baru</p><button onClick={() => setAddOpen(false)} className="text-gray-500 hover:text-white"><X size={16}/></button></div>
          <Field label="Nama Server"><input className={inp} value={srvName} onChange={e => setSrvName(e.target.value)} placeholder="Nama server..." /></Field>
          <Field label="Angka ID atau URL Template" hint="Gunakan angka '5' untuk ZxcStream, atau URL penuh dengan variabel">
            <input className={inp} value={srvUrl} onChange={e => setSrvUrl(e.target.value)} placeholder="5 atau https://.../{type}/{id}" />
            <div className="flex flex-wrap gap-2 mt-2">
              {VARS.map(v => <button key={v} type="button" onClick={() => setSrvUrl(srvUrl + v)} className="bg-[#1e2535] text-[10px] px-2 py-1 rounded text-yellow-400 border border-white/5 hover:border-yellow-400/30">{v}</button>)}
            </div>
          </Field>
          <button onClick={() => addSrv.mutate()} disabled={addSrv.isPending || !srvName.trim()} className={yaBtn + " w-full"}>
            {addSrv.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Simpan Server"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── TEMA TAB ───────────────────────────────────────────── */
function TemaTab() {
  const qc = useQueryClient();
  const { data: settings, isLoading: loadingSettings } = useQuery({ queryKey: ["settings"], queryFn: fb.getSettings });

  const [form, setForm] = useState({
    siteTitle: "",
    playerColor: "E50914",
    autoplay: "true",
    announcementActive: "false",
    announcement: "",
    maintenanceMode: "false",
    maintenanceMessage: "Sedang dalam pemeliharaan. Silakan kembali lagi nanti. 🔧",
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  /* ── Ganti Password ── */
  const [oldPw, setOldPw]   = useState("");
  const [newPw, setNewPw]   = useState("");
  const [confPw, setConfPw] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwMsg, setPwMsg]   = useState<{ text: string; ok: boolean } | null>(null);
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
      await fb.setPasswordHash(newHash);
      setToken(newHash);
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

      {/* ── Tampilan ─────────────────────────────────── */}
      <div className={card + " p-5 space-y-4"}>
        <p className="text-white font-black text-sm flex items-center gap-2">🎨 Tampilan</p>
        <Field label="Nama Situs">
          <input className={inp} value={form.siteTitle} onChange={e => setForm({ ...form, siteTitle: e.target.value })} placeholder="XpoGo" />
        </Field>
        <Field label="Warna Aksen Player" hint="Warna tombol & aksen Peachify player (hex tanpa #)">
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={colorHex}
              onChange={e => setForm({ ...form, playerColor: e.target.value.replace("#", "") })}
              className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent p-0.5"
            />
            <input
              className={`${inp} flex-1 font-mono uppercase`}
              value={form.playerColor}
              onChange={e => setForm({ ...form, playerColor: e.target.value.replace("#", "").slice(0, 6) })}
              placeholder="E50914"
              maxLength={6}
            />
            <div className="w-10 h-10 rounded-lg border border-white/10 flex-shrink-0" style={{ background: colorHex }} />
          </div>
        </Field>
      </div>

      {/* ── Player ───────────────────────────────────── */}
      <div className={card + " p-5 space-y-4"}>
        <p className="text-white font-black text-sm flex items-center gap-2">⚙️ Player</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-bold">Autoplay Video</p>
            <p className="text-gray-500 text-[11px]">Video langsung putar saat halaman dibuka</p>
          </div>
          <Toggle value={form.autoplay === "true"} onChange={v => setForm({ ...form, autoplay: v ? "true" : "false" })} />
        </div>
      </div>

      {/* ── Banner Pengumuman ─────────────────────────── */}
      <div className={card + " p-5 space-y-4"}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-black text-sm flex items-center gap-2">📢 Banner Pengumuman</p>
            <p className="text-gray-500 text-[11px]">Tampilkan notifikasi di bagian atas website</p>
          </div>
          <Toggle value={form.announcementActive === "true"} onChange={v => setForm({ ...form, announcementActive: v ? "true" : "false" })} />
        </div>
        {form.announcementActive === "true" && (
          <Field label="Teks Pengumuman">
            <textarea
              className={`${inp} resize-none`}
              rows={2}
              value={form.announcement}
              onChange={e => setForm({ ...form, announcement: e.target.value })}
              placeholder="Contoh: Server sedang dalam perbaikan. Gunakan server alternatif."
            />
          </Field>
        )}
        {form.announcementActive === "true" && form.announcement && (
          <div className="rounded-lg px-4 py-2.5 text-sm font-medium text-center" style={{ background: colorHex + "22", border: `1px solid ${colorHex}44`, color: "#fff" }}>
            📢 {form.announcement}
          </div>
        )}
      </div>

      {/* ── Mode Maintenance ─────────────────────────── */}
      <div className={`${card} p-5 space-y-4 ${form.maintenanceMode === "true" ? "border-orange-500/40 bg-orange-500/5" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-black text-sm flex items-center gap-2">🔧 Mode Maintenance</p>
            <p className="text-gray-500 text-[11px]">Semua halaman tampilkan pesan maintenance</p>
          </div>
          <Toggle value={form.maintenanceMode === "true"} onChange={v => setForm({ ...form, maintenanceMode: v ? "true" : "false" })} />
        </div>
        {form.maintenanceMode === "true" && (
          <>
            <div className="flex items-center gap-2 text-orange-400 text-xs font-bold bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
              ⚠️ Mode Maintenance AKTIF — Website tidak bisa diakses user!
            </div>
            <Field label="Pesan Maintenance">
              <textarea
                className={`${inp} resize-none`}
                rows={2}
                value={form.maintenanceMessage}
                onChange={e => setForm({ ...form, maintenanceMessage: e.target.value })}
                placeholder="Sedang dalam pemeliharaan..."
              />
            </Field>
          </>
        )}
      </div>

      {/* ── Simpan ───────────────────────────────────── */}
      <button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className={`${yaBtn} w-full flex items-center justify-center gap-2`}
      >
        {save.isPending ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
        {saved ? "Tersimpan! ✓" : "Simpan Semua Pengaturan"}
      </button>

      {/* ── Ganti Password Admin ─────────────────────── */}
      <div className={card + " p-5 space-y-4"}>
        <p className="text-white font-black text-sm flex items-center gap-2">🔐 Ganti Password Admin</p>

        <Field label="Password Lama">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type={showOld ? "text" : "password"}
              className={`${inp} pl-10 pr-10`}
              value={oldPw}
              onChange={e => setOldPw(e.target.value)}
              placeholder="Password saat ini"
            />
            <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Password Baru">
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                className={`${inp} pr-10`}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min 6 karakter"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <Field label="Konfirmasi Password">
            <input
              type="password"
              className={inp}
              value={confPw}
              onChange={e => setConfPw(e.target.value)}
              placeholder="Ulangi password baru"
            />
          </Field>
        </div>

        {pwMsg && (
          <p className={`text-xs font-bold px-3 py-2 rounded-lg ${pwMsg.ok ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
            {pwMsg.text}
          </p>
        )}

        <button
          onClick={changePw}
          disabled={pwLoading || !oldPw || !newPw || !confPw}
          className={`${yaBtn} w-full flex items-center justify-center gap-2`}
        >
          {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          Ganti Password
        </button>
      </div>

      {/* ── Info Sinkronisasi ────────────────────────── */}
      <div className={card + " p-4 bg-green-500/5 border-green-500/20"}>
        <p className="text-green-400 text-xs font-bold mb-1">🔄 Sinkronisasi Otomatis ke APK</p>
        <p className="text-gray-500 text-[11px] leading-relaxed">
          Semua pengaturan (nama situs, warna, mode maintenance, pengumuman) tersimpan di Firebase dan langsung tersinkron ke APK Android tanpa perlu rebuild.
        </p>
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
        <a href="https://expo.dev/accounts/pendi55/projects/xpogo-mobile/builds" target="_blank" rel="noreferrer" className={yaBtn + " w-full block text-center"}>
          Lihat Build Terbaru
        </a>
      </div>
      <div className={card + " p-4 bg-blue-500/5 border-blue-500/20"}>
        <p className="text-blue-400 text-xs font-bold mb-2">ℹ️ Sinkronisasi Otomatis</p>
        <p className="text-gray-500 text-[11px] leading-relaxed">Server, iklan, dan pengaturan tersimpan di Firebase dan langsung tersinkron ke APK tanpa perlu rebuild. Hanya perlu rebuild jika ada perubahan kode React Native.</p>
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
        <h1 className="text-yellow-400 font-black text-lg">XpoGo Admin</h1>
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
