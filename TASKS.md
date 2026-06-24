# PROJECT: g2e-trading-app

## Status: IN_PROGRESS
## Last Updated: 2026-06-24 — refreshed for coworker sessions

---

## ACTIVE TASK

**Task:** On a fresh `cli-comp` branch off `main`, fix `frontend/src/lib/api.ts` endpoints (chat `POST /chat/send`, strategies `GET /strategies`) — this unblocks chat, strategies, and profile work.
**Phase:** Frontend fixes/features — Task 1 of 8 (BUILD)
**Acceptance criteria:**
- [ ] `cli-comp` branch checked out/created fresh from latest `main`
- [ ] `api.ts` chat send calls `POST /chat/send`
- [ ] `api.ts` strategies list calls `GET /strategies`
- [ ] `cd frontend && npm run build` compiles cleanly
- [ ] Committed + pushed to `cli-comp`

---

## CONTEXT

Live AI trading assistant — Firebase-hosted React/TS frontend + FastAPI backend on Render,
multi-broker (E*TRADE, Alpaca), Supabase Postgres, Gemini AI. App is deployed and live
(https://etrade-ai-trading.web.app, backend https://g2e-backend.onrender.com). `main` is
clean. There is a documented plan for 8 frontend fixes/features to land via the `cli-comp`
branch → PR → merge-to-`main` flow.

**Constraints / OFF LIMITS:**
- All CODE work uses the `cli-comp` branch pattern (create fresh from `main`, push, open PR,
  merge to `main`). Reuse `cli-comp`; do NOT invent new branch names per change.
- Never delete `claude/render-logs-integration-RYGq4` (used by the Claude mobile app).
- Do NOT run `firebase deploy` manually — GitHub Actions auto-deploys frontend on merge to
  `main` (changes under `frontend/`, `firebase.json`, `.firebaserc`); Render auto-deploys
  backend on any push to `main`.
- Keep `G2E-Overview.md` updated when features/endpoints/architecture change.
- Task 1 (api.ts endpoint fixes) is the unblocker — do it first; chat, strategies, and
  profile save depend on it.

---

## COMPLETED

- [2026-06-24] Refreshed TASKS.md from stub into actionable living task store (this file)
- [2026-06-09] Added per-project TASKS.md task store (stub)
- [2026-06-xx] Switched credential source from 1Password to Bitwarden (docs)
- [2026-06-xx] Added Mac/new-machine onboarding section to CLAUDE.md
- [2026-06-xx] Added commit-often rule + git branch workflow to CLAUDE.md
- [2026-06-xx] Chat UX: markdown rendering, concise AI, disclosures page (PR #18)
- [2026-06-xx] Chat rename/delete + AI-generated conversation titles (PR #17)

---

## IN PROGRESS

- Working on: nothing in flight yet — start with ACTIVE TASK (Task 1, api.ts endpoints)
- Files most relevant to the BUILD plan:
  - `frontend/src/lib/api.ts` — API client (endpoint fixes; `getTemplates`, `PUT /users/me`)
  - `frontend/src/pages/Chat.tsx` — auto-create conversation on first message
  - `frontend/src/pages/Research.tsx` — symbol search + quote → AI chat
  - `frontend/src/pages/Portfolio.tsx` — empty-state when brokers connected
  - `frontend/src/pages/Settings.tsx` — profile editing
  - `frontend/src/pages/Strategies.tsx` — render templates via `getTemplates()`
  - `frontend/src/components/Header.tsx` — mobile hamburger drawer (dead button)
  - `frontend/src/components/Sidebar.tsx` — dynamic broker count (hardcoded 0)

---

## NEXT (ordered by priority)

### BUILD (on `cli-comp`)
1. **(ACTIVE)** Fix `api.ts` endpoints — chat `POST /chat/send`; strategies `GET /strategies`. Unblocks chat, strategies, profile.
2. Auto-create a conversation in `Chat.tsx` on the first message (so chat works without a pre-existing convo).
3. New **Research** page: symbol search + quote, with a path to send the quote into the AI chat.
4. Fix **Portfolio** empty-state: show $0 values when brokers ARE connected (instead of a generic empty state).
5. **Settings** profile editing: wire up `PUT /users/me`.
6. **Header.tsx** mobile hamburger drawer: make the currently-dead button open a nav drawer.
7. **Strategies** page: render strategy templates via `getTemplates()`.
8. **Sidebar** dynamic broker count from API (currently hardcoded to 0).

### TEST (verify each before claiming done)
9. Chat end-to-end (send → AI response renders).
10. Strategy templates load on the Strategies page.
11. Portfolio renders correctly with brokers connected.
12. Research symbol search + quote works.
13. Mobile menu (hamburger drawer) works under 768px viewport.
14. Profile save persists (`PUT /users/me` round-trips).
15. Dark-mode audit across all touched pages.
16. Confirm GitHub Actions auto-deploys frontend on merge to `main`.

### REFINE
17. Update `G2E-Overview.md` (Last Updated + Changelog) for the changes landed.
18. Dark mode as default + fix hardcoded light-mode colors.
19. Sidebar broker count sourced from API (fold in / verify item 8).
20. Add proper error/loading states across the touched pages.

---

## BLOCKERS

- (none)

---

## DEAD ENDS

(approaches tried that did not work — so they are not retried)

- (none yet)

---

## SESSION HANDOFF NOTES

- The remote `cli-comp` branch currently exists but is BEHIND `main` (its last work was
  merged via PR #18). Recreate it FRESH from latest `main` before starting Task 1 —
  do not build on the stale branch.
- CODE changes go on `cli-comp` → PR → merge to `main` (auto-deploy). THIS `TASKS.md`
  file is committed/pushed on `main` directly (it is task state, not a code change).
- Frontend page/component files for all 8 BUILD items already exist in the repo
  (`Research.tsx`, `Strategies.tsx`, etc.) — these are wiring/fixing tasks, not greenfield.
- Backend runtime env vars live in Render; local `.env` only needs RENDER_API_KEY,
  SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF (recreate from Bitwarden after a fresh clone).
- Verify frontend builds with `cd frontend && npm run build`; backend logs via
  `bash scripts/fetch-render-logs.sh 30m`; DB via `bash scripts/run-supabase-sql.sh -q "..."`.
- No AI-authorship trailers in commits (project rule).
