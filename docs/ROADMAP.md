# rRunAI Roadmap

**Version 1.0 — Phased execution plan**

This document is the execution timeline for rRunAI. It expands Product Bible §20 and Architecture §21 into ordered work. Product scope is governed by [`PRODUCT_BIBLE.md`](PRODUCT_BIBLE.md). Technical structure is governed by [`ARCHITECTURE.md`](ARCHITECTURE.md). Implementation safety is governed by [`AGENTS.md`](../AGENTS.md) and [`CODING_PRINCIPLES.md`](CODING_PRINCIPLES.md).

This is not a feature wishlist. Items appear here only if they appear in the Product Bible MVP or long-term vision.

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Shipped** | Exists in the codebase and is functional today |
| **In progress** | Partially implemented or placeholder present |
| **Direction (not built)** | Planned or architectural direction; requires scoped work |
| **Requires approval** | Must not start without explicit user approval |

---

## How to use this roadmap

1. Complete Phase 1 before starting Phase 2 conversation or Python work.
2. Prefer a reliable end-to-end coaching loop over new surface area.
3. Do not pull deferred items into active phases without a Product Bible scope change.
4. When product intent and current behavior conflict, explain before choosing.
5. Update this document when a phase item ships or scope changes.

---

## Current foundation (already shipped)

These capabilities are complete and must be retained, not rewritten:

| Capability | Status |
|------------|--------|
| Home → Run → Summary navigation | **Shipped** |
| Session catalogue (Easy, Threshold, Interval, Free Run) | **Shipped** |
| Time-based workout blocks (warm-up, work, recovery, cool-down) | **Shipped** |
| GPS foreground + background tracking | **Shipped** |
| Pace filtering, calibration, confidence gating, diagnostics | **Shipped** |
| Pace coaching vs active block targets | **Shipped** |
| Voice: pace cues, block transitions, workout completion | **Shipped** |
| Auto-complete structured workouts | **Shipped** |
| Post-run summary (duration, distance, pace, blocks, GPS debug) | **Shipped** |
| Deterministic on-device run loop (no network required) | **Shipped** |
| Unit tests for pace, GPS, deduper, transitions, formatters | **Shipped** |

---

## Phase 1 — Complete the MVP coaching loop

**Goal:** Finish the reliable end-to-end coaching loop defined in Product Bible §8. Prioritize GPS reliability, heart-rate support, workout execution, and voice coaching over new UI surface.

**Do not start in this phase:** pre-run conversation UI, post-run conversation UI, Python coaching service, social features, analytics platforms.

### Phase 1 work items

| Order | Work item | Engine / area | Status | Notes |
|-------|-----------|---------------|--------|-------|
| 1.1 | Heart-rate strap BLE service + connection lifecycle | Sensor architecture | **Direction (not built)** | MVP-critical. Ask before selecting BLE library. |
| 1.2 | Timestamped HR state: live / stale / missing / invalid | Sensor architecture | **Direction (not built)** | Required for safe coaching use. |
| 1.3 | HR data into coaching decisions when available | Run Execution Engine | **Direction (not built)** | Fall back to GPS pace + workout structure when unavailable. |
| 1.4 | Safe degradation when HR disconnects | Sensor + coaching | **Direction (not built)** | Must not crash or block a run. |
| 1.5 | RPE capture on Summary | Progress Engine | **In progress** | Placeholder exists; replace with real input. |
| 1.6 | Persist completed session summary locally | Progress Engine | **Direction (not built)** | Local-first; no backend required. |
| 1.7 | Run pause / resume where supported | Run Execution Engine | **Direction (not built)** | MVP-critical per Product Bible. |
| 1.8 | Distance-based blocks | Training Knowledge + Run Execution | **Direction (not built)** | MVP scope includes; only time-based exists today. |
| 1.9 | Effort-based coaching beyond pace (using HR when present) | Run Execution Engine | **Direction (not built)** | After 1.1–1.4. |

### Phase 1 exit criteria

- Runner can start, pause where supported, complete, and summarize a session.
- GPS + voice coaching remain reliable.
- Supported heart-rate strap can connect, stream, disconnect, and reconnect without blocking the run.
- Coaching uses HR when available and degrades to pace when not.
- RPE can be captured after a run and stored with the session summary.
- Distance-based blocks work alongside time-based blocks, or an explicit Product Bible scope decision defers them.
- Physical-device validation noted for GPS, voice, and HR where applicable.

---

## Phase 2 — Coaching intelligence boundary

**Goal:** Prepare typed, serializable coaching I/O and local athlete context so a future Python brain can plug in without rewriting the mobile app. Keep safety-critical paths on-device.

**Do not start in this phase:** production Python service deployment, cloud auth, multi-service backend.

### Phase 2 work items

| Order | Work item | Engine / area | Status | Notes |
|-------|-----------|---------------|--------|-------|
| 2.1 | Formalize `CoachingDecision` type (typed, serializable) | Data model | **Direction (not built)** | Consumed by existing voice hooks. |
| 2.2 | Local Athlete Model store | Athlete Model | **Direction (not built)** | Typed runner context; no medical profile. |
| 2.3 | Progress Engine session history | Progress Engine | **Direction (not built)** | Feeds Athlete Model. |
| 2.4 | Replace `getTodaySession()` stub | Adaptive Today Engine | **In progress** | Stub always returns Easy Run. |
| 2.5 | Recovery signals for today planning (rules-based first) | Recovery Engine | **Direction (not built)** | Conversation UI not required yet. |
| 2.6 | Expand tests for coaching and sensor edge cases | Deterministic engines | **In progress** | Build on existing pace/GPS tests. |
| 2.7 | Confirm on-device fallback for all safety-critical paths | Run Execution + Voice | **Shipped** (partial) | Transitions + basic pace coaching already local. |

