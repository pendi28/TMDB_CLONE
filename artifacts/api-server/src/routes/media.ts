import { Router } from "express";
import { db, mediaTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// GET /api/media
// Query params: type=anime|donghua, source=tmdb|anilist, page=1, limit=20
router.get("/media", async (req, res) => {
  try {
    const {
      type,
      source,
      page: pageStr = "1",
      limit: limitStr = "20",
    } = req.query as Record<string, string>;

    const page  = Math.max(1, parseInt(pageStr) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    if (type   === "anime"   || type   === "donghua") conditions.push(eq(mediaTable.mediaType, type));
    if (source === "tmdb"    || source === "anilist")  conditions.push(eq(mediaTable.source, source));

    const where = conditions.length ? and(...conditions) : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.select().from(mediaTable)
        .where(where)
        .orderBy(desc(mediaTable.updatedAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(mediaTable).where(where),
    ]);

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      results: items.map(row => ({
        ...row,
        genres: row.genres ? JSON.parse(row.genres) : [],
        score: row.score ? parseFloat(String(row.score)) : null,
      })),
    });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/media/anime — shortcut
router.get("/media/anime", async (req, res) => {
  req.query.type = "anime";
  return router.handle(req as any, res as any, () => {});
});

// GET /api/media/donghua — shortcut
router.get("/media/donghua", async (req, res) => {
  req.query.type = "donghua";
  return router.handle(req as any, res as any, () => {});
});

// GET /api/media/:source/:id — detail satu item
router.get("/media/:source/:id", async (req, res) => {
  try {
    const { source, id } = req.params;
    const [item] = await db.select().from(mediaTable)
      .where(and(eq(mediaTable.source, source), eq(mediaTable.sourceId, parseInt(id))))
      .limit(1);
    if (!item) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...item, genres: item.genres ? JSON.parse(item.genres) : [] });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
