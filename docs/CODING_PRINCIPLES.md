# rRunAI Coding Principles

**Version 1.0 — How to implement safely**

This document defines coding standards for rRunAI. It complements [`AGENTS.md`](../AGENTS.md) (agent workflow) and [`ARCHITECTURE.md`](ARCHITECTURE.md) (system structure). Product intent remains in [`PRODUCT_BIBLE.md`](PRODUCT_BIBLE.md).

Every engineer and AI agent must follow these principles when modifying the codebase.

---

## 1. Mission of the code

Code exists to deliver a reliable coaching loop:

1. Understand the workout and current block.
2. Observe sensors (GPS today; HR when built).
3. Interpret effort vs intended stimulus.
4. Deliver concise voice guidance at the right moment.
5. Adapt future guidance without overwhelming the runner.

Prefer a working end-to-end loop over shallow features.

---

## 2. Stack locks

Do not replace without explicit approval:

| Layer | Locked choice |
|-------|---------------|
| Language | TypeScript |
| UI | React 19 |
| Mobile | React Native 0.83 |
| Platform | Expo SDK 55 |
| Navigation | React Navigation native stack |
| GPS | `expo-location` |
| Speech | `expo-speech` |
| Packages | npm + `package-lock.json` |
| Native | iOS and Android projects alongside Expo |

Adding a dependency requires justification: what it solves, why existing code cannot, and native-build impact. BLE libraries and backends require approval.

---

## 3. Layering rules

Keep responsibilities separate:

| Layer | Location | May do | Must not do |
|-------|----------|--------|-------------|
| Presentation | `app/screens/` | Compose hooks, render UI | Own GPS math, coaching rules, speech cooldowns |
| Hooks | `app/hooks/` | React lifecycle adapters | Become god-hooks owning all layers |
| Services | `app/services/` | Device I/O and processing without React | Import React or screens |
| Types | `app/types/` | Domain models | Side effects |
| Utils | `app/utils/` | Pure functions | Hidden global state |

Screens compose engines; they do not embed engine logic. Services have no React dependencies. Utils are pure and testable.

---

## 4. Decision to coach ≠ mechanism that speaks

- Coaching produces typed decisions (`CoachingFeedback` today; `CoachingDecision` later).
- Voice hooks consume decisions independently.
- Future Python brain may produce decisions; voice delivery stays local.
- Do not merge coaching math into `Speech.speak` call sites.

---

## 5. Local-first and offline

- The active run must work with no network.
- Do not add required network calls to the run path.
- Pre/post-run backends (future) must degrade to local catalogue / local history.
- Never block run start/stop on remote latency.

---

## 6. Deterministic vs non-deterministic

**Always deterministic (on-device):**

- GPS filtering and pace calculation
- Block progression and timing
- Pace threshold comparison
- Transition message generation
- Voice priority and cooldown
- Permission and subscription lifecycle

**May be non-deterministic later (with fallback):**

- Pre-run conversation phrasing
- Post-run reflection phrasing
- Nuanced coaching phrasing
- Adaptation recommendations

LLM/Python must never own block timing, GPS acceptance, or voice cooldown enforcement.

---

## 7. Units and types

At every boundary, keep units explicit:

| Quantity | Internal | Display |
|----------|----------|---------|
| Distance | metres | kilometres |
| Time | seconds | mm:ss |
| Speed | m/s in algorithms | — |
| Pace | min/km | min/km (smaller = faster) |

Rules:

- Prefer typed interfaces over `any`.
- Coaching I/O must be JSON-serializable for future Python handoff.
- Never silently mix metres and kilometres.
- Never divide by zero or emit invalid pace values.
- Distinguish null/missing from zero.

---

## 8. GPS and pace (high risk)

Before changing GPS/pace:

1. Identify inputs, outputs, units, filters, and consumers.
2. Make the smallest change that solves the problem.
3. Preserve diagnostics for rejected/accepted samples.
4. Keep internal pace and display pace meanings distinct.
5. Do not feed raw GPS noise into coaching.
6. Clean up subscriptions on run end and unmount.
7. Add or update focused tests with deterministic sample data.
8. State clearly when physical-device GPS was not tested.

Do not rewrite the GPS pipeline without approval.

---

## 9. Voice coaching (high risk)

- Voice is primary during the run; screen is glanceable companion.
- Cues: concise, calm, actionable; most important instruction first.
- Respect cooldowns; dedupe; prevent overlapping/contradictory cues.
- Transition cues interrupt pace cues (`Speech.stop()` then speak).
- Wrap speech in try/catch; never crash on TTS failure.
- Critical transitions must keep a local voice path forever.

---

## 10. Heart-rate (when built)

