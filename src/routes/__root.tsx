import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";

/**
 * Client-only beforeLoad — mirrors the production app's requireAuth pattern.
 *
 * The key ingredients for the bug:
 * 1. `ssr: false` on the root route
 * 2. `beforeLoad` that is client-only (no `.server()` branch)
 * 3. The beforeLoad returns a promise (async)
 *
 * When the client hydrates, TanStack Router runs this beforeLoad and calls
 * `setFetching(router, match, 'beforeLoad', ...)` which triggers a state
 * update inside the Suspense boundary before hydration finishes, causing:
 *
 *   Uncaught Error: This Suspense boundary received an update before it
 *   finished hydrating. This caused the boundary to switch to client rendering.
 */
const clientBeforeLoad = createIsomorphicFn().client(async () => {
  // Simulate an async operation (e.g. session fetch)
  // Even a microtask-resolved promise triggers the bug
  await Promise.resolve();
  return { session: { user: "test" } };
});

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "TSR SSR Hydration Bug Repro" },
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
  }),
  component: RootComponent,
  shellComponent: RootShell,
  ssr: false,
  beforeLoad: clientBeforeLoad,
});

/**
 * RootShell — always SSR'd even with `ssr: false`.
 * Sets up the document skeleton.
 */
function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * RootComponent — the body content, client-only with `ssr: false`.
 */
function RootComponent() {
  return (
    <div>
      <h1>Root</h1>
      <Outlet />
    </div>
  );
}
