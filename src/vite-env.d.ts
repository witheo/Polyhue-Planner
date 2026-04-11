/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for local brain-dump proxy (no trailing slash required). */
  readonly VITE_BRAIN_DUMP_PROXY_URL?: string;
}
