/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_ALLOWED_SERVERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
