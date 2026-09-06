# rRunAI Decisions Log

**Version 1.0 — Architecture and product decision record**

This document records consequential product and technical decisions already made for rRunAI. New decisions should be appended here when they change scope, architecture, or non-negotiable behavior.

Authoritative sources for intent and structure:

- [`PRODUCT_BIBLE.md`](PRODUCT_BIBLE.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`ROADMAP.md`](ROADMAP.md)
- [`TRAINING_PRINCIPLES.md`](TRAINING_PRINCIPLES.md)
- [`CODING_PRINCIPLES.md`](CODING_PRINCIPLES.md)
- [`AGENTS.md`](../AGENTS.md)

---

## How to add a decision

Use this template:

```markdown
### D-XXX — Short title

- **Date:** YYYY-MM-DD
- **Status:** Accepted | Superseded | Deferred
- **Context:** Why a decision was needed
- **Decision:** What we chose
- **Consequences:** What this implies / forbids
- **References:** Product Bible / Architecture sections, files
```

Do not invent decisions. Only record choices grounded in docs or explicit user direction.

---

## Status legend for related capabilities

| Status | Meaning |
|--------|---------|
| **Shipped** | Implemented in codebase |
| **In progress** | Partially implemented |
| **Direction (not built)** | Accepted direction; not yet built |

---

## D-001 — Product positioning: coaching intelligence, not tracker-first

- **Date:** 2026-08 (codified in Product Bible v1)
- **Status:** Accepted
- **Context:** Run apps often optimize for dashboards and miles logged.
- **Decision:** rRunAI is a conversation-first coaching intelligence. Tracking is an essential input to coaching, not the product itself.
- **Consequences:** Do not prioritize deep analytics, social leaderboards, or tracker feature parity over the real-time coaching loop.
- **References:** Product Bible §§1–6

---

## D-002 — Target user: midlife recreational runner (40+)

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Design defaults differ for elite vs recreational midlife athletes.
- **Decision:** Primary user is midlife recreational runner, especially age 40+, with limited attention, recovery constraints, and non-elite goals.
- **Consequences:** Age-aware recovery, calm cues, no elite-only assumptions, no medical claims.
- **References:** Product Bible §1, Training Principles §§1, 6

---

## D-003 — Conversation-first overall; voice-first during the run

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Needed clear interaction philosophy across pre-run, during-run, and post-run.
- **Decision:**
  - **Conversation-first** is the overall product philosophy.
  - **Voice-first** is the interaction philosophy during an active run.
  - Pre-run and post-run: conversation-first (text initially; voice optionally later).
  - During run: voice guidance + concise voice commands (future) + glanceable safety screen.
- **Consequences:** Do not force chat UI during running. Do not treat "conversational pace" as the product interface. Pre/post conversation UIs are **Direction (not built)** until scoped.
- **References:** Product Bible §§1, 7, 14; Architecture §3

---

## D-004 — Core journey remains Home → Run → Summary

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Need a simple MVP journey.
- **Decision:** Native stack navigation Home → Run → Summary, with session passed via navigation params.
- **Consequences:** Ephemeral run data today; Progress Engine persistence is future work. Do not introduce multi-tab social shells for MVP.
- **References:** Product Bible §10; Architecture §2.3; **Shipped**

---

## D-005 — Structured workouts as timed blocks with optional pace targets

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Need a coaching-grade workout model.
- **Decision:** Sessions are ordered blocks (`warmup` | `work` | `recovery` | `cooldown`) with `durationSec` and optional pace windows. Catalogue: Easy, Threshold, Interval, Free Run.
- **Consequences:** Coaching is block-aware and silent when no target. Distance-based blocks remain MVP-scoped but **Direction (not built)**.
- **References:** Product Bible §§8, 17; Architecture §§7, 9; `app/types/session.ts`; **Shipped** (time-based)

---

