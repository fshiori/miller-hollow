export interface Env {
  ROOMS: DurableObjectNamespace;
  ASSETS: Fetcher;
  MILLER_HOLLOW_TIMER_PROFILE?: "production" | "smoke";
  MILLER_HOLLOW_BUILD_SHA?: string;
}