### Phase 2 exit criteria

- Coaching decisions are typed JSON suitable for future Python handoff.
- Athlete Model persists locally and degrades when fields are missing.
- Session history is available for readiness and adaptation logic.
- `getTodaySession()` is driven by Adaptive Today Engine (even if rules-only).
- Deterministic fallback remains the authority during runs.

---

## Phase 3 — Conversation and coaching brain

**Goal:** Deliver conversation-first pre-run and post-run modes, then optionally a Python coaching brain with structured tools. Requires explicit approval before backend work.

**Prerequisite:** Phase 1 complete; Phase 2 types and local Athlete Model in place.

### Phase 3 work items

| Order | Work item | Engine / area | Status | Gate |
|-------|-----------|---------------|--------|------|
| 3.1 | Coaching orchestrator (phase routing) | Orchestration | **Direction (not built)** | — |
| 3.2 | Pre-run conversation-first UI (text) | Orchestration + Adaptive Today + Recovery | **Direction (not built)** | Scoped approval for UI |
| 3.3 | Post-run conversation-first UI (text) | Orchestration + Progress | **Direction (not built)** | Scoped approval for UI |
| 3.4 | Python coaching service + mobile client | Python brain | **Direction (not built)** | **Requires approval** |
| 3.5 | Structured tool / action model | Python brain | **Direction (not built)** | With 3.4 |
| 3.6 | LLM audit logging (rationale + inputs + rejected actions) | Safety | **Direction (not built)** | With 3.4 |
| 3.7 | Graceful latency, offline, and stale-response behavior | Orchestration + Python client | **Direction (not built)** | With 3.4 |
| 3.8 | Optional pre/post voice modality | Conversation | **Direction (not built)** | After text conversation works |
| 3.9 | Concise runner voice commands during run | Voice architecture | **Direction (not built)** | Separate scoped task; must not displace coaching voice |

### Phase 3 exit criteria

- Pre-run: athlete can discuss readiness, planning, and adaptation via conversation.
- During run: voice-first behavior unchanged; network never required.
- Post-run: athlete can reflect, give feedback, and receive explanations.
- Python brain (if approved) produces validated `CoachingDecision` objects; local fallback always available.
- Tool actions are validated on device before execution.

---

## Explicitly deferred (not MVP)

Do not schedule these unless Product Bible scope is deliberately changed:

| Item | Reason |
|------|--------|
| Social feeds, messaging, clubs, challenges, leaderboards | Not MVP |
| Public profiles / social sharing | Not MVP |
| Subscriptions, payments, advertising, referrals | Not MVP |
| Full long-term training-plan generation | Not MVP |
| Marketplace / coach-management | Not MVP |
| Route discovery, mapping, turn-by-turn navigation | Not MVP |
| Broad wearable support beyond heart-rate strap | Not MVP |
| Deep post-run analytics platform | Not MVP |
| Cosmetic redesigns that do not improve coaching | Not MVP |
| Large multi-service cloud architecture | Premature |
| Daily readiness score / HRV dashboard as primary UI | Philosophy is conversation-first, not score dashboards |
| Medical diagnosis or treatment features | Forbidden |

---

## Priority rules

1. **Phase 1 before Phase 3.** Do not build conversation or Python brain before the MVP loop is reliable.
2. **Heart-rate is MVP-critical.** Do not treat strap support as optional polish.
3. **Retain shipped engines.** Extend GPS, block engine, coaching, and voice; do not rewrite them as LLM systems.
4. **Local-first during runs.** No required network calls on the active-run path.
5. **Ask before native or backend dependencies.** BLE library, Python service, auth, and cloud need approval.
6. **Smallest change that meets the requirement.** Prefer reversible, testable increments.

---

## Suggested near-term sequence (next concrete steps)

If starting implementation now, preferred order:

1. RPE capture on Summary (**In progress** → complete).
2. Local session persistence (Progress Engine foundation).
3. Heart-rate BLE library selection (approval required) → connection lifecycle.
4. HR into coaching with safe fallback.
5. Pause / resume.
6. Distance-based blocks (or explicit deferral decision recorded in `DECISIONS.md`).
7. Formalize `CoachingDecision` + Athlete Model.
8. Only then: conversation UI and Python brain (approval required).

---

## Related documents

| Document | Role |
|----------|------|
| [`PRODUCT_BIBLE.md`](PRODUCT_BIBLE.md) | Product scope and principles |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Engines, data flow, retain-vs-rewrite |
| [`TRAINING_PRINCIPLES.md`](TRAINING_PRINCIPLES.md) | Training science for Adaptive Today / Recovery |
| [`CODING_PRINCIPLES.md`](CODING_PRINCIPLES.md) | How to implement safely |
| [`DECISIONS.md`](DECISIONS.md) | Decision log |
| [`AGENTS.md`](../AGENTS.md) | Agent workflow and stack locks |

---

*Last updated: September 2026 (v1.0). Align updates with Product Bible §20 and Architecture §21.*