## D-006 — Deterministic on-device coaching today; Python brain later

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Need real-time reliability without premature backend.
- **Decision:** Pace coaching and transitions are deterministic on-device. Long-term coaching intelligence may use a Python coaching brain with typed I/O and local fallback. Do not add Python/API/cloud without scoped approval.
- **Consequences:** Decision ≠ speech mechanism. Safety-critical timing never depends on network/LLM.
- **References:** Product Bible §§9, 12; Architecture §§14, 16; **Shipped** (deterministic); **Direction (not built)** (Python)

---

## D-007 — Voice delivery separated from coaching decisions

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Need swappable decision sources without rewriting TTS.
- **Decision:** `useCoaching` produces feedback; `useVoiceCoach` / `useBlockTransitionVoice` speak. Transition cues interrupt pace cues. Pace voice uses 25s cooldown.
- **Consequences:** Future `CoachingDecision` from Python must pass through the same delivery layer.
- **References:** Architecture §§1.2, 10; **Shipped**

---

## D-008 — GPS pipeline is high-risk and must be retained

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Pace quality drives coaching trust.
- **Decision:** Keep layered GPS processing (source gate, deduper, processor, pace algorithms, diagnostics). Use display pace for coaching, not raw GPS noise. Preserve diagnostics.
- **Consequences:** Extend, do not rewrite. Require tests for pace/GPS changes. Disclose untested device GPS.
- **References:** Architecture §§11, 20; Coding Principles §8; **Shipped**

---

## D-009 — Heart-rate strap is MVP-critical, not a nice-to-have

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Risk of treating HR as optional polish.
- **Decision:** External heart-rate strap support is MVP-critical. Ask before selecting BLE library. Degrade safely when unavailable. No medical inference.
- **Consequences:** Roadmap Phase 1 prioritizes HR. Broad wearable support beyond strap remains out of scope.
- **References:** Product Bible §§8, 11, 20; Roadmap Phase 1; **Direction (not built)**

---

## D-010 — Local-first active run; no required network

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Outdoor runs have poor connectivity.
- **Decision:** Active run executes entirely on-device. Future backends may assist pre/post-run only, with local fallback.
- **Consequences:** Forbidden to block run lifecycle on remote calls.
- **References:** Architecture §§1.3, 13, 15; **Shipped** (fully offline today)

---

## D-011 — Locked mobile stack (Expo / React Native)

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Avoid framework churn during MVP.
- **Decision:** TypeScript, React 19, RN 0.83, Expo 55, React Navigation, `expo-location`, `expo-speech`, npm lockfile, native projects alongside Expo.
- **Consequences:** Replacements require approval.
- **References:** Product Bible §19; Coding Principles §2; **Shipped**

---

## D-012 — Athlete Model as typed shared context (future)

- **Date:** 2026-08
- **Status:** Accepted (direction)
- **Context:** Need cross-session context without building a social profile or medical record.
- **Decision:** Future Athlete Model is typed, serializable runner context for engines and Python brain. Local-first persistence. Explainable inputs. Must not block the run loop.
- **Consequences:** No athlete model feature as identity/social/medical system.
- **References:** Product Bible §13; Architecture §6; **Direction (not built)**

---

## D-013 — Engine map for future systems

- **Date:** 2026-09 (Architecture v1)
- **Status:** Accepted (direction)
- **Context:** Need named engines so future work does not sprawl into screens.
- **Decision:** Architecture defines: Conversation Orchestrator, Recovery Engine, Adaptive Today Engine, Athlete Model, Training Knowledge Engine, Progress Engine, Run Execution Engine, Voice architecture, Sensor architecture.
- **Consequences:** New work maps to engines; screens compose engines. Static session catalogue is the current Training Knowledge Engine. `getTodaySession()` stub is temporary Adaptive Today.
- **References:** Architecture §§3–11; statuses mix **Shipped** / **In progress** / **Direction (not built)**

---

## D-014 — Structured tool/action model for AI (future)

