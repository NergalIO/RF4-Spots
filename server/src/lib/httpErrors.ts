import type { ZodError } from "zod";

export function zodError(err: ZodError): string {
  return err.issues[0]?.message ?? "Неверные данные";
}
