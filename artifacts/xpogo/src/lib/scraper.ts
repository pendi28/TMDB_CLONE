// Menggunakan Public API Consumet yang stabil
const API_BASE = "https://api.consumet.org/anime/gogoanime";

export const getAutoStream = async (title: string, originalTitle: string, episode: number) => {
  try {
    // 1. Cari ID Anime (Coba pakai judul asli China dulu agar akurat)
    const searchRes = await fetch(`${API_BASE}/${encodeURIComponent(originalTitle || title)}`);
    const searchData = await searchRes.json();
    
    if (searchData.results && searchData.results.length > 0) {
      const animeId = searchData.results[0].id;
      
      // 2. Ambil link streaming episode tersebut
      const streamRes = await fetch(`${API_BASE}/watch/${animeId}-episode-${episode}`);
      const streamData = await streamRes.json();
      
      if (streamData.sources) {
        // Ambil kualitas terbaik (default/auto)
        const source = streamData.sources.find((s: any) => s.quality === 'default' || s.quality === 'auto') || streamData.sources[0];
        return source.url; // Mengembalikan link .m3u8
      }
    }
    return null;
  } catch (error) {
    console.error("Scraper Error:", error);
    return null;
  }
};
