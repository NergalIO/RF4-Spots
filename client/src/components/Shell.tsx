import { useCallback, useEffect, useRef, useState } from "react";
import { cafeUrlForWaterbody, waterbodyIdFromCafeUrl } from "../cafe";
import { ALL_WATERBODIES } from "../constants";
import { MapView } from "./MapView";
import { PostDetail } from "./PostDetail";
import { PostForm } from "./PostForm";
import { PostList } from "./PostList";
import { Lightbox } from "./Lightbox";
import { GameClock } from "./GameClock";
import { SiteEmbed } from "./SiteEmbed";
import { ToolsView } from "./ToolsView";
import { SessionView } from "./SessionView";
import { AdminView } from "./AdminView";
import { PasswordModal } from "./PasswordModal";
import { useStore } from "../store";
import { useResizablePanels } from "../useResizablePanels";
import type { Post, Screenshot } from "../types";

const TAB_KEY = "rf4spots-main-tab";
type MainTab = "spots" | "session" | "stats" | "cafe" | "tools" | "admin";

function loadTab(): MainTab {
  try {
    const v = localStorage.getItem(TAB_KEY);
    if (v === "stats" || v === "cafe" || v === "tools" || v === "session" || v === "admin") return v;
  } catch {
    /* ignore */
  }
  return "spots";
}

function tabCaption(tab: MainTab) {
  if (tab === "stats") return "статистика улова";
  if (tab === "cafe") return "заказы кафе";
  if (tab === "tools") return "полезные функции";
  if (tab === "session") return "сессия улова";
  if (tab === "admin") return "админка";
  return "точки ловли";
}

