/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APPSYNC_URL: string;
  readonly VITE_APPSYNC_API_KEY: string;
  readonly VITE_AWS_REGION: string;
  readonly VITE_RUM_APP_ID: string;
  readonly VITE_RUM_IDENTITY_POOL_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
