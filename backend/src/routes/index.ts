import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import lawyersRouter from "./lawyers";
import casesRouter from "./cases";
import requestsRouter from "./requests";
import messagesRouter from "./messages";
import reviewsRouter from "./reviews";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/lawyers", lawyersRouter);
router.use("/cases", casesRouter);
router.use("/requests", requestsRouter);
router.use("/messages", messagesRouter);
router.use("/reviews", reviewsRouter);
router.use("/notifications", notificationsRouter);
router.use("/admin", adminRouter);

export default router;
