/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_MOCK_API?: string
  /** "true" in the build that ships beside the landing page and console (`npm run build:set`). */
  readonly VITE_SET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
