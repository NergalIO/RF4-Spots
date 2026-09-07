import { Router } from "express";
import { interactionsRouter } from "./posts/interactions.js";
import { markersRouter } from "./posts/markers.js";
import { readRouter } from "./posts/read.js";
import { writeRouter } from "./posts/write.js";

export const postsRouter = Router();
postsRouter.use(markersRouter);
postsRouter.use(readRouter);
postsRouter.use(writeRouter);
postsRouter.use(interactionsRouter);
