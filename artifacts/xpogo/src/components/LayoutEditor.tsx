/**
 * LayoutEditor — Canva-like visual layout editor for XpoGo.
 * Separate Web (browser preview) and APK (phone preview) layouts.
 * Drag & drop reorder, enable/disable, section properties.
 * Saves to Firebase: layout/web and layout/apk
 */
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fb } from "@/lib/firebase";
import { getWriteToken } from "@/lib/auth";
import type { LayoutSection, WebLayoutConfig, ApkLayoutConfig } from "@/lib/firebase";
import {
  Monitor, Smartphone, Save, Plus, GripVertical,
  Eye, EyeOff, Trash2, Check, Loader2, X,
  ChevronUp, ChevronDown, AlertTriangle, Layers,
  Settings2, Globe, LayoutDashboard,
} from "lucide-react";

/* ── visual helpers ────────────────────────────────────────── */
const card = "bg-[#161b27] border border-white/[0.08] rounded-xl";
const inp = "w-full bg-[#0d1117] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 transition-colors placeholder:text-gray-600";
const yaBtn = "bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50";

/* ── Section Definitions ──────────────────────────────────── */
export interface SectionDef {
  id: string;
  label: string;
  icon: string;
  color: string;       // bg color in preview
  textColor: string;   // label text color
  height: number;      // relative height in preview (px, scaled)
  fixed?: boolean;     // cannot remove/reorder (e.g. navbar, footer)
  description: string;
  platform: "web" | "apk" | "both";
  defaultEnabled: boolean;
}

export const WEB_SECTION_DEFS: SectionDef[] = [
  { id: "navbar",      label: "Navigation Bar",     icon: "🔗", color: "#1e3a8a", textColor: "#93c5fd", height: 52,  fixed: true,  description: "Menu navigasi atas website", platform: "web",  defaultEnabled: true  },
  { id: "announce",    label: "Announcement Bar",   icon: "📢", color: "#78350f", textColor: "#fde68a", height: 32,               description: "Banner pengumuman (opsional)", platform: "web",  defaultEnabled: false },
  { id: "hero",        label: "Hero Banner",         icon: "🎬", color: "#4c1d95", textColor: "#c4b5fd", height: 180,              description: "Slider film utama, full width", platform: "web",  defaultEnabled: true  },
  { id: "ad_top",      label: "Ad Banner Atas",      icon: "📊", color: "#064e3b", textColor: "#6ee7b7", height: 44,               description: "Iklan banner di bawah hero",   platform: "web",  defaultEnabled: false },
  { id: "trending",    label: "🔥 Trending",          icon: "🔥", color: "#7c2d12", textColor: "#fdba74", height: 108,              description: "Film trending minggu ini",      platform: "both", defaultEnabled: true  },
  { id: "popular",     label: "⭐ Film Populer",      icon: "⭐", color: "#1e3a8a", textColor: "#93c5fd", height: 108,              description: "Film paling populer global",    platform: "both", defaultEnabled: true  },
  { id: "top_rated",   label: "🏅 Top Rated",         icon: "🏅", color: "#5b21b6", textColor: "#c4b5fd", height: 108,              description: "Film rating tertinggi",         platform: "both", defaultEnabled: true  },
  { id: "popular_tv",  label: "📺 TV Show Populer",   icon: "📺", color: "#064e3b", textColor: "#6ee7b7", height: 108,              description: "Series TV paling populer",      platform: "both", defaultEnabled: true  },
  { id: "top_tv",      label: "🏆 Top TV",             icon: "🏆", color: "#0c4a6e", textColor: "#7dd3fc", height: 108,              description: "TV show rating tertinggi",      platform: "both", defaultEnabled: true  },
  { id: "upcoming",    label: "📅 Upcoming",           icon: "📅", color: "#881337", textColor: "#fda4af", height: 108,              description: "Film akan datang di bioskop",   platform: "web",  defaultEnabled: true  },
  { id: "now_playing", label: "▶️ Now Playing",        icon: "▶️", color: "#14532d", textColor: "#86efac", height: 108,              description: "Sedang tayang di bioskop",      platform: "web",  defaultEnabled: true  },
  { id: "donghua",     label: "🐉 Donghua",            icon: "🐉", color: "#7c2d12", textColor: "#fdba74", height: 108,              description: "Animasi China / Donghua",       platform: "both", defaultEnabled: true  },
  { id: "custom",      label: "🎯 Film Custom",        icon: "🎯", color: "#312e81", textColor: "#a5b4fc", height: 108,              description: "Film yang kamu tambahkan manual", platform: "both", defaultEnabled: true  },
  { id: "ad_bottom",   label: "Ad Banner Bawah",      icon: "📊", color: "#064e3b", textColor: "#6ee7b7", height: 44,               description: "Iklan banner di atas footer",   platform: "web",  defaultEnabled: false },
  { id: "footer",      label: "Footer",               icon: "📝", color: "#111827", textColor: "#9ca3af", height: 64,  fixed: true,  description: "Footer & copyright website",    platform: "web",  defaultEnabled: true  },
];

