import type { FormEvent } from "react";
import type { Api } from "@/api";
import type { Invite } from "@/types";

export async function patchUser(api: Api, id: string, body: { role?: "player" | "admin"; disabled?: boolean }) {
  await api.admin.patchUser(id, body);
}

export async function deleteUser(api: Api, id: string, nickname: string) {
  if (!window.confirm(`Удалить игрока «${nickname}» и все его посты?`)) return false;
  await api.admin.deleteUser(id);
  return true;
}

export async function createInvite(api: Api, e: FormEvent) {
  e.preventDefault();
  const { invite } = await api.admin.createInvite();
  return invite as Invite;
}

export async function resolveReport(api: Api, id: string, hide: boolean) {
  await api.admin.patchReport(id, { status: "resolved", hide });
}

export async function reopenReport(api: Api, id: string) {
  await api.admin.patchReport(id, { status: "open" });
}
