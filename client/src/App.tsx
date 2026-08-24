import { useEffect } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { Shell } from "./components/Shell";
import { useStore } from "./store";

export function App() {
  const ready = useStore((s) => s.ready);
  const user = useStore((s) => s.user);
  const boot = useStore((s) => s.boot);

  useEffect(() => {
    void boot();
  }, [boot]);

  if (!ready) {
    return (
      <div className="boot">
        <p>Загрузка…</p>
      </div>
    );
  }
  return user ? <Shell /> : <AuthScreen />;
}
