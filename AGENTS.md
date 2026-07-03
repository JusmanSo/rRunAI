# rRunAI Engineer Guide — Version 2

This guide governs future Codex work in the rRunAI repository. Follow it unless the user explicitly gives different instructions for a task.

## 1. Mission

rRunAI exists so that once a runner steps out the door, no minute of training is wasted.

The product is a voice-first, real-time coaching intelligence for runners. It should observe the run, understand the planned workout and the runner's current effort, and deliver timely guidance that helps the runner train with purpose.

The runner is the hero. rRunAI is the guide. The product should support the runner's judgment and progress rather than draw attention to itself.

## 2. Target user

The primary user is a midlife recreational runner, especially age 40+, who wants to train effectively while balancing recovery, health, work, family, and limited training time.

Design and engineering decisions should account for:

- The need for clear, calm guidance during physical effort.
- Varying levels of technical and running experience.
- Age-aware training, recovery, and injury-risk considerations.
- Limited attention during a run.
- The importance of making every training session purposeful.
- A runner who may use a phone, headphones, and a heart-rate strap while outdoors.

Do not assume the user is an elite athlete or a professional coder.

## 3. Product positioning

rRunAI is not primarily a run tracker, dashboard, or collection of post-run statistics. Tracking is an essential input to its coaching intelligence.

The product's value is the real-time loop:

1. Understand the workout and its current block.
2. Observe GPS pace, elapsed time, distance, heart rate, and relevant session state.
3. Interpret whether the runner is executing the intended training stimulus.
4. Deliver concise voice guidance at the right moment.
5. Adapt future guidance without distracting or overwhelming the runner.

Screen interactions should support this loop. They must not displace the voice-first experience.

## 4. MVP scope

MVP-critical capabilities are:

- Start, pause where supported, complete, and summarize a running session.
- Request and handle location permission safely.
- Track location, elapsed time, distance, current pace, and useful pace trends with GPS.
- Define structured workouts as timed or distance-based blocks.
- Progress reliably through warm-up, work, recovery, and cool-down blocks.
- Interpret workout targets and live sensor data for real-time coaching decisions.
- Deliver spoken workout transitions, pace guidance, effort guidance, and useful coaching cues.
- Connect to and read data from a supported heart-rate strap.
- Incorporate heart-rate data into coaching when available.
- Degrade safely when heart-rate data is unavailable or disconnected.
- Keep the active-run screen simple and glanceable.
- Show a useful post-run summary.
- Support the Home, Run, and Summary journey.
- Maintain a clear path toward a Python-based coaching brain.

MVP work should favor a reliable end-to-end coaching loop over a large number of shallow features.

## 5. Explicitly not MVP

Unless the user explicitly changes scope, the following are not MVP:

- Social feeds, messaging, clubs, challenges, or leaderboards.
- Public runner profiles or social sharing systems.
- Subscriptions, payments, advertising, or referral systems.
- A large production backend or multi-service cloud architecture.
- Full long-term training-plan generation.
- Marketplace or coach-management features.
- Advanced route discovery, mapping, or turn-by-turn navigation.
- Broad wearable support beyond the MVP-critical heart-rate strap path.
- Deep post-run analytics intended to compete with dedicated analytics platforms.
- Cosmetic redesigns that do not improve the real-time coaching experience.

Do not let not-MVP work distract from GPS reliability, heart-rate support, workout execution, or voice coaching.

## 6. Locked tech stack

The current mobile stack is locked unless the user approves a change:

- TypeScript
- React 19
- React Native 0.83
- Expo SDK 55
- React Navigation with native stack navigation
- `expo-location` for GPS and location data
- `expo-speech` for spoken coaching
- Native iOS and Android projects maintained alongside Expo
- npm and the existing `package-lock.json` for dependency management

Do not replace core frameworks, navigation, package management, location handling, speech handling, or the Expo/native workflow without asking first.

Adding a dependency is a technical decision that must be justified. Explain what it solves, why existing code cannot solve it cleanly, and its maintenance or native-build impact.

## 7. Current mobile app structure

