import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, User, ChevronDown, Heart, BookmarkCheck, BookOpen } from "lucide-react";

const NAV_LINKS = [
  { label: "HOME", href: "/" },
  { label: "MOVIE", href: "/movies" },
  { label: "DONGHUA", href: "/donghua" },
  { label: "TV SHOW", href: "/tv" },
  { label: "ANIME",     href: "/anime" },   // ✅ NEW
  { label: "MANGA",     href: "/manga" },   // ✅ NEW
  { label: "FAVORIT", href: "/search" },
  { label: "COMMUNITY", href: "/people" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setMobileOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0d0000]/98 shadow-[0_2px_20px_rgba(139,0,0,0.4)]"
            : "bg-gradient-to-b from-[#0d0000] to-transparent"
        }`}
        style={{ marginTop: "var(--banner-top-height, 0px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <span className="text-2xl font-black tracking-widest text-glow-red"
                style={{ color: "#E50914", fontFamily: "Georgia, serif", letterSpacing: "0.15em" }}>
                XPOGO
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-1.5 text-[11px] font-bold tracking-widest transition-colors ${
                    location === l.href
                      ? "text-[#E50914] border-b-2 border-[#E50914]"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Right: Search + Account */}
            <div className="flex items-center gap-3">
              {/* Search */}
              {searchOpen ? (
                <form onSubmit={handleSearch} className="flex items-center">
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari film..."
                    className="bg-black/60 border border-[#8B0000] text-white text-sm rounded px-3 py-1.5 w-44 focus:outline-none focus:border-[#E50914] placeholder:text-gray-600"
                  />
                  <button type="button" onClick={() => setSearchOpen(false)} className="ml-2 text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button onClick={() => setSearchOpen(true)} className="text-gray-300 hover:text-[#E50914] transition-colors p-1">
                  <Search className="w-5 h-5" />
                </button>
              )}

              {/* Account Dropdown */}
              <div className="relative hidden md:block" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="flex items-center gap-1.5 bg-[#1a0000] border border-[#8B0000] text-white text-xs font-bold px-3 py-1.5 rounded hover:border-[#E50914] transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-[#E50914]" />
                  <span>Account</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${accountOpen ? "rotate-180" : ""}`} />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-[#1a0000] border border-[#8B0000] rounded shadow-[0_4px_20px_rgba(139,0,0,0.5)] w-44 py-1 z-50">
                    <div className="px-3 py-2 border-b border-[#8B0000]/40 mb-1">
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">Enter your account</p>
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      <input placeholder="Username" className="w-full bg-black/50 border border-[#8B0000]/50 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#E50914]" />
                      <input type="password" placeholder="Password" className="w-full bg-black/50 border border-[#8B0000]/50 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#E50914]" />
                      <button className="text-[10px] text-[#E50914] hover:underline block">Forget password?</button>
                      <button className="w-full bg-[#E50914] hover:bg-[#CC0000] text-white text-xs font-bold py-1.5 rounded transition-colors">
                        LOGIN
                      </button>
                    </div>
                    <div className="px-3 py-2 border-t border-[#8B0000]/40 mt-1 space-y-1">
                      {[
                        { icon: User, label: "My Account" },
                        { icon: BookmarkCheck, label: "Watchlist" },
                        { icon: Heart, label: "Collection" },
                        { icon: BookOpen, label: "User Guide" },
                      ].map(({ icon: Icon, label }) => (
                        <button key={label} className="flex items-center gap-2 w-full text-left text-xs text-gray-300 hover:text-white py-0.5">
                          <Icon className="w-3 h-3 text-[#E50914]" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger */}
              <button onClick={() => setMobileOpen(true)} className="md:hidden text-gray-300 hover:text-white p-1">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#0d0000] border-r border-[#8B0000]/40 flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#8B0000]/30">
              <span className="text-xl font-black tracking-widest text-glow-red" style={{ color: "#E50914" }}>XPOGO</span>
              <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearch} className="px-5 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E50914]" />
                <input
                  type="text"
                  placeholder="Cari film, series..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/60 border border-[#8B0000] text-white text-sm rounded pl-9 pr-3 py-2 focus:outline-none focus:border-[#E50914] placeholder:text-gray-600"
                />
              </div>
            </form>

            <nav className="flex-1 px-5 space-y-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded text-sm font-bold tracking-widest transition-colors ${
                    location === l.href
                      ? "bg-[#8B0000]/30 text-[#E50914]"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="px-5 py-4 border-t border-[#8B0000]/30 space-y-2">
              <input placeholder="Username" className="w-full bg-black/50 border border-[#8B0000]/50 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#E50914]" />
              <input type="password" placeholder="Password" className="w-full bg-black/50 border border-[#8B0000]/50 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-[#E50914]" />
              <button className="w-full bg-[#E50914] hover:bg-[#CC0000] text-white text-sm font-bold py-2 rounded transition-colors">
                LOGIN
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
