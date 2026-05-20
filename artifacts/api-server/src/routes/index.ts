import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import adminRouter from "./admin.js";
import tmdbRouter from "./tmdb.js";
import settingsRouter from "./settings.js";
import adsRouter from "./ads.js";
import embedsRouter from "./embeds.js";
import customMoviesRouter from "./custom-movies.js";
import messagesRouter from "./messages.js";
import commentsRouter from "./comments.js";
import syncRouter from "./sync.js";
import anilistRouter from "./anilist.js";
import mediaRouter from "./media.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(tmdbRouter);
router.use(anilistRouter);
router.use(settingsRouter);
router.use(adsRouter);
router.use(embedsRouter);
router.use(customMoviesRouter);
router.use(messagesRouter);
router.use(commentsRouter);
router.use(syncRouter);
router.use(mediaRouter);  // ← data dari DB (anime & donghua)

export default router;
