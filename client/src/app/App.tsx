import { useEffect } from "react";
import { AuthScreen } from "../features/auth/AuthScreen";
import { ErrorBoundary } from "./ErrorBoundary";
import { Shell } from "../features/shell/Shell";
import { UpdateBanner } from "./UpdateBanner";
import { useStore } from "../store";

export function App() {
  const ready = useStore((s) => s.ready);
  const user = useStore((s) => s.user);
  const boot = useStore((s) => s.boot);

  useEffect(() => {
    void boot();
  }, [boot]);

  let body;
  if (!ready) {
    body = (
      <div className="boot">
        <p>Загрузка…</p>
      </div>
    );
  } else if (!user) {
    body = <AuthScreen />;
  } else {
    body = (
      <ErrorBoundary>
        <Shell />
      </ErrorBoundary>
    );
  }

  return (
    <div className="app-frame">
      <div className="app-frame-body">{body}</div>
      <UpdateBanner />
    </div>
  );
}
