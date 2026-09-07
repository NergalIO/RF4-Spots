import { useCallback, useState } from "react";
import { useStore } from "@/store";
import { useBackGuard } from "@/shared/useBackGuard";
import { useIsMobile } from "@/shared/platform";
import type { Post, Screenshot } from "@/types";

export type SpotsLightbox = { shots: Screenshot[]; index: number };

export function useSpotsDialogs() {
  const detail = useStore((s) => s.detail);
  const selectPost = useStore((s) => s.selectPost);
  const isMobile = useIsMobile();
  const [createAt, setCreateAt] = useState<{ x: number; y: number } | null>(null);
  const [edit, setEdit] = useState<Post | null>(null);
  const [lb, setLb] = useState<SpotsLightbox | null>(null);
  const [screen, setScreen] = useState<"list" | "map">("list");
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = useCallback(() => setDetailOpen(true), []);

  function closeDetail() {
    setDetailOpen(false);
    void selectPost(null);
  }

  function showOnMap() {
    setDetailOpen(false);
    setScreen("map");
  }

  useBackGuard(isMobile && detailOpen, closeDetail);
  useBackGuard(Boolean(lb), () => setLb(null));
  useBackGuard(Boolean(createAt), () => setCreateAt(null));
  useBackGuard(Boolean(edit), () => setEdit(null));

  return {
    detail,
    createAt,
    setCreateAt,
    edit,
    setEdit,
    lb,
    setLb,
    screen,
    setScreen,
    detailOpen,
    openDetail,
    closeDetail,
    showOnMap,
  };
}
