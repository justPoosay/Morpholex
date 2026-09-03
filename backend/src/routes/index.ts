import { Router, type IRouter } from "express";
import adminRouter from "./admin";
import healthRouter from "./health";
import wordsRouter from "./words";

const router: IRouter = Router();

router.use(adminRouter);
router.use(healthRouter);
router.use(wordsRouter);

export default router;
