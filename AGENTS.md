# learning-loop-app — System Design · Developer Guide

## Commands

- **Dev:** `bun run dev` (starts Vite dev server via Turborepo)
- **Build:** `bun run build` (prebuild lessons → vite build)
- **Prebuild only:** `cd apps/web && bun run prebuild` (re-generates `lessons-data.ts` from .md files)
- **Typecheck:** `bun run typecheck`
- **Lint:** `bun run lint`
- **Test:** `bun run test`

## Project Structure

- `apps/web/` — Svelte 5 frontend (fully static, no server)
  - `scripts/prebuild-lessons.ts` — Build-time .md → JSON compiler (run before build or dev)
  - `src/lib/lessons-api.ts` — Client-side data layer (replaces tRPC)
  - `src/lib/lessons-data.ts` — Auto-generated static lesson data (gitignored)
  - `src/lib/LessonView.svelte` — Learning Loop lesson renderer
  - `src/lib/Overview.svelte` — Course overview + progress
  - `src/lib/progress-store.ts` — localStorage progress persistence
- `apps/api/` — Hono + tRPC (legacy/dev-only; not used in static build)
- `lessons/` — All lesson .md files (self-contained, no external symlinks)
- `packages/shared/` — TypeScript types (`Lesson`, `LessonMeta`, `LessonSection`, `AttemptOption`)
- `packages/ui/` — Shared Svelte components (Button)
- `packages/design-tokens/` — Design tokens (colors, spacing, animations)

## Architecture

- **Static-first:** All 79 lessons are parsed from Markdown → HTML at build time
- **No runtime server:** Lesson data is bundled into the JS payload
- **Hash-based routing:** `#overview` and `#lesson/slug` — no SPA redirects needed
- **Client-only:** Checkpoint answers are embedded, revealed on click; progress in localStorage

## Tech Stack

- Frontend: Svelte 5 (runes) + Vite 8
- Styling: Tailwind CSS v4
- Pre-render: Bun script + marked
- Monorepo: Turborepo + Bun workspaces
- Hosting: Cloudflare Pages (static) — `apps/web/wrangler.toml`

## Key Patterns

- **Adding a lesson:** Create a `.md` file under `lessons/` with emoji-section headers, then run `bun run prebuild`
- **Build output:** `apps/web/dist/` — pure static HTML/CSS/JS
- **Deploy:** `cd apps/web && npx wrangler pages deploy dist`
