/// <reference types="vite/client" />

/** Версия из client/package.json, подставляется на сборке. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_ALLOWED_SERVERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  rf4?: {
    storeGet: () => Promise<{ serverUrl?: string; token?: string }>;
    storeSet: (data: { serverUrl: string; token?: string }) => Promise<boolean>;
    updateStatus?: () => Promise<{ ready: boolean; version: string }>;
    installUpdate?: () => Promise<boolean>;
    onUpdateReady?: (cb: (info: { version: string }) => void) => () => void;
  };
}

