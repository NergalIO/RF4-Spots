import { useCallback, useEffect, useState } from "react";
import { cafeUrlForWaterbody, waterbodyIdFromCafeUrl } from "@/cafe";
import { ALL_WATERBODIES } from "@/constants";
import { GameClock } from "./GameClock";
import { SiteEmbed } from "./SiteEmbed";
import { ToolsView } from "../tools/ToolsView";
import { AdminView } from "../admin/AdminView";
import { PasswordModal } from "../auth/PasswordModal";
import { useStore } from "@/store";
import { useResizablePanels } from "@/useResizablePanels";
import { usePersistedTab } from "@/shared/usePersistedTab";
import { DropdownMenu } from "@/shared/DropdownMenu";
import { SpotsLayout } from "../spots/SpotsLayout";

const TAB_KEY = "rf4spots-main-tab";
const MAIN_TABS = ["spots", "stats", "cafe", "tools", "admin"] as const;
type MainTab = (typeof MAIN_TABS)[number];

function tabCaption(tab: MainTab) {
  if (tab === "stats") return "статистика улова";
  if (tab === "cafe") return "заказы кафе";
  if (tab === "tools") return "полезные функции";
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
  const [tab, setTab] = usePersistedTab(TAB_KEY, MAIN_TABS, "spots" as MainTab, (v) =>
    v === "session" ? "tools" : undefined,
  );
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const panels = useResizablePanels();
  const feedOnly = waterbodyId === ALL_WATERBODIES;
  const spotsTab = tab === "spots";
  const cafeUrl = cafeUrlForWaterbody(waterbodyId);

  const openOnMap = useStore((s) => s.openOnMap);

  const onCafeNavigate = useCallback(
    (url: string) => {
      const id = waterbodyIdFromCafeUrl(url);
      if (!id || id === ALL_WATERBODIES || id === useStore.getState().waterbodyId) return;
      void setWaterbody(id);
    },
    [setWaterbody],
  );

  const openPostFromAdmin = useCallback(
    async (postId: string) => {
      setTab("spots");
      try {
        const { post } = await useStore.getState().api.post(postId);
        await openOnMap(post);
      } catch {
        /* hidden or missing */
      }
    },
    [setTab, openOnMap],
  );

  useEffect(() => {
    if (tab === "admin" && user?.role !== "admin") setTab("spots");
  }, [tab, user?.role, setTab]);

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
        <DropdownMenu
          open={userMenuOpen}
          onClose={() => setUserMenuOpen(false)}
          trigger={
            <button
              type="button"
              className={`role-pill ${user?.role ?? ""} ${userMenuOpen ? "open" : ""}`}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              onClick={() => setUserMenuOpen((v) => !v)}
            >
              {user?.nickname} · {user?.role === "admin" ? "админ" : "игрок"}
            </button>
          }
        >
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
        </DropdownMenu>
      </header>
      <div className="app-main">
        <SpotsLayout visible={spotsTab} panels={panels} />
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
            <AdminView onOpenPost={(id) => void openPostFromAdmin(id)} />
          </div>
        )}
      </div>
      {passwordOpen && <PasswordModal onClose={() => setPasswordOpen(false)} />}
    </div>
  );
}