- **Date:** 2026-09
- **Status:** Accepted (direction)
- **Context:** Unconstrained LLM output is unsafe for coaching actions.
- **Decision:** When Python brain exists, it invokes structured tools and emits typed `CoachingAction` / `CoachingDecision` objects. Mobile validates before execution. Rejected actions are logged.
- **Consequences:** No freeform UI mutation by LLM. Tools wrap engines; they do not replace deterministic engines.
- **References:** Architecture §17; **Direction (not built)**

---

## D-015 — Explicitly not MVP

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Prevent scope drift.
- **Decision:** Out of scope unless deliberately changed: social, subscriptions/payments/ads, full training-plan generation, marketplace, route navigation, broad wearables beyond HR strap, deep analytics competitor features, cosmetic redesigns that do not improve coaching.
- **Consequences:** Roadmap must not schedule these in Phases 1–3 without Product Bible update.
- **References:** Product Bible §§6, 18, 20; Roadmap deferred section

---

## D-016 — Readiness is conversational, not a score dashboard

- **Date:** 2026-08
- **Status:** Accepted (direction)
- **Context:** Risk of building HRV/readiness dashboards that displace coaching.
- **Decision:** Daily readiness philosophy informs pre-run conversation. Not a primary readiness score product. No HRV/sleep dashboard as core MVP UI.
- **Consequences:** Recovery Engine outputs recommendations for conversation; do not invent score-first UX.
- **References:** Product Bible §15; Training Principles §5; **Direction (not built)**

---

## D-017 — RPE on Summary is the first post-run feedback path

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Need subjective feedback without full conversation UI yet.
- **Decision:** Summary includes RPE capture path. Placeholder exists today; complete as Progress Engine input before full post-run conversation.
- **Consequences:** Roadmap Phase 1 includes finishing RPE. Conversation UI comes later.
- **References:** Product Bible §§8, 14; Roadmap 1.5; **In progress**

---

## D-018 — Free Run is GPS-only, not coached

- **Date:** 2026-08
- **Status:** Accepted
- **Context:** Need an unstructured path for GPS testing and open runs.
- **Decision:** Free Run has empty blocks: timer + GPS only; no coaching, transitions, or auto-complete.
- **Consequences:** Do not silently apply Easy Run coaching to Free Run.
- **References:** Product Bible §10; Architecture §9; **Shipped**

---

## D-019 — Retain shipped engines; extend rather than rewrite

- **Date:** 2026-09
- **Status:** Accepted
- **Context:** Future LLM/backend work must not destroy reliable run loop.
- **Decision:** GPS pipeline, block engine, pace coaching state machine, voice hooks, transition messages, session types, navigation params, and unit tests are foundational. Extend them; do not replace with LLM logic.
- **Consequences:** Coding Principles and Architecture §20 bind agents to this rule.
- **References:** Architecture §20; Coding Principles §17

---

## D-020 — Documentation hierarchy

- **Date:** 2026-09
- **Status:** Accepted
- **Context:** Multiple docs must not conflict.
- **Decision:**
  - Product Bible = what/why (product authority)
  - Architecture = technical structure
  - Roadmap = when
  - Training Principles = training science for engines
  - Coding Principles + AGENTS = how to implement safely
  - Decisions = why past choices stand
- **Consequences:** On conflict, Product Bible wins for scope; Architecture wins for structure; AGENTS/Coding Principles win for implementation safety process.
- **References:** All `docs/*` and `AGENTS.md`

---

## Open items (not yet decided)

Record here only when a decision is needed and unresolved:

| Topic | Why open | Blocking? |
|-------|----------|-----------|
| BLE library selection for HR strap | Native impact; needs approval | Blocks Phase 1.1 implementation start |
| Whether to ship distance-based blocks in Phase 1 or explicitly defer | MVP lists them; only time-based exists | Should be resolved before Phase 1 exit |
| Local persistence technology for Athlete Model / Progress Engine | File vs SQLite etc. | Needed before Phase 2 persistence |
| Python hosting / API contract | Requires approval | Blocks Phase 3.4 |

When resolved, convert to a numbered decision above and remove from this table.

---

*Last updated: September 2026 (v1.0). Append new decisions; do not rewrite history — mark superseded entries instead.*
