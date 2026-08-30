import { useEffect, useRef } from "react";
import { isAndroidApp } from "@/platform";

type Layer = { close: () => void };

const stack: Layer[] = [];
let skipPops = 0;
let bound = false;

function bind() {
  if (bound) return;
  bound = true;
  window.addEventListener("popstate", () => {
    if (skipPops > 0) {
      skipPops -= 1;
      return;
    }
    stack.pop()?.close();
  });
}

function pushLayer(close: () => void): Layer {
  bind();
  const layer = { close };
  stack.push(layer);
  history.pushState({ rf4Layer: stack.length }, "");
  return layer;
}

function dropLayer(layer: Layer) {
  const at = stack.indexOf(layer);
  if (at < 0) return;
  stack.splice(at, 1);
  skipPops += 1;
  history.back();
}

/**
 * Пока слой открыт, держит запись в истории, чтобы аппаратная «Назад» в Android-клиенте
 * закрывала его, а не сворачивала приложение. На десктопе не делает ничего.
 */
export function useBackGuard(active: boolean, onBack: () => void) {
  const handler = useRef(onBack);
  handler.current = onBack;

  useEffect(() => {
    if (!active || !isAndroidApp()) return;
    const layer = pushLayer(() => handler.current());
    return () => dropLayer(layer);
  }, [active]);
}
