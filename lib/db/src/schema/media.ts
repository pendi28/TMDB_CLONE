import { pgTable, serial, text, integer, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mediaTable = pgTable("media", {
  id:               serial("id").primaryKey(),
  source:           text("source").notNull(),          // "tmdb" | "anilist"
  sourceId:         integer("source_id").notNull(),
  mediaType:        text("media_type").notNull(),       // "anime" | "donghua"
  title:            text("title").notNull(),
  titleRomaji:      text("title_romaji"),
  titleNative:      text("title_native"),
  posterUrl:        text("poster_url"),
  backdropUrl:      text("backdrop_url"),
  overview:         text("overview"),
  score:            numeric("score", { precision: 5, scale: 2 }),
  popularity:       integer("popularity"),
  genres:           text("genres"),                    // JSON string array
  originalLanguage: text("original_language"),         // "ja" | "zh"
  countryOfOrigin:  text("country_of_origin"),         // "JP" | "CN"
  status:           text("status"),
  episodes:         integer("episodes"),
  season:           text("season"),
  seasonYear:       integer("season_year"),
  format:           text("format"),
  isAiring:         integer("is_airing").default(0),   // 0/1
  syncedAt:         timestamp("synced_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  uniqSourceId: uniqueIndex("media_source_source_id_idx").on(t.source, t.sourceId),
}));

export const insertMediaSchema = createInsertSchema(mediaTable).omit({ id: true, syncedAt: true, updatedAt: true });
export type InsertMedia = z.infer<typeof insertMediaSchema>;
export type Media = typeof mediaTable.$inferSelect;
