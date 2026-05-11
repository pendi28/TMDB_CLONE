// Menggunakan provider utama dari Consumet (GogoAnime & Bilibili support)
const API_BASE = "https://api-consumet-org-three.vercel.app/anime/gogoanime";

export interface StreamSource {
  url: string;
  isM3U8: boolean;
  quality: string;
}

export const scraper = {
  /**
   * Mencari ID Anime yang akurat berdasarkan data dari TMDB.
   * Kita mencoba mencari dengan Judul Inggris, jika gagal pakai Nama Asli (Pinyin).
   */
  findAnimeId: async (tmdbName: string, originalName: string) => {
    try {
      // Step 1: Cari dengan nama asli (biasanya Pinyin untuk Donghua) agar lebih akurat
      let response = await fetch(`${API_BASE}/${encodeURIComponent(originalName)}`);
      let data = await response.json();

      // Step 2: Jika tidak ketemu, coba cari dengan nama internasional/Inggris
      if (!data.results || data.results.length === 0) {
        response = await fetch(`${API_BASE}/${encodeURIComponent(tmdbName)}`);
        data = await response.json();
      }

      if (data.results && data.results.length > 0) {
        // Ambil hasil pertama yang paling relevan
        return data.results[0].id;
      }
      return null;
    } catch (error) {
      console.error("Scraper Search Error:", error);
      return null;
    }
  },

  /**
   * Mengambil link streaming (.m3u8) berdasarkan Anime ID dan Nomor Episode.
   */
  getEpisodeStream: async (animeId: string, episode: number): Promise<StreamSource | null> => {
    try {
      // Format ID untuk episode biasanya: anime-id-episode-1
      const episodeId = `${animeId}-episode-${episode}`;
      const response = await fetch(`${API_BASE}/watch/${episodeId}`);
      const data = await response.json();

      if (data.sources && data.sources.length > 0) {
        // Prioritas ambil kualitas 'default' atau '720p/1080p'
        const bestSource = data.sources.find((s: any) => s.quality === 'default' || s.quality === 'auto') 
                          || data.sources[0];
        
        return {
          url: bestSource.url,
          isM3U8: bestSource.url.includes('.m3u8'),
          quality: bestSource.quality
        };
      }
      return null;
    } catch (error) {
      console.error("Scraper Stream Error:", error);
      return null;
    }
  }
};
