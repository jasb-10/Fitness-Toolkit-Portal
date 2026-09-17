import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicRouter from "./public";
import meRouter from "./me";
import coursesRouter from "./courses";
import lessonsRouter from "./lessons";
import dfyRouter from "./dfy";
import adminRouter from "./admin";
import supportRouter from "./support";
import adminSupportRouter from "./admin-support";
import storageRouter from "./storage";
import eventsRouter from "./events";
import invoicesRouter from "./invoices";
import comebackRouter from "./comeback";
import websiteRouter from "./website";
import ghlRouter from "./ghl";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicRouter);
router.use(meRouter);
router.use(coursesRouter);
router.use(lessonsRouter);
router.use(dfyRouter);
router.use(adminRouter);
router.use(supportRouter);
router.use(adminSupportRouter);
router.use(storageRouter);
router.use(eventsRouter);
router.use(invoicesRouter);
router.use(comebackRouter);
router.use(websiteRouter);
router.use(ghlRouter);

export default router;