export function Shell() {
  const user = useStore((s) => s.user);
  const waterbodies = useStore((s) => s.waterbodies);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const setWaterbody = useStore((s) => s.setWaterbody);
  const rulerOn = useStore((s) => s.rulerOn);
  const toggleRuler = useStore((s) => s.toggleRuler);
  const logout = useStore((s) => s.logout);
  const detail = useStore((s) => s.detail);
  const [createAt, setCreateAt] = useState<{ x: number; y: number } | null>(null);
  const [edit, setEdit] = useState<Post | null>(null);
  const [lb, setLb] = useState<{ shots: Screenshot[]; index: number } | null>(null);
  const [tab, setTab] = useState<MainTab>(loadTab);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const panels = useResizablePanels();
  const feedOnly = waterbodyId === ALL_WATERBODIES;
  const spotsTab = tab === "spots";
  const cafeUrl = cafeUrlForWaterbody(waterbodyId);

  const onCafeNavigate = useCallback(
    (url: string) => {
      const id = waterbodyIdFromCafeUrl(url);
      if (!id || id === ALL_WATERBODIES || id === useStore.getState().waterbodyId) return;
      void setWaterbody(id);
    },
    [setWaterbody],
  );

  useEffect(() => {
    try {
      localStorage.setItem(TAB_KEY, tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  useEffect(() => {
    if ((tab === "admin" || tab === "session") && user?.role !== "admin") setTab("spots");
  }, [tab, user?.role]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="logo">RF4</span>
          <div>
            <strong>Spots</strong>
            <small>{tabCaption(tab)}</small>
          </div>
        </div>
        <div className="nav-tabs" role="tablist" aria-label="Разделы">
          <button type="button" role="tab" aria-selected={spotsTab} className={spotsTab ? "on" : ""} onClick={() => setTab("spots")}>
            Споты
          </button>
          {user?.role === "admin" && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "session"}
              className={tab === "session" ? "on" : ""}
              onClick={() => setTab("session")}
            >
              Сессия
            </button>
          )}
          <button type="button" role="tab" aria-selected={tab === "stats"} className={tab === "stats" ? "on" : ""} onClick={() => setTab("stats")}>
            Статистика
          </button>
          <button type="button" role="tab" aria-selected={tab === "cafe"} className={tab === "cafe" ? "on" : ""} onClick={() => setTab("cafe")}>
            Кафе
          </button>
          <button type="button" role="tab" aria-selected={tab === "tools"} className={tab === "tools" ? "on" : ""} onClick={() => setTab("tools")}>
            Полезные функции
          </button>
          {user?.role === "admin" && (
            <button type="button" role="tab" aria-selected={tab === "admin"} className={tab === "admin" ? "on" : ""} onClick={() => setTab("admin")}>
              Админ
            </button>
          )}
        </div>
        <label className="wb-select">
          Водоём
          <select value={waterbodyId} onChange={(e) => void setWaterbody(e.target.value)}>
            <option value={ALL_WATERBODIES}>Все водоёмы</option>
            {waterbodies.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        {!feedOnly && spotsTab && (
          <button type="button" className={`btn ghost ${rulerOn ? "on" : ""}`} onClick={toggleRuler}>
            Линейка
          </button>
        )}
        {spotsTab && (
          <>
            <button type="button" className={`btn ghost sm ${panels.leftOpen ? "on" : ""}`} onClick={() => panels.setLeftOpen((v) => !v)}>
              Посты
            </button>
            <button type="button" className={`btn ghost sm ${panels.rightOpen ? "on" : ""}`} onClick={() => panels.setRightOpen((v) => !v)}>
              Детали
            </button>
          </>
        )}
        <div className="spacer" />
        <GameClock />
        <div className="user-menu" ref={userMenuRef}>
          <button
            type="button"
            className={`role-pill ${user?.role ?? ""} ${userMenuOpen ? "open" : ""}`}
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen((v) => !v)}
          >
            {user?.nickname} · {user?.role === "admin" ? "админ" : "игрок"}
          </button>
          {userMenuOpen && (
            <div className="user-menu-list" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  setPasswordOpen(true);
                }}
              >
                Пароль
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  void logout();
                }}
              >
                Выход
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="app-main">
        <div className={`workspace ${feedOnly ? "feed-only" : ""}`} hidden={!spotsTab}>
          {panels.leftOpen ? (
            <>
              <div className={`pane pane-left ${feedOnly ? "fill" : ""}`} style={feedOnly ? undefined : { width: panels.leftWidth }}>
                <PostList onCollapse={() => panels.setLeftOpen(false)} />
              </div>
              {!feedOnly && (
                <div
                  className="resize-handle"
                  onPointerDown={panels.onDrag("left")}
                  onDoubleClick={() => panels.resetWidth("left")}
                  title="Потяните, чтобы изменить ширину"
                />
              )}
            </>
          ) : (
            <button type="button" className="pane-rail" onClick={() => panels.setLeftOpen(true)} title="Показать посты">
              ›
            </button>
          )}
          {!feedOnly && (
            <div className="pane-center">
              <MapView onCreate={setCreateAt} />
            </div>
          )}
          {panels.rightOpen ? (
            <>
              <div
                className="resize-handle"
                onPointerDown={panels.onDrag("right")}
                onDoubleClick={() => panels.resetWidth("right")}
                title="Потяните, чтобы изменить ширину"
              />
              <div
                className={`pane pane-right ${feedOnly && !panels.leftOpen ? "fill" : ""}`}
                style={feedOnly && !panels.leftOpen ? undefined : { width: panels.rightWidth }}
              >
                <PostDetail
                  onEdit={() => detail && setEdit(detail)}
                  onOpenShots={(shots, index) => setLb({ shots, index })}
                  onCollapse={() => panels.setRightOpen(false)}
                />
              </div>
            </>
          ) : (
            <button type="button" className="pane-rail" onClick={() => panels.setRightOpen(true)} title="Показать детали">
              ‹
            </button>
          )}
        </div>
        {tab === "session" && user?.role === "admin" && (
          <div className="tools-shell">
            <SessionView active />
          </div>
        )}
        <div className="site-host" hidden={tab !== "stats"}>
          <SiteEmbed url="https://rf4-stat.ru/" title="RF4-STAT" partition="persist:rf4stat" active={tab === "stats"} />
        </div>
        <div className="site-host" hidden={tab !== "cafe"}>
          <SiteEmbed url={cafeUrl} title="RF4 Cafe" partition="persist:rf4cafe" active={tab === "cafe"} onNavigate={onCafeNavigate} />
        </div>
        {tab === "tools" && (
          <div className="tools-shell">
            <ToolsView active />
          </div>
        )}
        {tab === "admin" && user?.role === "admin" && (
          <div className="tools-shell">
            <AdminView />
          </div>
        )}
      </div>
      {createAt && <PostForm coords={createAt} onClose={() => setCreateAt(null)} />}
      {edit && (
        <PostForm coords={{ x: edit.coordX, y: edit.coordY }} post={edit} onClose={() => setEdit(null)} />
      )}
      {lb && (
        <Lightbox shots={lb.shots} index={lb.index} onClose={() => setLb(null)} onIndex={(index) => setLb({ ...lb, index })} />
      )}
      {passwordOpen && <PasswordModal onClose={() => setPasswordOpen(false)} />}
    </div>
  );
}