export const APK_SECTION_DEFS: SectionDef[] = [
  { id: "status_bar",    label: "Status Bar",           icon: "📱", color: "#030712", textColor: "#6b7280", height: 24, fixed: true,  description: "Status bar Android (waktu, baterai)", platform: "apk",  defaultEnabled: true  },
  { id: "top_nav",       label: "Top Navigation",       icon: "🔗", color: "#1e3a8a", textColor: "#93c5fd", height: 52, fixed: true,  description: "Navbar atas dengan logo & search",    platform: "apk",  defaultEnabled: true  },
  { id: "hero",          label: "Hero Banner",          icon: "🎬", color: "#4c1d95", textColor: "#c4b5fd", height: 160,              description: "Slider film utama di APK",            platform: "both", defaultEnabled: true  },
  { id: "ad_admob_top",  label: "AdMob Banner Atas",    icon: "💰", color: "#064e3b", textColor: "#6ee7b7", height: 44,               description: "Iklan AdMob banner di atas konten",  platform: "apk",  defaultEnabled: false },
  { id: "trending",      label: "🔥 Trending",           icon: "🔥", color: "#7c2d12", textColor: "#fdba74", height: 100,              description: "Film trending minggu ini",             platform: "both", defaultEnabled: true  },
  { id: "popular",       label: "⭐ Film Populer",       icon: "⭐", color: "#1e3a8a", textColor: "#93c5fd", height: 100,              description: "Film paling populer",                 platform: "both", defaultEnabled: true  },
  { id: "top_rated",     label: "🏅 Top Rated",          icon: "🏅", color: "#5b21b6", textColor: "#c4b5fd", height: 100,              description: "Film rating tertinggi",               platform: "both", defaultEnabled: true  },
  { id: "popular_tv",    label: "📺 TV Show",            icon: "📺", color: "#064e3b", textColor: "#6ee7b7", height: 100,              description: "Series TV populer di APK",            platform: "both", defaultEnabled: true  },
  { id: "donghua",       label: "🐉 Donghua",            icon: "🐉", color: "#7c2d12", textColor: "#fdba74", height: 100,              description: "Animasi China / Donghua",             platform: "both", defaultEnabled: true  },
  { id: "custom",        label: "🎯 Film Custom",        icon: "🎯", color: "#312e81", textColor: "#a5b4fc", height: 100,              description: "Film yang ditambahkan manual",         platform: "both", defaultEnabled: true  },
  { id: "ad_admob_bot",  label: "AdMob Banner Bawah",   icon: "💰", color: "#064e3b", textColor: "#6ee7b7", height: 44,               description: "Iklan AdMob di atas navbar bawah",    platform: "apk",  defaultEnabled: false },
  { id: "bottom_nav",    label: "Bottom Navigation",    icon: "🗂️", color: "#1e3a8a", textColor: "#93c5fd", height: 52, fixed: true,  description: "Navbar bawah APK (Home/Search/dll)",  platform: "apk",  defaultEnabled: true  },
];

function getDefs(platform: "web" | "apk") {
  return platform === "web" ? WEB_SECTION_DEFS : APK_SECTION_DEFS;
}

function defaultSections(platform: "web" | "apk"): LayoutSection[] {
  return getDefs(platform).map((d, i) => ({
    id: d.id,
    enabled: d.defaultEnabled,
    order: i,
    config: {},
  }));
}

/* ── Helpers ──────────────────────────────────────────────── */
function sortSections(sections: LayoutSection[]) {
  return [...sections].sort((a, b) => a.order - b.order);
}

