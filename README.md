# TanStack Router SSR Hydration Bug Repro

## Bug

When using TanStack Start with SSR + Nitro:

- Root route has `ssr: false` (only `shellComponent` is SSR'd)
- Root route has a `beforeLoad` that is **client-only** (via `createIsomorphicFn().client(...)`)
- The `beforeLoad` is async (returns a promise)

During hydration, TanStack Router's client-side loader calls `setFetching(router, match, 'beforeLoad', ...)` in `load-client.ts`, which triggers a React state update inside the Suspense boundary before hydration completes.

This produces:

```
Uncaught Error: This Suspense boundary received an update before it finished hydrating.
This caused the boundary to switch to client rendering.
The usual way to fix this is to wrap the original update in startTransition.
```

The error originates from `MatchInner`'s `useStore()` reacting to the fetching state change.

## Regression Analysis

**Introduced in:** `@tanstack/router-core@1.171.16` / `@tanstack/react-router@1.170.19`
via PR [#7805](https://github.com/TanStack/router/pull/7805) — "lane match loader rewrite"

**Last known good:** `@tanstack/router-core@1.171.15` / `@tanstack/react-router@1.170.18`

**Partial fix attempted:** PR [#8055](https://github.com/TanStack/router/pull/8055) —
"fix(react-router): avoid Suspense above root documents" (merged, included in 1.170.28+).
This fix does **not** cover our case because `canWrapInSuspense()` in `Match.tsx`
returns `true` when either `shellComponent` or `ssr: false` is set on the root route
(lines 51–61), which is our exact configuration.

### What changed

1. **`load-client.ts` (router-core):** New `setFetching()` function calls
   `store.set()` synchronously on the route's `byRoute` store during `beforeLoad`
   execution. This did not exist in the old `load-matches.ts`.

2. **`Match.tsx` (react-router):** The old code used a `matchViewFieldsEqual`
   equality guard on `useStore()` that only re-rendered on `routeId` or
   `_displayPending` changes — `isFetching` was ignored. The rewrite removed
   this guard, so every `store.set()` (including `setFetching`) triggers a
   re-render via `useSyncExternalStore`, which bypasses `startTransition`.

3. **`Match.tsx` (react-router):** The old code prevented root routes from being
   implicitly wrapped in Suspense. PR #8055 restored that gate but explicitly
   allows Suspense for roots with `shellComponent` or `ssr: false` — our config.

## Repro Steps

```bash
cd bugs/tsr-ssr
pnpm install
pnpm dev
# Open http://localhost:3000 in browser
# Check the browser console for the hydration error
```

## Version Switching

`pnpm-workspace.yaml` contains two override sets (commented). To switch:

1. Uncomment the desired version block and comment the other
2. `rm -rf node_modules pnpm-lock.yaml && pnpm install`

## Key Files

- `src/routes/__root.tsx` — Root route with `ssr: false` + client-only `beforeLoad`
- `src/server.tsx` — Server handler (with nonce mutation, matching production)
- `src/client.tsx` — Client entry with `hydrateRoot` in `startTransition`

## Versions (current — bug present)

- `@tanstack/react-router`: `^1.170.32` (resolves to `1.170.32`)
- `@tanstack/react-start`: `^1.168.49` (resolves to `1.168.49`)
- `@tanstack/router-core`: `1.171.27` (transitive)
- `nitro`: `3.0.1-alpha.2`
- `react`: `^18.3.1`
- `react-dom`: `^18.3.1`
- `vite`: `^8.2.2`
