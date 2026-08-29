import { Router } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { usersRouter } from "./users.js";
import { invitesRouter } from "./invites.js";
import { reportsAdminRouter } from "./reports.js";
import { statsRouter } from "./stats.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);
adminRouter.use("/users", usersRouter);
adminRouter.use("/invites", invitesRouter);
adminRouter.use("/reports", reportsAdminRouter);
adminRouter.use("/stats", statsRouter);