/* ══════════════════════════════════════════════════════════
   DEVICE FRAME — WEB (Browser Mockup)
══════════════════════════════════════════════════════════ */
function WebFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl shadow-black/60 bg-[#1e2535] w-full" style={{ maxWidth: 380 }}>
      {/* browser chrome */}
      <div className="bg-[#282c3a] border-b border-white/10 px-3 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 bg-[#0d1117] rounded-md px-2 py-1 flex items-center gap-1.5 mx-1">
          <Globe size={8} className="text-gray-600 flex-shrink-0" />
          <span className="text-gray-600 text-[9px] font-mono truncate">xpogo.web.app</span>
        </div>
      </div>
      {/* page content area */}
      <div className="bg-[#0d1117] overflow-y-auto" style={{ maxHeight: 520 }}>
        {children}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DEVICE FRAME — APK (Phone Mockup)
══════════════════════════════════════════════════════════ */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] overflow-hidden border-[3px] border-white/20 shadow-2xl shadow-black/60 bg-[#0d1117] w-full mx-auto" style={{ maxWidth: 240 }}>
      {/* notch */}
      <div className="bg-[#030712] flex justify-center py-2">
        <div className="w-16 h-4 bg-[#0d1117] rounded-full" />
      </div>
      {/* screen */}
      <div className="bg-[#0d1117] overflow-y-auto" style={{ maxHeight: 520 }}>
        {children}
      </div>
      {/* home indicator */}
      <div className="bg-[#030712] flex justify-center py-2">
        <div className="w-16 h-1 bg-white/20 rounded-full" />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SECTION BLOCK (inside device frame)
══════════════════════════════════════════════════════════ */
interface SectionBlockProps {
  section: LayoutSection;
  def: SectionDef;
  selected: boolean;
  dragOver: boolean;
  dragAbove: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove: boolean;
  // drag
  draggable: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent, above: boolean) => void;
  onDrop: (e: React.DragEvent, above: boolean) => void;
  onDragEnd: () => void;
}

