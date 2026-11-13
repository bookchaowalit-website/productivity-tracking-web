// Story-level network stub for the account-aware home page. next-auth's
// SessionProvider calls GET /api/auth/session and the page calls /api/tracking;
// both are answered here, so stories never reach the network or a database.
// Any other URL gets a 404 instead of falling through to the real fetch.
import type { SampleTrackingItem } from "./tracking";

export const SAMPLE_USER = {
  id: "sample-user-0001",
  name: "Sample Viewer",
  email: "sample-viewer@example.test",
  image: null,
};

// Browser-local demo list used while signed out (see DEMO_STORAGE_KEY in src/app/page.tsx).
const DEMO_STORAGE_KEY = "trackit-demo-items-v1";

export type TrackingResponse = SampleTrackingItem[] | "error" | "pending";

export interface AccountApiOptions {
  // null means signed out: /api/auth/session returns {} (next-auth reads that as no session).
  user: typeof SAMPLE_USER | null;
  tracking?: TrackingResponse;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Returns a Storybook beforeEach body: installs the stub and returns the restore function.
export function installAccountApi({ user, tracking = [] }: AccountApiOptions): () => void {
  if (typeof window !== "undefined") window.localStorage.removeItem(DEMO_STORAGE_KEY);
  const original = globalThis.fetch;

  const stub = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const { pathname } = new URL(raw, "http://storybook.local");

    if (pathname === "/api/auth/session") {
      return json(user ? { user, expires: "2099-01-01T00:00:00.000Z" } : {});
    }

    if (pathname === "/api/tracking") {
      const method = (init?.method ?? "GET").toUpperCase();
      // Writes succeed without changing the fixture; the page then re-reads the list.
      if (method !== "GET") return json({ ok: true });
      if (tracking === "pending") return new Promise<Response>(() => {});
      if (tracking === "error") return json({ error: "Stubbed tracking failure" }, 500);
      return json(tracking);
    }

    return json({ error: "Not stubbed in Storybook" }, 404);
  };

  globalThis.fetch = stub as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}
