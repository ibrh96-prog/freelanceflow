/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API is served same-origin via /api on Vercel; no remote API URL needed.
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