function SectionBlock({
  section, def, selected, dragOver, dragAbove,
  onSelect, onToggle, onRemove, onMoveUp, onMoveDown,
  canMoveUp, canMoveDown, canRemove, draggable,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: SectionBlockProps) {
  const scaledHeight = Math.max(28, Math.round(def.height * 0.65));

  return (
    <div
      className={`relative select-none transition-all duration-150 cursor-pointer group ${dragOver ? (dragAbove ? "border-t-2 border-yellow-400" : "border-b-2 border-yellow-400") : "border-t-0 border-b-0 border-transparent"} ${selected ? "ring-2 ring-yellow-400 ring-inset z-10" : ""}`}
      style={{
        height: scaledHeight,
        background: section.enabled ? def.color : "#0d1117",
        opacity: section.enabled ? 1 : 0.4,
        borderLeft: selected ? "none" : "none",
      }}
      onClick={onSelect}
      draggable={draggable && !def.fixed}
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); onDragOver(e, e.clientY < rect.top + rect.height / 2); }}
      onDrop={e => { e.preventDefault(); const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); onDrop(e, e.clientY < rect.top + rect.height / 2); }}
      onDragEnd={onDragEnd}
    >
      {/* content */}
      <div className="h-full flex items-center px-2 gap-2 overflow-hidden">
        {!def.fixed && (
          <GripVertical size={12} className="text-white/30 flex-shrink-0 cursor-grab active:cursor-grabbing" />
        )}
        <span className="text-sm flex-shrink-0">{def.icon}</span>
        <span className="text-[10px] font-bold truncate flex-1" style={{ color: def.textColor }}>
          {def.label}
        </span>
        {!section.enabled && <EyeOff size={10} className="text-white/30 flex-shrink-0" />}
      </div>

      {/* hover toolbar */}
      <div className={`absolute inset-y-0 right-0 flex items-center gap-0.5 px-1 bg-black/60 backdrop-blur-sm transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} onClick={e => e.stopPropagation()}>
        {canMoveUp && !def.fixed && (
          <button onClick={onMoveUp} className="text-white/50 hover:text-white p-0.5 rounded" title="Naikkan">
            <ChevronUp size={12} />
          </button>
        )}
        {canMoveDown && !def.fixed && (
          <button onClick={onMoveDown} className="text-white/50 hover:text-white p-0.5 rounded" title="Turunkan">
            <ChevronDown size={12} />
          </button>
        )}
        <button onClick={onToggle} className="text-white/50 hover:text-yellow-400 p-0.5 rounded" title={section.enabled ? "Sembunyikan" : "Tampilkan"}>
          {section.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        {canRemove && !def.fixed && (
          <button onClick={onRemove} className="text-white/50 hover:text-red-400 p-0.5 rounded" title="Hapus">
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {/* "fixed" badge */}
      {def.fixed && (
        <div className="absolute top-1 right-1">
          <span className="text-[8px] px-1 py-0.5 rounded bg-white/10 text-white/40 font-bold">FIXED</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PALETTE ITEM (left panel)
══════════════════════════════════════════════════════════ */
function PaletteItem({ def, onAdd }: { def: SectionDef; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-white/5 hover:border-yellow-400/40 bg-[#0d1117] hover:bg-[#1a1f2e] transition-all text-left group"
      title={`Tambahkan ${def.label}`}
    >
      <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: def.color }}>
        <span className="text-[10px]">{def.icon}</span>
      </div>
      <span className="text-[10px] text-gray-400 group-hover:text-white transition-colors truncate flex-1">{def.label}</span>
      <Plus size={10} className="text-gray-600 group-hover:text-yellow-400 flex-shrink-0" />
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   PROPERTIES PANEL (right side)
══════════════════════════════════════════════════════════ */
interface PropsPanelProps {
  section: LayoutSection;
  def: SectionDef;
  onChange: (updated: LayoutSection) => void;
  platform: "web" | "apk";
  webConfig?: WebLayoutConfig;
  apkConfig?: ApkLayoutConfig;
  onWebConfigChange?: (c: WebLayoutConfig) => void;
  onApkConfigChange?: (c: ApkLayoutConfig) => void;
}

function PropsPanel({ section, def, onChange, platform, webConfig, apkConfig, onWebConfigChange, onApkConfigChange }: PropsPanelProps) {
  const c = section.config ?? {};

  const update = (partial: Partial<typeof c>) => {
    onChange({ ...section, config: { ...c, ...partial } });
  };

  return (
    <div className="space-y-4 text-xs">
      <div className={`flex items-start gap-2.5 p-2.5 rounded-xl`} style={{ background: def.color + "33", border: `1px solid ${def.color}55` }}>
        <span className="text-lg leading-none">{def.icon}</span>
        <div>
          <p className="font-bold text-white text-[11px]">{def.label}</p>
          <p className="text-gray-400 text-[9px] mt-0.5 leading-relaxed">{def.description}</p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <span className="text-gray-300 font-bold">Tampilkan</span>
        <button
          onClick={() => onChange({ ...section, enabled: !section.enabled })}
          className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${section.enabled ? "bg-yellow-400" : "bg-gray-700"}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${section.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Custom title */}
      {!def.fixed && (
        <div>
          <label className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block mb-1">Judul Custom (opsional)</label>
          <input
            className={inp + " text-xs py-1.5"}
            value={c.title ?? ""}
            onChange={e => update({ title: e.target.value })}
            placeholder={`Judul default: ${def.label}`}
          />
        </div>
      )}

      {/* Item count (for row sections) */}
      {!def.fixed && def.height >= 100 && (
        <div>
          <label className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block mb-1">Jumlah Item Ditampilkan</label>
          <select
            className={inp + " text-xs py-1.5"}
            value={String(c.itemCount ?? 10)}
            onChange={e => update({ itemCount: Number(e.target.value) })}
          >
            {[6, 8, 10, 12, 15, 20].map(n => (
              <option key={n} value={n}>{n} item</option>
            ))}
          </select>
        </div>
      )}

      {/* Show "Lihat Semua" button */}
      {!def.fixed && def.height >= 100 && (
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Tombol "Lihat Semua"</span>
          <button
            onClick={() => update({ showMore: !c.showMore })}
            className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${c.showMore ? "bg-yellow-400" : "bg-gray-700"}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${c.showMore ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      )}

      {/* Web-specific: hero style */}
      {platform === "web" && section.id === "hero" && webConfig && onWebConfigChange && (
        <div>
          <label className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block mb-2">Style Hero</label>
          <div className="grid grid-cols-3 gap-1">
            {(["full", "compact", "minimal"] as const).map(s => (
              <button key={s} onClick={() => onWebConfigChange({ ...webConfig, heroStyle: s })}
                className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all capitalize ${webConfig.heroStyle === s ? "bg-yellow-400 text-black border-yellow-400" : "bg-[#0d1117] text-gray-500 border-white/10 hover:text-white"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Web-specific: poster size */}
      {platform === "web" && webConfig && onWebConfigChange && (
        <div>
          <label className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block mb-2">Ukuran Poster</label>
          <div className="grid grid-cols-3 gap-1">
            {(["small", "medium", "large"] as const).map(s => (
              <button key={s} onClick={() => onWebConfigChange({ ...webConfig, posterSize: s })}
                className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all capitalize ${webConfig.posterSize === s ? "bg-yellow-400 text-black border-yellow-400" : "bg-[#0d1117] text-gray-500 border-white/10 hover:text-white"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* APK: bottom nav style */}
      {platform === "apk" && section.id === "bottom_nav" && apkConfig && onApkConfigChange && (
        <div>
          <label className="text-gray-500 uppercase tracking-widest text-[9px] font-bold block mb-2">Style Bottom Nav</label>
          <div className="grid grid-cols-3 gap-1">
            {(["standard", "floating", "minimal"] as const).map(s => (
              <button key={s} onClick={() => onApkConfigChange({ ...apkConfig, bottomNavStyle: s })}
                className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all capitalize ${apkConfig.bottomNavStyle === s ? "bg-yellow-400 text-black border-yellow-400" : "bg-[#0d1117] text-gray-500 border-white/10 hover:text-white"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fixed section note */}
      {def.fixed && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
          <p className="text-gray-500 text-[9px] leading-relaxed">Elemen ini <span className="text-white font-bold">tidak bisa dipindah atau dihapus</span> karena merupakan bagian inti layout.</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SHARED SETTINGS PANEL
══════════════════════════════════════════════════════════ */
function WebSharedSettings({ config, onChange }: { config: WebLayoutConfig; onChange: (c: WebLayoutConfig) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest">Pengaturan Global Web</p>

      <div>
        <label className="text-gray-500 text-[9px] uppercase tracking-widest font-bold block mb-1">Teks Footer</label>
        <input className={inp + " text-xs py-1.5"} value={config.footerText} onChange={e => onChange({ ...config, footerText: e.target.value })} placeholder="© 2025 XpoGo" />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-300 text-xs font-bold">Search Bar di Navbar</span>
        <button onClick={() => onChange({ ...config, showNavSearch: !config.showNavSearch })}
          className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${config.showNavSearch ? "bg-yellow-400" : "bg-gray-700"}`}>
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${config.showNavSearch ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      <div>
        <p className="text-gray-500 text-[9px] uppercase tracking-widest font-bold mb-2">Menu Navbar</p>
        {config.navLinks.map(link => (
          <div key={link.id} className="flex items-center gap-2 mb-1.5">
            <button onClick={() => onChange({ ...config, navLinks: config.navLinks.map(l => l.id === link.id ? { ...l, enabled: !l.enabled } : l) })}
              className={`w-8 h-4 rounded-full relative transition-colors flex-shrink-0 ${link.enabled ? "bg-yellow-400" : "bg-gray-700"}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow ${link.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
            <input
              className="bg-[#0d1117] border border-white/10 text-white text-[10px] rounded px-2 py-1 flex-1 focus:outline-none focus:border-yellow-500"
              value={link.label}
              onChange={e => onChange({ ...config, navLinks: config.navLinks.map(l => l.id === link.id ? { ...l, label: e.target.value } : l) })}
            />
            <span className="text-gray-600 text-[9px] font-mono w-16 truncate">{link.href}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApkSharedSettings({ config, onChange }: { config: ApkLayoutConfig; onChange: (c: ApkLayoutConfig) => void }) {
  return (
    <div className="space-y-4">
      <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest">Pengaturan Global APK</p>

      <div>
        <label className="text-gray-500 text-[9px] uppercase tracking-widest font-bold block mb-2">Ukuran Poster</label>
        <div className="grid grid-cols-3 gap-1">
          {(["small", "medium", "large"] as const).map(s => (
            <button key={s} onClick={() => onChange({ ...config, posterSize: s })}
              className={`py-1.5 rounded-lg border text-[9px] font-bold transition-all capitalize ${config.posterSize === s ? "bg-yellow-400 text-black border-yellow-400" : "bg-[#0d1117] text-gray-500 border-white/10 hover:text-white"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-gray-500 text-[9px] uppercase tracking-widest font-bold block mb-2">Warna Aksen APK</label>
        <div className="flex items-center gap-2">
          <input type="color" value={config.primaryColor ?? "#E50914"} onChange={e => onChange({ ...config, primaryColor: e.target.value })}
            className="w-8 h-8 rounded cursor-pointer bg-transparent border border-white/10 p-0.5" />
          <span className="text-gray-400 text-[10px] font-mono">{config.primaryColor ?? "#E50914"}</span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN LAYOUT EDITOR
══════════════════════════════════════════════════════════ */
const DEFAULT_WEB_CONFIG: WebLayoutConfig = {
  sections: defaultSections("web"),
  heroStyle: "full",
  posterSize: "medium",
  showNavSearch: true,
  navLinks: [
    { id: "movies",  label: "Film",    href: "/movies",  enabled: true },
    { id: "tv",      label: "TV Show", href: "/tv",      enabled: true },
    { id: "donghua", label: "Donghua", href: "/donghua", enabled: true },
    { id: "people",  label: "People",  href: "/people",  enabled: false },
  ],
  footerText: "© 2025 XpoGo. All rights reserved.",
};

const DEFAULT_APK_CONFIG: ApkLayoutConfig = {
  sections: defaultSections("apk"),
  posterSize: "medium",
  primaryColor: "#E50914",
  showBottomNav: true,
  bottomNavStyle: "standard",
};

export default function LayoutEditor() {
  const qc = useQueryClient();
  const [platform, setPlatform] = useState<"web" | "apk">("web");
  const [webConfig, setWebConfig] = useState<WebLayoutConfig>(DEFAULT_WEB_CONFIG);
  const [apkConfig, setApkConfig] = useState<ApkLayoutConfig>(DEFAULT_APK_CONFIG);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGlobal, setShowGlobal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // drag state
  const dragSrcId = useRef<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ id: string; above: boolean } | null>(null);

  const { data: layoutData, isLoading } = useQuery({
    queryKey: ["layout"],
    queryFn: () => fb.getLayout(),
  });

  useEffect(() => {
    if (!layoutData) return;
    if (layoutData.web) setWebConfig({ ...DEFAULT_WEB_CONFIG, ...layoutData.web });
    if (layoutData.apk) setApkConfig({ ...DEFAULT_APK_CONFIG, ...layoutData.apk });
  }, [layoutData]);

  const save = useMutation({
    mutationFn: () => fb.setLayout({ web: webConfig, apk: apkConfig }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["layout"] }); setSaved(true); setErrMsg(""); setTimeout(() => setSaved(false), 2500); },
    onError: (e: unknown) => setErrMsg(e instanceof Error ? e.message : String(e)),
  });

  const hasWriteToken = !!getWriteToken();

  /* ── active sections (current platform) ── */
  const activeSections = sortSections(platform === "web" ? webConfig.sections : apkConfig.sections);
  const defs = getDefs(platform);

  const setActiveSections = (sections: LayoutSection[]) => {
    if (platform === "web") setWebConfig(c => ({ ...c, sections }));
    else setApkConfig(c => ({ ...c, sections }));
  };

  /* ── palette: sections not in active list ── */
  const activeIds = new Set(activeSections.map(s => s.id));
  const palette = defs.filter(d => !activeIds.has(d.id));

  /* ── selected section ── */
  const selectedSection = activeSections.find(s => s.id === selectedId) ?? null;
  const selectedDef = selectedSection ? defs.find(d => d.id === selectedSection.id) : null;

  /* ── mutations ── */
  const updateSection = (updated: LayoutSection) => {
    setActiveSections(activeSections.map(s => s.id === updated.id ? updated : s));
  };

  const toggleSection = (id: string) => {
    setActiveSections(activeSections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const removeSection = (id: string) => {
    const filtered = activeSections.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i }));
    setActiveSections(filtered);
    if (selectedId === id) setSelectedId(null);
  };

  const addSection = (def: SectionDef) => {
    const maxOrder = activeSections.reduce((m, s) => Math.max(m, s.order), -1);
    // insert before fixed "footer" or "bottom_nav"
    const lastFixed = [...activeSections].reverse().find(s => defs.find(d => d.id === s.id)?.fixed);
    const insertAt = lastFixed ? lastFixed.order : maxOrder + 1;
    const newSection: LayoutSection = { id: def.id, enabled: true, order: insertAt, config: {} };
    const updated = activeSections.map(s => s.order >= insertAt && s.id !== newSection.id ? { ...s, order: s.order + 1 } : s);
    setActiveSections(sortSections([...updated, newSection]).map((s, i) => ({ ...s, order: i })));
    setSelectedId(def.id);
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    const sorted = sortSections(activeSections);
    const idx = sorted.findIndex(s => s.id === id);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    if (defs.find(d => d.id === sorted[idx].id)?.fixed) return;
    if (defs.find(d => d.id === sorted[targetIdx].id)?.fixed) return;
    const next = [...sorted];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    setActiveSections(next.map((s, i) => ({ ...s, order: i })));
  };

  /* ── drag & drop ── */
  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragSrcId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string, above: boolean) => {
    e.preventDefault();
    if (dragSrcId.current !== id) setDragOverInfo({ id, above });
  };

  const handleDrop = (e: React.DragEvent, targetId: string, above: boolean) => {
    e.preventDefault();
    const srcId = dragSrcId.current;
    if (!srcId || srcId === targetId) { setDragOverInfo(null); return; }
    const srcDef = defs.find(d => d.id === srcId);
    const tgtDef = defs.find(d => d.id === targetId);
    if (srcDef?.fixed || tgtDef?.fixed) { setDragOverInfo(null); return; }

    const sorted = sortSections(activeSections);
    const srcIdx = sorted.findIndex(s => s.id === srcId);
    let tgtIdx = sorted.findIndex(s => s.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) { setDragOverInfo(null); return; }

    const next = sorted.filter(s => s.id !== srcId);
    if (!above) tgtIdx = sorted.findIndex(s => s.id === targetId);
    const insertIdx = above ? next.findIndex(s => s.id === targetId) : next.findIndex(s => s.id === targetId) + 1;
    next.splice(Math.max(0, insertIdx), 0, sorted[srcIdx]);
    setActiveSections(next.map((s, i) => ({ ...s, order: i })));
    dragSrcId.current = null;
    setDragOverInfo(null);
  };

  const handleDragEnd = () => {
    dragSrcId.current = null;
    setDragOverInfo(null);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-yellow-400" /></div>;

  const DeviceFrame = platform === "web" ? WebFrame : PhoneFrame;

  return (
    <div className="pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-yellow-400 text-xl font-black flex items-center gap-2">
          <LayoutDashboard size={20} /> Layout Editor
        </h2>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !hasWriteToken}
          className={`${yaBtn} flex items-center gap-1.5 py-2`}
        >
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
          {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>

      {!hasWriteToken && (
        <div className={`${card} p-3 border-orange-500/30 bg-orange-500/5 flex items-center gap-2`}>
          <AlertTriangle size={14} className="text-orange-400" />
          <p className="text-orange-400 text-xs">Logout & login ulang dengan Firebase Secret agar bisa menyimpan layout.</p>
        </div>
      )}

      {errMsg && <div className={`${card} p-3 border-red-500/30 bg-red-500/5 text-red-400 text-xs`}>⚠️ {errMsg}</div>}

      {/* Platform Switcher */}
      <div className="flex bg-[#161b27] rounded-xl p-1 border border-white/[0.08]">
        <button
          onClick={() => { setPlatform("web"); setSelectedId(null); setShowGlobal(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${platform === "web" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}
        >
          <Monitor size={16} /> 🌐 Web Layout
        </button>
        <button
          onClick={() => { setPlatform("apk"); setSelectedId(null); setShowGlobal(false); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${platform === "apk" ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}`}
        >
          <Smartphone size={16} /> 📱 APK Layout
        </button>
      </div>

      {/* 3-Panel Editor */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "160px 1fr 180px" }}>

        {/* LEFT: Palette */}
        <div className={`${card} p-3 space-y-2 overflow-hidden`}>
          <div className="flex items-center gap-1.5 mb-3">
            <Layers size={12} className="text-yellow-400" />
            <p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest">Tambah Elemen</p>
          </div>
          {palette.length === 0 ? (
            <p className="text-gray-600 text-[10px] text-center py-4 leading-relaxed">Semua elemen sudah ada di layout.</p>
          ) : (
            palette.map(def => (
              <PaletteItem key={def.id} def={def} onAdd={() => addSection(def)} />
            ))
          )}

          <div className="pt-2 border-t border-white/5">
            <button
              onClick={() => { setShowGlobal(!showGlobal); setSelectedId(null); }}
              className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${showGlobal ? "bg-yellow-400/10 text-yellow-400" : "text-gray-500 hover:text-white"}`}
            >
              <Settings2 size={11} /> Pengaturan Global
            </button>
          </div>
        </div>

        {/* CENTER: Device Preview */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-gray-500 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Preview langsung — drag untuk reorder
          </div>

          <DeviceFrame>
            {activeSections.map((section, idx) => {
              const def = defs.find(d => d.id === section.id);
              if (!def) return null;
              const sorted = activeSections;
              const canMoveUp = idx > 0 && !defs.find(d => d.id === sorted[idx - 1]?.id)?.fixed;
              const canMoveDown = idx < sorted.length - 1 && !defs.find(d => d.id === sorted[idx + 1]?.id)?.fixed;
              return (
                <SectionBlock
                  key={section.id}
                  section={section}
                  def={def}
                  selected={selectedId === section.id}
                  dragOver={dragOverInfo?.id === section.id}
                  dragAbove={dragOverInfo?.id === section.id ? dragOverInfo.above : false}
                  onSelect={() => { setSelectedId(section.id); setShowGlobal(false); }}
                  onToggle={() => toggleSection(section.id)}
                  onRemove={() => removeSection(section.id)}
                  onMoveUp={() => moveSection(section.id, -1)}
                  onMoveDown={() => moveSection(section.id, 1)}
                  canMoveUp={canMoveUp}
                  canMoveDown={canMoveDown}
                  canRemove={!def.fixed}
                  draggable={!def.fixed}
                  onDragStart={e => handleDragStart(e, section.id)}
                  onDragOver={(e, above) => handleDragOver(e, section.id, above)}
                  onDrop={(e, above) => handleDrop(e, section.id, above)}
                  onDragEnd={handleDragEnd}
                />
              );
            })}
          </DeviceFrame>

          <p className="text-gray-600 text-[9px]">
            {activeSections.filter(s => s.enabled).length} aktif · {activeSections.filter(s => !s.enabled).length} tersembunyi
          </p>
        </div>

        {/* RIGHT: Properties */}
        <div className={`${card} p-3 overflow-y-auto`} style={{ maxHeight: 600 }}>
          {showGlobal ? (
            platform === "web"
              ? <WebSharedSettings config={webConfig} onChange={setWebConfig} />
              : <ApkSharedSettings config={apkConfig} onChange={setApkConfig} />
          ) : selectedSection && selectedDef ? (
            <PropsPanel
              section={selectedSection}
              def={selectedDef}
              onChange={updateSection}
              platform={platform}
              webConfig={webConfig}
              apkConfig={apkConfig}
              onWebConfigChange={setWebConfig}
              onApkConfigChange={setApkConfig}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Settings2 size={24} className="text-gray-700" />
              <p className="text-gray-600 text-[10px] text-center leading-relaxed">
                Klik elemen di preview untuk edit properties-nya, atau pilih "Pengaturan Global" di kiri.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className={`${card} p-3 bg-blue-500/5 border-blue-500/20 grid grid-cols-2 gap-x-4 gap-y-1`}>
        <div className="col-span-2 flex items-center gap-1.5 mb-1">
          <Globe size={10} className="text-blue-400" />
          <p className="text-blue-400 text-[10px] font-bold">Tips Layout Editor</p>
        </div>
        {[
          ["🖱️ Klik elemen", "Edit properties di panel kanan"],
          ["↕️ Drag & drop", "Ubah urutan tampilan"],
          ["👁️ Toggle mata", "Sembunyikan/tampilkan section"],
          ["🗑️ Hapus", "Pindah ke palette (bisa ditambah lagi)"],
          ["📦 Panel kiri", "Tambah section dari palette"],
          ["⚙️ Global Settings", "Navbar, footer, warna aksen"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-start gap-1.5">
            <span className="text-[9px] text-gray-400 font-bold flex-shrink-0">{k}:</span>
            <span className="text-[9px] text-gray-600">{v}</span>
          </div>
        ))}
      </div>

      <div className={`${card} p-3 bg-green-500/5 border-green-500/20`}>
        <p className="text-green-400 text-xs font-bold mb-1">📡 Auto-sync ke Web & APK</p>
        <p className="text-gray-500 text-[10px] leading-relaxed">
          Layout Web dan APK disimpan terpisah di Firebase (<code className="text-white/60 font-mono">layout/web</code> dan <code className="text-white/60 font-mono">layout/apk</code>).
          Website membaca config Web, APK membaca config APK — reload otomatis setelah simpan.
        </p>
      </div>
    </div>
  );
}
