I now have complete evidence. Here is my review.

---

# TrustRAG Frontend — Code Quality Review (Read-Only)

**Scope:** `/home/pavan/TrustRAG/frontend` (React 19 + TS 6 + Vite 8 + Tailwind 4)
**Validation performed:** `tsc -b` ✅, `oxlint` ✅, `npm run build` ✅ — the project compiles and builds cleanly. No blockers from a build perspective.

---

## Correct (verified sound)

- **Build/type pipeline:** `tsc -b` (strict mode, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`) passes; `oxlint` passes; production `vite build` succeeds (281 KB JS / 82 KB gzip). No unused imports exist.
- **API contract matches backend:** `api.ts` endpoints (`/dashboard/stats`, `/status`, `/health`, `/documents/`, `/documents/upload`, `/query`) all match FastAPI routes in `backend/api/*`. `page` in `SourceChunk` correctly typed `number | string` (backend returns `metadata.page_number` as string). `src/services/api.ts:6-52`.
- **Contrast:** Text color pairs are AA/AAA compliant — `#c0c7d4` on `#1e2024` = 9.6:1, `#8b919d` on `#1e2024` = 5.15:1, `#00315c` on `#a2c9ff` = 7.74:1, `#8b919d` on `#282a2e` = 4.54:1 (passes). No contrast blockers.
- **Router/layout structure:** `App.tsx` routing, `Layout` `<main>`/`<aside>`/`<nav>` semantics, `StatusBadge` status mapping (`StatusBadge.tsx:7-23`), and `useApi`'s ref-based approach (avoids stale closures) are all correct.
- **Documents table** uses semantic `<table>/<thead>/<th>` (`Documents.tsx:114-178`) — one of the few fully-accessible widgets.

---

## Fixed (defects / issues to address)

**Design-system consistency / hardcoded colors (the big one)**
1. `index.css:38-56` defines a full `:root` token set (`--surface-container`, `--on-surface`, `--primary`, `--error`, …) **and** `index.css:64-77` defines 14 ready-made utility classes (`.bg-surface-container`, `.text-on-surface-variant`, `.text-primary`, …) — yet **every one of the 14 utility classes has 0 usages**, and the tokens are bypassed by **~470 inline arbitrary color values across 12 files** (`bg-[#1e2024]`, `text-[#c0c7d4]`, `border-[#414752]`, … — 19 distinct hex colors). Examples: `Dashboard.tsx:37-237`, `Documents.tsx:37-262`, `Chat.tsx:66-286`, `KnowledgeBase.tsx:13-143`, `Sidebar.tsx:13-55`, `Card.tsx:17-31`, `StatusBadge.tsx:7-23`, `FileUpload.tsx:56-94`, `Layout.tsx:6-8`. The theme system is half-built and unused; all arbitrary colors should be migrated to the existing tokens (or a Tailwind `@theme` mapping) so a palette change is a one-line edit. This directly answers focus-area #2/#6.

**Hardcoded/mock data presented as live**
2. `Chat.tsx:206-256` — the Sources sidebar renders **3 hardcoded mock source cards** (`NIST_SP_800_53...`, `Security_Polic...`, `Compliance_Fra...`) that never reflect actual `response.sources`; the count badge `Chat.tsx:202` computes `messages[last].sources?.length || 0` and shows **0 whenever the last message is a user message**, while the static cards remain visible — internally contradictory, and for a "verified retrieval" security product displaying fabricated citations is a trust concern. (High priority.)
3. `Dashboard.tsx:234-237` ("Index Health 99.8%"), `Documents.tsx:208-220` ("72%", "12%"), `Documents.tsx:249` ("412 pg/min"), `Documents.tsx:262` ("1.4M") — static mock metrics mixed into otherwise live API data.

**Dead/non-functional UI**
4. `Documents.tsx:180-189` — pagination buttons (1, 2, chevrons) are non-functional static markup; `Documents.tsx:64-72` "Filter"/"New Folder" and `Documents.tsx:202` "info" buttons do nothing; `Documents.tsx:107-109` search input is uncontrolled with no handler.
5. `Dashboard.tsx:222-234` — "Upload New Document" / "Query Knowledge Base" buttons do nothing (don't even navigate).
6. `Card.tsx` — entire component is **unused** (no imports anywhere).
7. `api.ts:19` — `getHealth()` is never called (dead code).
8. `public/icons.svg` — unused social-icon asset, copied to `dist` on every build.
9. `useApi.ts:32` — `// eslint-disable-next-line react-hooks/exhaustive-deps` is a leftover from an eslint setup that doesn't exist (project uses oxlint; `.oxlintrc.json` has no such rule). Dead comment.

**React anti-patterns**
10. `Documents.tsx:31` — `setTimeout(() => setUploadResult(null), 8000)` has **no cleanup**; can call setState after unmount, and two rapid uploads race (first timer clears the second toast early).
11. `useApi.ts:17` — `fetcherRef.current = fetcher` writes to a ref **during render** (React docs discourage ref mutation in render); should move to `useEffect`/event.
12. `useApi.ts:19-20` — `refetch()` sets `data: null` + `loading: true`; so SystemStatus's "Refresh" (`SystemStatus.tsx:15,60-66`) blanks the page to a full-screen spinner instead of refreshing in place. Use a `isRefreshing` flag / keep previous data.
13. `Chat.tsx:54-58` — `handleKeyDown` passes a `KeyboardEvent` into `handleSubmit(e: React.FormEvent)`; compiles only via synthetic-event structural typing — fragile; extract shared submit logic or type properly.
14. `Chat.tsx:22,34,43` — message ids from `Date.now()`/`Date.now()+1`; rapid successive sends can collide on React keys. Use a counter/uuid.
15. `Documents.tsx:20` — toast doc object hardcodes `size_bytes: 0` (dead data; real size arrives on refetch).

**Accessibility (zero `aria-*`/`role`/`<label>` in the entire codebase)**
16. Icon-only header buttons with no `aria-label`/`title`: `Dashboard.tsx:49-50`, `Documents.tsx:49-51`, `Chat.tsx:78-80`, `KnowledgeBase.tsx:25-27`, `SystemStatus.tsx:40-42`, plus `Dashboard.tsx:190`, `Documents.tsx:202`.
17. `FileUpload.tsx:49-61` — dropzone is a `<div onClick>` (no `role="button"`, `tabIndex`, key handler, or label); the "Browse Files" path is **keyboard-unreachable** (hidden input is `display:none`). Also `Chat.tsx:167` textarea has only a placeholder (no `<label>`/`aria-label`).
18. `KnowledgeBase.tsx:87-94` — expandable `DocumentRow` is a `<div onClick>` with no `role="button"`/`aria-expanded`/keyboard support.
19. Heading hierarchy: `Dashboard.tsx:63` has **no `<h1>`** (hero is `<h2>`); `Chat.tsx:259` uses `<h4>` with no h1-h3 ancestors. Sidebar's `<h1>` (`Sidebar.tsx:16`) is the only h1 on Dashboard/Chat pages.

**Responsive / layout coupling**
20. `Layout.tsx:8` `ml-[260px]` and `Sidebar.tsx:13` `w-[260px]` — fixed sidebar with **no mobile/collapsible strategy**; on small screens the app is unusable. `Chat.tsx:62,197` adds a fixed `h-[calc(100vh-4rem)]` + fixed `w-[350px]` sources sidebar with no responsive handling → horizontal overflow.
21. Every page header uses the magic-number hack `-ml-6 -mt-6` (`Dashboard.tsx:37`, `Documents.tsx:37`, `Chat.tsx:66`, `KnowledgeBase.tsx:13`, `SystemStatus.tsx:28`) that hard-couples to `Layout.tsx:9`'s `p-6`; changing one breaks all. `Chat.tsx:66` additionally **omits `sticky top-0 z-40`** that the other four pages have — inconsistent sticky behavior.
22. `KnowledgeBase.tsx:42,88` — `grid-cols-12` with six columns and no `overflow-x-auto`/responsive fallback; columns squeeze unusably on mobile.

**Consistency / messaging**
23. `FileUpload.tsx:87` says **"MAX 100MB PER FILE"** but validation (and backend) rejects **>50MB** (`FileUpload.tsx:20-21`).
24. `Sidebar.tsx:55` — footer "Status: Healthy" is hardcoded and will still claim healthy when the backend is down.
25. `SystemStatus.tsx:110-123` — `StatusCard` maps both `name` and `model` to the label "Model"; any component having both would render duplicate rows (latent).
26. `index.html:12-18` — inline `<style>` duplicates `body` bg/color and `.material-symbols-outlined` font-variation-settings already in `index.css:12-22,57-59` (two sources of truth).
27. `index.html:7-9` — Google Fonts loaded without `preconnect`; external runtime dependency (offline/self-host consideration).

---

## Blocker

**No blockers.** The code typechecks, lints, and builds; there are no runtime crashes, missing React keys in dynamic lists (all `.map` sites have keys), or compile-time type errors. The closest to a "must-fix-before-trust" item is finding #2 (fabricated source citations in Chat), classified here as high-priority Fixed rather than Blocker since it is presentation-only and non-crashing.

---

## Note

- `backend/main.py:16-18` — `allow_origins=["*"]` **with** `allow_credentials=True` is a CORS anti-pattern; the frontend's direct-call design (`api.ts:6` "Call backend directly via CORS") depends on it. Out of frontend scope but worth flagging.
- `types/index.ts:6,8-9` — `DashboardStats.vector_db_status/llm_model/rag_status` are typed but never consumed by the UI.
- `index.html:3` `class="dark"` on `<html>` — harmless but suggests a leftover Tailwind v3 dark-mode pattern; no `dark:` variants are used.
- Dev-mode double fetch from `useApi` + `StrictMode` (`useApi.ts:29-33` runs effect twice in dev) — expected, not a bug.
- `.oxlintrc.json` enables only 2 rules; most of the a11y/dead-code findings above are invisible to the current linter — adding `jsx-a11y` rules would catch several.

---