- Ask before adding BLE library.
- Timestamp values; distinguish live / stale / missing / invalid.
- Handle permission denial, unsupported devices, disconnect, reconnect.
- Never crash or block a run on strap failure.
- Fall back to GPS pace + workout structure.
- No medical inference.
- Zones configurable and explainable.
- Note when physical strap was not tested.

---

## 11. Workout and coaching rules

- Targets come from the **active block**, not session defaults alone.
- Warm-up / recovery / cool-down without targets: coaching silent.
- Free Run: no blocks, no coaching.
- Prefer extending `session.ts` catalogue over hardcoding sessions in screens.
- Replace `getTodaySession()` stub via Adaptive Today Engine, not screen-local logic.

---

## 12. Error handling and degradation

Always degrade safely:

| Failure | Required behavior |
|---------|-------------------|
| GPS denied / calibrating | Message; continue; coaching waits for valid pace |
| Background GPS denied | Foreground continues |
| Speech fails | Silent continue |
| HR fails (future) | Fall back to pace |
| Backend timeout (future) | Local fallback; never stall run |

Do not throw uncaught errors that leave location subscriptions running.

---

## 13. Testing

- Deterministic engines need unit tests with fixture data.
- Existing coverage: pace, sample deduper, location source gate, GPS diagnostics, transition messages, formatters.
- Add tests when changing GPS, coaching, transitions, or persistence.
- Prefer narrow tests first, then broader checks proportional to risk.
- Do not claim device GPS/HR/voice validation without performing it.

---

## 14. Change workflow

For every task:

1. Read relevant code and Product Bible / Architecture before editing.
2. State assumptions that materially affect the solution.
3. Choose the smallest reversible change.
4. Avoid unrelated cleanup, renames, formatting, or dependency bumps.
5. Reuse existing hooks, services, utils, and types when they fit.
6. Update focused tests when behavior warrants it.
7. Review the final diff for accidental scope.
8. Report outcome, files, decisions, validation, untested areas, risks.

Protect user-authored and unrelated uncommitted work.

---

## 15. What requires approval

Ask before:

- Major architecture changes (global state, navigation replacement, moving core logic to server)
- New native dependencies (especially BLE)
- Python service, API, database, auth, cloud deployment
- Replacing GPS pipeline or voice delivery stack
- Broadening Product Bible scope (social, payments, plans, maps, analytics)

Do not ask for routine implementation details when code and docs already answer them.

---

## 16. Communication standards

The product owner is not assumed to be a professional coder.

- Lead with practical outcome.
- Explain why it matters to the runner or product.
- Define unavoidable technical terms briefly.
- Distinguish facts, assumptions, recommendations, and risks.
- Disclose failed checks and untested device behavior.

---

## 17. Retain vs rewrite

**Retain and extend:**

- GPS pipeline (`pace.ts`, `runLocation*`, `sampleDeduper`, `locationSourceGate`)
- `useWorkoutBlocks`, `useCoaching`, voice hooks, `transitionMessages.ts`
- `session.ts` types and catalogue
- Navigation param flow
- Existing unit tests

**Safe to add new modules:**

- Athlete Model store
- Progress Engine persistence
- Recovery / Adaptive Today engines
- Conversation UI
- HR BLE service
- Python client (with approval)

**Do not rewrite as LLM logic:** GPS filtering, block timing, voice cooldown, pace thresholds, permission lifecycle.

---

## 18. File placement conventions

| New code | Prefer |
|----------|--------|
| Domain types | `app/types/` |
| Pure algorithms | `app/utils/` |
| Device / processing without React | `app/services/` |
| React lifecycle glue | `app/hooks/` |
| Screens | `app/screens/` |
| Shared presentational pieces | `app/components/` (when extracted) |
| Unit tests | `tests/` mirroring module concern |

Avoid dumping business logic into `RunScreen.tsx`. Prefer extraction when a second consumer appears.

---

## 19. Documentation duty

When behavior or architecture changes:

- Update Product Bible only if product scope/principles change (rare; requires care).
- Update Architecture when engines, data flows, or retain/rewrite guidance change.
- Update Roadmap when phase status changes.
- Record consequential choices in [`DECISIONS.md`](DECISIONS.md).
- Keep status labels honest: **Shipped** / **In progress** / **Direction (not built)**.

---

## Related documents

| Document | Role |
|----------|------|
| [`AGENTS.md`](../AGENTS.md) | Agent-facing workflow and reporting format |
| [`PRODUCT_BIBLE.md`](PRODUCT_BIBLE.md) | Product intent |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System design |
| [`ROADMAP.md`](ROADMAP.md) | What to build next |
| [`DECISIONS.md`](DECISIONS.md) | Why past choices were made |

---

*Last updated: September 2026 (v1.0). Align with AGENTS.md and Architecture §1, §19–§20.*
