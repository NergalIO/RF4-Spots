import { rateLimit } from "express-rate-limit";
import { envFlag } from "./env.js";

function trustForwarded() {
  return envFlag("TRUST_PROXY", false);
}

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: trustForwarded() },
  handler: (_req, res) => {
    res.status(429).json({ error: "Слишком много попыток входа. Подождите." });
  },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: trustForwarded() },
  handler: (_req, res) => {
    res.status(429).json({ error: "Слишком много регистраций с этого адреса." });
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: trustForwarded() },
  handler: (_req, res) => {
    res.status(429).json({ error: "Слишком много загрузок. Подождите." });
  },
});
