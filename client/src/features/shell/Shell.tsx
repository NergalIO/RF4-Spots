import { useCallback, useEffect, useState } from "react";
import { cafeUrlForWaterbody, waterbodyIdFromCafeUrl } from "@/features/shell/cafe";
import { ALL_WATERBODIES } from "@/shared/constants";
import { SiteEmbed } from "./SiteEmbed";
import { ToolsView } from "../tools/ToolsView";
import { AdminView } from "../admin/AdminView";
import { PasswordModal } from "../auth/PasswordModal";
import { VerificationDialog } from "../auth/VerificationDialog";
import { useStore } from "@/store";
import { useIsMobile } from "@/shared/platform";
import { useResizablePanels } from "@/shared/useResizablePanels";
import { usePersistedTab } from "@/shared/usePersistedTab";
import { useBackGuard } from "@/shared/useBackGuard";
import { OPEN_POST_EVENT } from "@/notify/show";
import { SpotsLayout } from "../spots/SpotsLayout";
import { ChangelogModal } from "@/app/ChangelogModal";
import { loadServerChangelog, markChangelogSeen, shouldShowChangelog, unseenChangelog, type ChangelogEntry } from "@/app/changelog";
import { MAIN_TABS, TAB_ITEMS, type MainTab } from "./shellTabs";
import { ShellTopbar } from "./ShellTopbar";

const TAB_KEY = "rf4spots-main-tab";
const VERIFY_PROMPT_KEY = "rf4spots-verify-prompted";

export function Shell() {
  const user = useStore((s) => s.user);
  const waterbodies = useStore((s) => s.waterbodies);
  const waterbodyId = useStore((s) => s.waterbodyId);
  const setWaterbody = useStore((s) => s.setWaterbody);
  const rulerOn = useStore((s) => s.rulerOn);
  const toggleRuler = useStore((s) => s.toggleRuler);
  const logout = useStore((s) => s.logout);
  const api = useStore((s) => s.api);
  const [tab, setTab] = usePersistedTab(TAB_KEY, MAIN_TABS, "spots" as MainTab, (v) =>
    v === "session" ? "tools" : undefined,
  );
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyMode, setVerifyMode] = useState<"form" | "requests">("form");
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [changelogAll, setChangelogAll] = useState(false);
  const [changelogEntries, setChangelogEntries] = useState<ChangelogEntry[]>([]);
  const [changelogStatus, setChangelogStatus] = useState<"loading" | "ok" | "error">("loading");
  const panels = useResizablePanels();
  const isMobile = useIsMobile();
  const feedOnly = waterbodyId === ALL_WATERBODIES;
  const spotsTab = tab === "spots";
  const cafeUrl = cafeUrlForWaterbody(waterbodyId);
  const visibleTabs = TAB_ITEMS.filter((item) => item.id !== "admin" || user?.role === "admin");
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
        const { post } = await useStore.getState().api.posts.get(postId);
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

  useEffect(() => {
    const onOpen = (e: Event) => {
      const postId = (e as CustomEvent<{ postId?: string }>).detail?.postId;
      if (postId) void openPostFromAdmin(postId);
    };
    window.addEventListener(OPEN_POST_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_POST_EVENT, onOpen);
  }, [openPostFromAdmin]);

  const closeChangelog = useCallback(() => {
    markChangelogSeen(__APP_VERSION__);
    setChangelogOpen(false);
  }, []);

  useEffect(() => {
    let dead = false;
    void loadServerChangelog(api.baseUrl).then((result) => {
      if (dead) return;
      setChangelogEntries(result.entries);
      setChangelogStatus(result.ok ? "ok" : "error");
      if (shouldShowChangelog(__APP_VERSION__, result.entries)) {
        setChangelogAll(false);
        setChangelogOpen(true);
      }
    });
    return () => {
      dead = true;
    };
  }, [api.baseUrl]);

  useEffect(() => {
    if (!user || user.verified) return;
    const key = `${VERIFY_PROMPT_KEY}:${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setVerifyMode("form");
    setVerifyOpen(true);
  }, [user]);

  useBackGuard(passwordOpen, () => setPasswordOpen(false));
  useBackGuard(changelogOpen, closeChangelog);
  useBackGuard(verifyOpen, () => setVerifyOpen(false));

  return (
    <div className="app-shell">
      <ShellTopbar
        user={user}
        tab={tab}
        setTab={setTab}
        isMobile={isMobile}
        waterbodyId={waterbodyId}
        waterbodies={waterbodies}
        setWaterbody={(id) => void setWaterbody(id)}
        rulerOn={rulerOn}
        toggleRuler={toggleRuler}
        feedOnly={feedOnly}
        spotsTab={spotsTab}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        onPassword={() => setPasswordOpen(true)}
        onChangelog={() => {
          setChangelogAll(true);
          setChangelogOpen(true);
        }}
        onVerify={() => {
          setVerifyMode("form");
          setVerifyOpen(true);
        }}
        onMyRequests={() => {
          setVerifyMode("requests");
          setVerifyOpen(true);
        }}
        onLogout={() => void logout()}
      />
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
      {isMobile && (
        <nav className="mobile-tabs" role="tablist" aria-label="Разделы">
          {visibleTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "on" : ""}
              onClick={() => setTab(item.id)}
            >
              {item.short}
            </button>
          ))}
        </nav>
      )}
      {passwordOpen && <PasswordModal onClose={() => setPasswordOpen(false)} />}
      <VerificationDialog open={verifyOpen} initialMode={verifyMode} onClose={() => setVerifyOpen(false)} />
      {changelogOpen && (
        <ChangelogModal
          title={changelogAll ? "История обновлений" : "Что нового"}
          entries={changelogAll ? changelogEntries : unseenChangelog(__APP_VERSION__, changelogEntries)}
          loading={changelogStatus === "loading"}
          error={changelogStatus === "error"}
          onClose={closeChangelog}
        />
      )}
    </div>
  );
}
