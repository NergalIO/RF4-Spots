import { ALL_WATERBODIES } from "@/shared/constants";
import { GameClock } from "./GameClock";
import { NotifyMenu } from "./NotifyMenu";
import { DropdownMenu } from "@/shared/DropdownMenu";
import type { User, Waterbody } from "@/types";
import { TAB_ITEMS, tabCaption, type MainTab } from "./shellTabs";

export function ShellTopbar({
  user,
  tab,
  setTab,
  isMobile,
  waterbodyId,
  waterbodies,
  setWaterbody,
  rulerOn,
  toggleRuler,
  feedOnly,
  spotsTab,
  userMenuOpen,
  setUserMenuOpen,
  onPassword,
  onLogout,
}: {
  user: User | null | undefined;
  tab: MainTab;
  setTab: (tab: MainTab) => void;
  isMobile: boolean;
  waterbodyId: string;
  waterbodies: Waterbody[];
  setWaterbody: (id: string) => void;
  rulerOn: boolean;
  toggleRuler: () => void;
  feedOnly: boolean;
  spotsTab: boolean;
  userMenuOpen: boolean;
  setUserMenuOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  onPassword: () => void;
  onLogout: () => void;
}) {
  const visibleTabs = TAB_ITEMS.filter((item) => item.id !== "admin" || user?.role === "admin");
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">RF4</span>
        <div>
          <strong>Spots</strong>
          <small>{tabCaption(tab)}</small>
        </div>
      </div>
      {!isMobile && (
        <div className="nav-tabs" role="tablist" aria-label="Разделы">
          {visibleTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "on" : ""}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <label className="wb-select">
        <span>Водоём</span>
        <select value={waterbodyId} onChange={(e) => setWaterbody(e.target.value)}>
          <option value={ALL_WATERBODIES}>Все водоёмы</option>
          {waterbodies.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      {!isMobile && !feedOnly && spotsTab && (
        <button type="button" className={`btn ghost ${rulerOn ? "on" : ""}`} onClick={toggleRuler}>
          Линейка
        </button>
      )}
      <div className="spacer" />
      <NotifyMenu />
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
            onPassword();
          }}
        >
          Пароль
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setUserMenuOpen(false);
            onLogout();
          }}
        >
          Выход
        </button>
      </DropdownMenu>
    </header>
  );
}
