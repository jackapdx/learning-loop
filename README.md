# System Design

Interactive learning platform for system design & infrastructure — 79 lessons across System Design, Chat, PostgreSQL, Cloud, and more. Built as a fully static site deployable to any static host.

> Uses the **Learning Loop** pedagogy: Orient → Attempt → Feedback → Explain → Extend → Checkpoint → Reflect

## Architecture

```
lessons/*.md ──[prebuild]──► lessons-data.ts ──[vite build]──► dist/   (static HTML/CSS/JS)
      │                                                              │
      └── [md watch plugin on dev] ─── auto-rebuilds on .md changes  │
                                                         Cloudflare Pages / any static host
```

| Layer | Technology |
|---|---|
| Frontend | Svelte 5 (runes) + Vite 8 |
| Styling | Tailwind CSS v4 |
| Types | TypeScript + ArkType |
| Pre-render | Bun script + marked |
| Monorepo | Turborepo + Bun workspaces |
| Hosting | Cloudflare Pages (static) |

> **No server required.** All lesson content is pre-rendered at build time into static JSON. The output is pure HTML, CSS, and JS — zero runtime dependencies.

## Getting Started

### Prerequisites

- **Bun** ≥ 1.1.34

### Setup

```bash
git clone <repo-url> && cd learning-loop-app
bun install
cd apps/web && bun run prebuild   # generate lesson data (required first time)
```

### Development

```bash
bun run dev     # starts Vite dev server via Turborepo
```

The dev server runs at `http://localhost:5173`.

> [!TIP]
> During development, the Vite plugin watches `lessons/*.md` and auto-regenerates lesson data on every change — no manual `prebuild` needed while the dev server is running.

### Build

```bash
bun run build   # prebuild → vite build (output: apps/web/dist/)
```

### Quality

```bash
bun typecheck   # TypeScript checking
bun lint        # Oxlint
bun format      # Oxfmt
bun test        # Vitest
```

## Project Structure

```
learning-loop-app/
├── apps/
│   ├── web/                         # Svelte 5 frontend (static)
│   │   ├── scripts/
│   │   │   └── prebuild-lessons.ts  # Build-time .md → JSON compiler
│   │   ├── src/lib/
│   │   │   ├── lessons-api.ts       # Client-side data layer
│   │   │   ├── lessons-data.ts      # Auto-generated (gitignored)
│   │   │   ├── LessonView.svelte    # Learning Loop renderer
│   │   │   ├── Overview.svelte      # Course overview + progress
│   │   │   ├── Layout.svelte        # App shell with navbar
│   │   │   └── progress-store.ts    # localStorage persistence
│   │   ├── vite.config.ts           # Includes .md watch plugin
│   │   └── wrangler.toml            # Cloudflare Pages config
│   └── api/                         # Hono + tRPC (legacy, unused in static build)
├── lessons/                         # All lesson .md files (self-contained)
│   ├── 01-trade-off-articulation.md
│   ├── Chat/                        # Chat system design series
│   ├── Cloud/                       # Cloud infrastructure series
│   ├── Distributed/                 # Distributed systems series
│   ├── Messaging/                   # Messaging & event streaming
│   ├── Networking/                  # Networking fundamentals
│   ├── NoSQL/                       # NoSQL deep dive
│   ├── Observability/              # SRE & monitoring
│   ├── Postgres/                    # PostgreSQL deep dive (13 lessons)
│   ├── Testing/                     # Testing strategies
│   └── Workers/                     # Background job processing
├── packages/
│   ├── shared/                      # TypeScript types + utilities
│   ├── ui/                          # Shared Svelte components
│   └── design-tokens/               # Design tokens (colors, spacing)
├── turbo.json
└── package.json
```

## How It Works

### 1. Lesson Authoring

Write lessons in Markdown under `lessons/`. Each lesson follows a structured section format:

```markdown
---
contentType: learning-loop
level: senior
status: polished
tags: [system-design, topic]
prerequisites: [01-intro]
---

# Lesson Title (ชื่อภาษาไทย)

## Orient
Sets the context — why this topic matters for senior engineers.

## Attempt
A hands-on challenge with realistic scenarios and multiple-choice options.

## Feedback
Answer analysis table explaining why each option is correct/incorrect.

## Explain
Core concepts, mental models, and practical strategies.

## Extend
Deeper exploration, edge cases, and advanced trade-offs.

## Checkpoint
Quick knowledge check with `<details>` reveal.

## Reflect
Summary, key takeaways, and related topics.
```

### 2. Build Pipeline

```bash
# Generate lesson data from .md files
cd apps/web && bun run prebuild
#    ├─ Reads all lesson .md files
#    ├─ Parses markdown → HTML (with syntax highlighting, wikilinks, tables)
#    └─ Outputs src/lib/lessons-data.ts (~970 KB for 79 lessons)

# Static build
bun run build
#    └─ prebuild → vite build → apps/web/dist/
```

During development, the Vite plugin in `vite.config.ts` watches `lessons/` and auto-runs prebuild on any `.md` change, followed by HMR in the browser.

### 3. Runtime

- **Routing:** Hash-based client-side navigation (`#overview`, `#lesson/slug`)
- **Data:** All 79 lessons bundled as static data — instant load, zero API calls
- **Answers:** Embedded in the bundle, revealed only on user click
- **Progress:** Persisted via `localStorage`
- **Dark mode:** Automatic via `prefers-color-scheme`, toggle persisted in `localStorage`

## Deployment

### Cloudflare Pages

```bash
cd apps/web
bun run build
npx wrangler pages deploy dist
```

Or connect via Git:

| Setting | Value |
|---|---|
| Build command | `cd apps/web && bun install && bun run build` |
| Output directory | `apps/web/dist` |

### Any Static Host

The `dist/` directory contains pure static files. Deploy anywhere:

**Cloudflare Pages · Vercel · Netlify · GitHub Pages · S3 + CloudFront**

> No server, no database, no environment variables needed at runtime.

## License

MIT

---

Static · Svelte 5 · Learning Loop · 79 lessons