```text
rRunAI/
├── App.tsx                         # Root React component
├── index.ts                        # Expo application registration
├── app.json                        # Expo and native app configuration
├── package.json                    # Dependencies and npm scripts
├── package-lock.json               # Locked npm dependency versions
├── tsconfig.json                   # TypeScript configuration
├── app/
│   ├── components/                 # Reusable UI components
│   ├── hooks/
│   │   ├── useLocation.ts          # GPS and location tracking
│   │   ├── useWorkoutBlocks.ts     # Structured workout progression
│   │   ├── useCoaching.ts          # Coaching decisions
│   │   ├── useVoiceCoach.ts        # Spoken coaching delivery
│   │   └── useBlockTransitionVoice.ts
│   ├── navigation/
│   │   └── AppNavigator.tsx        # Home -> Run -> Summary navigation
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── RunScreen.tsx
│   │   └── SummaryScreen.tsx
│   ├── services/                   # External and device integrations
│   ├── types/
│   │   └── session.ts              # Session and workout types
│   └── utils/
│       ├── formatters.ts
│       ├── pace.ts
│       └── transitionMessages.ts
├── assets/                         # Icons and splash assets
├── plugins/                        # Expo/native configuration plugins
├── android/                        # Native Android project
└── ios/                            # Native iOS project
```

Keep responsibilities clear. Sensor collection, workout state, coaching decisions, voice delivery, and presentation should not become one tightly coupled component.

## 8. Python coaching brain direction

The long-term coaching intelligence should have a Python-based coaching brain. This brain will interpret workout intent, runner context, live observations, and coaching history to produce structured coaching decisions.

Work toward this direction without prematurely building a large backend:

- Keep mobile sensor collection and active-run safety reliable on the device.
- Keep coaching inputs and outputs explicit, typed, and serializable.
- Separate the decision to coach from the mechanism that speaks the cue.
- Prefer deterministic rules for safety-critical or timing-critical behavior.
- Design coaching decisions so they can later be produced by a Python service without rewriting the entire mobile app.
- Define graceful behavior for latency, loss of connectivity, stale responses, and unavailable services.
- Preserve an on-device fallback for essential workout transitions and basic guidance.
- Do not add a Python service, API contract, cloud deployment, or networking dependency without a scoped task and user approval.

The Python direction is an architectural boundary to prepare for, not permission to over-engineer the MVP.

## 9. GPS and pace rules

GPS pace tracking is a critical path. Treat changes to it as high risk.

- Do not break existing location permission, subscription, cleanup, distance, or pace behavior.
- Preserve the raw observations needed to diagnose pace problems.
- Keep units explicit at boundaries: meters, seconds, meters per second, and displayed pace units.
- Handle missing, delayed, duplicated, inaccurate, or implausible location samples.
- Never divide by zero or emit invalid pace values.
- Do not present unstable instantaneous GPS noise as authoritative coaching input.
- Make smoothing and filtering understandable, bounded, and testable.
- Avoid filters that create excessive lag during workout transitions.
- Keep elapsed-time, moving-time, distance, and pace meanings distinct.
- Clean up location subscriptions when a run stops or a component unmounts.
- Verify GPS-related changes with focused tests or deterministic sample data.
- State clearly when physical-device GPS behavior was not tested.

Before changing GPS or pace logic, identify its current inputs, outputs, units, filters, and consumers. Make the smallest change that solves the problem.

## 10. Voice coaching rules

Voice is the primary during-run interface.

- Preserve the voice-first direction in every during-run feature.
- Keep cues concise, clear, calm, and actionable.
- Say the most important instruction first.
- Avoid unnecessary numbers, jargon, or long explanations during effort.
- Do not speak too frequently or repeat low-value guidance.
- Prioritize safety, workout transitions, and meaningful corrections.
- Prevent overlapping, queued, stale, or contradictory cues.
- Respect cooldowns and deduplicate messages.
- Ensure critical workout transitions have a reliable local voice path.
- Keep voice generation separate from coaching-decision logic.
- Use the screen as a glanceable companion, not the main coaching channel.

When adding a visual during-run feature, consider whether the same information must be available through voice and whether it is useful while the runner is moving.

## 11. Heart-rate strap rule

Heart-rate strap support is MVP-critical. It must not be categorized or treated as a future nice-to-have.

