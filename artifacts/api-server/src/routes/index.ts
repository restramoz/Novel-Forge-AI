import { Router, type IRouter } from "express";
import healthRouter from "./health";
import novelsRouter from "./novels";
import chaptersRouter from "./chapters";
import generateRouter from "./generate";

const router: IRouter = Router();

router.use(healthRouter);
router.use(novelsRouter);
router.use("/novels/:id/chapters", chaptersRouter);
router.use("/novels/:id", generateRouter);

export default router;
