import { z } from "zod";

export const nickname = z
  .string()
  .trim()
  .min(2, "Ник слишком короткий")
  .max(24, "Ник слишком длинный")
  .regex(/^[\p{L}\p{N}_-]+$/u, "Только буквы, цифры, _ и -");

export const loginBody = z.object({
  nickname,
  password: z.string().min(1, "Введите пароль").max(72),
});

export const registerBody = z.object({
  nickname,
  password: z.string().min(8, "Пароль от 8 символов").max(72),
  invite: z.string().trim().max(32).optional().default(""),
});

export const passwordBody = z.object({
  current: z.string().min(1, "Введите текущий пароль").max(72),
  next: z.string().min(8, "Пароль от 8 символов").max(72),
});
