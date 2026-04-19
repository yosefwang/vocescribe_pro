# Vocescribe — Documentation Hub

> Transforms EPUB ebooks into AI-narrated audiobooks with per-sentence lyric-style synchronization.

---

## Quick Links

| I want to… | Go to |
|---|---|
| Understand the system | [Architecture](01-architecture.md) |
| Set up locally | [Development Setup](12-development-setup.md) |
| Explore the API | [API Reference](04-api-reference.md) |
| Understand the data model | [Data Model](02-data-model.md) |
| Debug the TTS pipeline | [TTS Pipeline](06-tts-pipeline.md) |
| Understand auth & user isolation | [Auth & Security](03-auth-and-security.md) |
| Run tests | [Testing & Eval](10-testing-and-eval.md) |
| Deploy to production | [Deployment](11-deployment.md) |

---

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                 CLIENT (Next.js SPA)                 │
│         Library · Player · Upload · Settings         │
└─────────────────────────┬───────────────────────────┘
                          │ HTTPS + Clerk Bearer token
                          ▼
┌─────────────────────────────────────────────────────┐
│         API LAYER  /api/v1  (Route Handlers)         │
│   books · chapters · audio · generate · playback    │
└──────┬──────────┬──────────┬───────────────────────┘
       │          │          │
       ▼          ▼          ▼
 ┌──────────┐ ┌───────┐ ┌─────────────┐  ┌───────────┐
 │ Neon DB  │ │  R2   │ │   Inngest   │→ │  OpenAI   │
 │ Postgres │ │ Files │ │ (bg jobs)   │  │ GPT-4o    │
 └──────────┘ └───────┘ └─────────────┘  │ TTS API   │
                                          └───────────┘
```

---

## Documentation Map

### Conceptual (Why & How it works)
- [01 — Architecture](01-architecture.md) — System context, container diagram, key design decisions
- [02 — Data Model](02-data-model.md) — Entity relationships, schema, access patterns
- [03 — Auth & Security](03-auth-and-security.md) — Clerk integration, user isolation model
- [05 — EPUB Pipeline](05-epub-pipeline.md) — Upload, parse, dedup, R2 storage
- [06 — TTS Pipeline](06-tts-pipeline.md) — Text cleanup → chunking → TTS → alignment
- [07 — Audio Storage](07-audio-storage.md) — R2 layout, signed URLs, lifecycle
- [08 — Background Jobs](08-background-jobs.md) — Inngest workflow, concurrency, retry
- [09 — Lyric-Sync Player](09-lyric-sync-player.md) — Player UI, sync algorithm, persistence

### Reference (Lookup)
- [04 — API Reference](04-api-reference.md) — All endpoints, request/response, error codes
- [00 — Glossary](00-glossary.md) — Domain terminology

### Frontend Design (Pixel-Perfect Implementation)
- [13 — Design System](13-design-system.md) — CSS tokens, typography, all components with exact values
- [14 — UI Screens](14-ui-screens.md) — Screen-by-screen layout and implementation guide

> **Design source files:** [`ui/Vocescribe.html`](../ui/Vocescribe.html) (desktop) · [`ui/Vocescribe Mobile.html`](<../ui/Vocescribe Mobile.html>) (mobile) · [`ui/mobile.jsx`](../ui/mobile.jsx) · [`ui/app.js`](../ui/app.js)  
> Open in a browser — they are fully interactive prototypes and the ultimate source of truth.

### Operational (Do)
- [10 — Testing & Eval](10-testing-and-eval.md) — Unit, integration, E2E, TTS quality eval
- [11 — Deployment](11-deployment.md) — CI/CD, environments, secrets, monitoring
- [12 — Development Setup](12-development-setup.md) — Local dev from zero

---

## Development Phases

| Phase | Scope | Status |
|---|---|---|
| **0** | Scaffolding — Next.js + Clerk + DB + R2 connected | Planned |
| **1** | Auth + EPUB Upload + Library UI | Planned |
| **2** | Audio Generation Pipeline (TTS + alignment) | Planned |
| **3** | Player with Lyric Sync | Planned |
| **4** | Eval Suite + Polish + Production Deploy | Planned |

Full phase-by-phase implementation instructions: [Vocescribe PRD §10](../Vocescribe_PRD.md#10-claude-code-phased-development-instructions)

---

## Key Constraints

- Max EPUB upload: **50 MB**
- Max TTS chunk: **~4 000 chars** per OpenAI call
- Audio format: **MP3** only
- Concurrent generations: **3 chapters per user**, 10 globally
- R2 signed URL expiry: **1 hour**
- All data strictly scoped to `user_id` (DB + R2 paths)

---

*Source of truth for features and acceptance criteria: [`Vocescribe_PRD.md`](../Vocescribe_PRD.md)*
