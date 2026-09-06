# rRunAI Training Principles

**Version 1.0 — Training science for product and coaching**

This document defines how rRunAI thinks about training. It expands Product Bible §15–§17 and informs Training Knowledge Engine, Adaptive Today Engine, Recovery Engine, and coaching cue design. It does not invent product features beyond the Product Bible.

Product authority: [`PRODUCT_BIBLE.md`](PRODUCT_BIBLE.md).  
Technical authority: [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Shipped** | Reflected in current session catalogue / coaching behavior |
| **In progress** | Partially present (e.g., RPE placeholder) |
| **Direction (not built)** | Principles that guide future engines; not shipped features |

---

## 1. Who we train

Primary athlete: **midlife recreational runner, especially age 40+**, balancing recovery, health, work, family, and limited training time.

Implications:

- Training serves health, longevity, and purposeful improvement — not elite podium performance.
- Recovery and injury-risk awareness matter as much as hard sessions.
- Guidance must stay calm, clear, and usable under physical effort.
- Do not assume elite experience, race calendars, or unlimited training volume.
- Runner judgment is final. rRunAI guides; it does not command.

---

## 2. Core training philosophy

### 2.1 Every session has an intended stimulus

A run is not undifferentiated time. Each session exists to produce a specific training effect (easy aerobic, threshold, speed/VO₂, or unstructured free run).

**North Star (Product Bible):** Help every runner complete each session with the intended training stimulus — not just log miles.

### 2.2 Structure over volume chasing

Workouts are **sequences of purposeful blocks**:

| Block | Purpose | Coaching during block | Status |
|-------|---------|----------------------|--------|
| Warm-up | Prepare the body | Silent on pace (no target) | **Shipped** |
| Work | Main training stimulus | Pace (and later HR) targets when defined | **Shipped** |
| Recovery | Absorb work; keep easy | Silent on pace (no target) | **Shipped** |
| Cool-down | Wind down | Silent on pace (no target) | **Shipped** |

Warm-up and cool-down are structural, not optional extras.

### 2.3 Purposeful, not maximal

Training should be purposeful, not maximal. Easy days and recovery blocks are load, not failure. rRunAI must not pressure intensity when context suggests restraint.

### 2.4 Conversation-first planning; voice-first execution

- **Pre-run:** discuss readiness, planning, adaptation (conversation-first). **Direction (not built)**
- **During run:** execute the planned stimulus with minimal distraction (voice-first). **Shipped**
- **Post-run:** reflect, capture feedback, learn (conversation-first). **Direction (not built)** for conversation; stats **Shipped**; RPE **In progress**

---

## 3. Session types and stimuli

### 3.1 Shipped catalogue

| Session | Stimulus | Effort language | Work pace target | Status |
|---------|----------|-----------------|------------------|--------|
| Easy Run | Aerobic base | Conversational pace | 6:00–7:00 /km | **Shipped** |
| Threshold Run | Lactate threshold | Comfortably hard — just below race effort | 4:50–5:05 /km | **Shipped** |
| Interval Run | Speed / VO₂ | Fast repeats with recovery | 4:20–4:35 /km | **Shipped** |
| Free Run | Unstructured | Open-ended GPS; no coaching | None | **Shipped** |

### 3.2 Block structures (shipped)

**Easy Run (~14 min)**

1. Warm-up — 2 min  
2. Easy Run — 10 min (6:00–7:00 /km)  
3. Cool-down — 2 min  

**Threshold Run (~14 min)**

1. Warm-up — 3 min  
2. Threshold 1 — 3 min (4:50–5:05 /km)  
3. Recovery — 2 min  
4. Threshold 2 — 3 min (4:50–5:05 /km)  
5. Cool-down — 3 min  

**Interval Run (~11 min)**

1. Warm-up — 3 min  
2. Interval 1 — 1 min (4:20–4:35 /km)  
3. Recovery — 1 min  
4. Interval 2 — 1 min  
5. Recovery — 1 min  
6. Interval 3 — 1 min  
7. Cool-down — 3 min  

**Free Run**

- No blocks; timer + GPS only.

### 3.3 Pace semantics

- Pace is measured in **min/km**.
- Smaller number = faster.
- `targetMinPace` = fastest acceptable pace.
- `targetMaxPace` = slowest acceptable pace.
- Session-level pace targets are for Home display / fallback; coaching uses **active block** targets.

### 3.4 Terminology note

**"Conversational pace"** means easy enough to hold a conversation while running. It is a training intensity term, not the conversation-first product interface.

---

## 4. Intensity and effort

### 4.1 Pace-based guidance (shipped)

During work blocks with targets:

| State | Coaching message |
|-------|------------------|
| Too fast | "Slow down slightly" |
| Too slow | "Pick it up a bit" |
| On target | "Good pace, keep it steady" |
| No target / calibrating | Silent |

Rules:

- Evaluate every 8 seconds.
- Speak pace cues with 25-second cooldown.
- Prefer fewer high-value cues over constant commentary.
- Prefer on-target silence over endless affirmation when the runner is executing well.

### 4.2 Heart-rate guidance (direction)

**Direction (not built)** — MVP-critical when strap exists:

- HR augments pace; it does not replace workout structure.
- Values must be timestamped; distinguish live, stale, missing, invalid.
- Fall back to GPS pace + structure when HR is unavailable.
- Zones must be configurable and explainable.
- Do not infer medical conclusions from HR.
- Do not present coaching as medical diagnosis or treatment.

### 4.3 Perceived effort (RPE)

**In progress** — Summary placeholder only today.

Post-run RPE is the athlete's subjective report of how hard the session felt. It informs future readiness and adaptation conversation. It is not a medical assessment.

---

## 5. Recovery principles

### 5.1 Recovery inside the workout

Recovery blocks are intentional easy jogging between hard efforts. Coaching stays quiet so the runner can actually recover.

**Shipped** in session structure and coaching silence rules.

### 5.2 Recovery across days

**Direction (not built)** as Recovery Engine, but the philosophy is binding:

- Midlife runners need recovery as training, not as optional rest they must "earn."
- Adaptive Today / Recovery logic should recommend restraint when context suggests it.
- Recommendations are suggestions; runner judgment wins.
- Readiness is holistic (physical, mental, contextual) — not a single dashboard score.
- Readiness emerges through **pre-run conversation**, not a mandatory morning questionnaire or HRV dashboard as the primary product.

### 5.3 What recovery is not (today)

| Capability | Status |
|------------|--------|
| Daily readiness score UI | **Direction (not built)** — not primary product |
| HRV / sleep dashboards | **Direction (not built)** |
| Automated forced workout cancellation | **Direction (not built)** — prefer recommendation over override |

---

## 6. Age-aware training (40+)

Design and coaching must account for:

- Longer warm-up needs relative to younger athletes (already reflected in catalogue structure).
- Higher value of easy volume and controlled intensity.
- Greater cost of repeated failed hard sessions.
- Limited training time — every session must earn its place.
- Injury-risk awareness without fear-mongering or medical claims.
- Calm voice tone; no aggressive "push through" culture.

These are product principles. They are not a medical protocol.

---

## 7. Adaptation principles

### 7.1 Within a session (partially shipped)

- Block-aware targets and silence. **Shipped**
- Voice cooldowns and transition priority. **Shipped**
- Future: HR and RPE may refine cues. **Direction (not built)**

### 7.2 Across sessions (direction)

Adaptation means:

- Pre-run plan adjustments based on readiness conversation. **Direction (not built)**
- Post-run learning that informs the next session. **Direction (not built)**
- Explainable changes (which inputs drove the recommendation).
- Fewer, higher-value adaptations — not constant plan churn.

Adaptation must never contradict safety-critical block transitions during a run.

### 7.3 What is not MVP

- Full long-term periodization.
- Automated multi-week plan generation.
- Elite competition peaking cycles.
- Social comparison or leaderboard-driven training.

---

## 8. Coaching language principles

Aligned with voice-first during-run rules:

1. Most important instruction first.
2. Concise, calm, actionable.
3. Avoid unnecessary numbers, jargon, or long explanations mid-effort.
4. Transition cues outrank pace cues.
5. Do not speak too frequently or contradict prior cues.
6. Pre/post-run conversation may be longer and explanatory; during-run must stay short.

Example transition language (shipped patterns):

- "Warm-up complete. Interval 1 of 3, start now."
- "Interval complete. Recover now."
- "Recovery complete. Interval 2 of 3, start now."
- "Intervals complete. Begin cool-down."
- "Workout complete. Nice work."

---

## 9. Safety and medical boundaries

| Rule | Status |
|------|--------|
| No medical diagnosis or treatment claims | Binding |
| No medical inference from HR or GPS | Binding |
| Runner decides when to stop, push, or rest | Binding |
| Sensor failure must not crash or block a run | **Shipped** (GPS/speech); HR **Direction (not built)** |
| Coaching stays quiet when no target applies | **Shipped** |

If the athlete reports pain, illness, or injury in future conversation modes, coaching should favor restraint and encourage professional medical care — never diagnose.

---

## 10. Implications for engines

| Engine | Training principles it must respect | Status |
|--------|-------------------------------------|--------|
| Training Knowledge Engine | Valid block sequences; warm-up/cool-down present; stimulus-correct templates | **Shipped** (static catalogue) |
| Adaptive Today Engine | Purposeful session selection; respect recovery signals | **In progress** (stub) |
| Recovery Engine | Recommend restraint without overriding judgment | **Direction (not built)** |
| Run Execution Engine | Block-aware targets; quiet recovery; calm cues | **Shipped** |
| Progress Engine | Capture RPE and outcomes for learning | **In progress** / **Direction (not built)** |
| Athlete Model | Age-aware context; not a medical record | **Direction (not built)** |

---

## 11. What this document does not authorize

- Inventing new session types without Product Bible alignment.
- Building readiness score dashboards as the primary product.
- Building full training-plan generators.
- Treating Free Run as a coached stimulus (it remains unstructured).
- Elite-only intensity models.
- Replacing deterministic block timing with LLM timing.

---

## Related documents

| Document | Role |
|----------|------|
| [`PRODUCT_BIBLE.md`](PRODUCT_BIBLE.md) | Product philosophy and MVP scope |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Engine boundaries |
| [`ROADMAP.md`](ROADMAP.md) | When training engines ship |
| [`DECISIONS.md`](DECISIONS.md) | Training-related decisions |

---

*Last updated: September 2026 (v1.0). Keep aligned with Product Bible §15–§17.*