- Build toward a reliable external heart-rate strap connection and reading lifecycle.
- Ask before selecting or adding the Bluetooth/BLE library because it affects native configuration and architecture.
- Keep heart-rate values timestamped and distinguish live, stale, missing, and invalid data.
- Handle permission denial, unsupported devices, connection failure, disconnection, and reconnection.
- Do not allow strap failure to crash or block a run.
- Fall back safely to GPS pace, workout structure, and runner-perceived effort when heart rate is unavailable.
- Do not infer medical conclusions from heart-rate data.
- Avoid presenting coaching as medical diagnosis or treatment.
- Keep heart-rate zones and thresholds configurable and explain their source.
- Test connection-state and stale-data behavior independently from physical hardware where possible.
- State clearly when a change was not tested with a physical strap.

## 12. Engineering workflow

For each task:

1. Read the relevant code and trace the existing behavior before editing.
2. State any assumption that materially affects the solution.
3. Choose the smallest change that meets the requirement.
4. Keep the change testable and reversible.
5. Avoid unrelated cleanup, renaming, formatting, or dependency updates.
6. Reuse existing hooks, utilities, and types when their responsibility fits.
7. Add or update focused tests when test infrastructure exists and the behavior warrants it.
8. Run the narrowest relevant validation first, then broader checks in proportion to risk.
9. Review the final diff for accidental or unrelated changes.
10. Report what changed, validation results, untested areas, and remaining risks.

Protect user-authored work and existing uncommitted changes. Do not discard, overwrite, or reformat unrelated work.

## 13. Decision rules

- Make small, testable, reversible changes.
- Ask before any major architecture change.
- Ask before replacing a core dependency or adding a native dependency.
- Ask before restructuring major directories or changing data ownership across layers.
- Ask before creating a backend, Python service, API, database, authentication system, or cloud deployment.
- Do not ask for routine implementation details when the existing code and task make the answer clear.
- Prefer the simplest design that preserves a clean path to the coaching-brain direction.
- Preserve backward compatibility unless the user approves a breaking change.
- Treat GPS, pace, active-run lifecycle, workout transitions, voice delivery, and heart-rate integration as high-risk areas.
- Do not broaden task scope merely because nearby code could be improved.
- If product intent and current behavior conflict, explain the conflict before making a consequential choice.

A major architecture change includes introducing global state management, replacing navigation, moving core logic between mobile and server, changing the Expo/native model, or redesigning the sensor/coaching data flow.

## 14. Communication rules

The user is not a professional coder. Communicate technical decisions in plain English.

- Lead with the practical outcome.
- Explain what changed and why it matters to the runner or product.
- Define unavoidable technical terms briefly.
- Describe tradeoffs concretely rather than using vague labels such as "cleaner" or "more scalable."
- Distinguish facts, assumptions, recommendations, and unresolved risks.
- Mention files and code details only when they help the user verify the work.
- Do not hide uncertainty or claim device behavior was tested when it was not.
- Keep routine updates concise.
- Ask a focused question before decisions that materially change architecture, product behavior, cost, or maintenance burden.

## 15. Commands to run the app

Run commands from the repository root:

```bash
cd /Users/jusman/Desktop/rRunAi/rRunAI
npm install
npm start
```

Equivalent Expo command:

```bash
npx expo start
```

Platform-specific commands:

```bash
npm run ios
npm run android
npm run web
```

Native iOS and Android runs require their local platform toolchains. GPS, background behavior, speech, Bluetooth permissions, and physical heart-rate straps require device-level validation where applicable.

## 16. Reporting format after each task

Use this format:

```text
Outcome
- What now works or changed for the user.

Files changed
- path/to/file: plain-English summary.

Technical decisions
- What was decided and why.

Validation
- Command or check: PASS/FAIL.

Not tested
- Device-only or unavailable validation, especially GPS, speech, and heart-rate straps.

Risks or follow-up
- Remaining risk, next step, or "None."

Scope
- Confirm whether only requested files were changed.
```

Keep the report proportional to the task. Always disclose failed checks and explicitly confirm whether any physical-device GPS, voice, or heart-rate validation was performed.
