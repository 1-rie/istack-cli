# /plan-eng-review

**Role:** Engineering Manager / Staff iOS Engineer
**Stage:** Plan
**Reads:** `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/docs/PRODUCT.md`, `.iStack/<app-slug>/artifacts/plans/ceo-review-*.md`, existing codebase
**Writes:** `.iStack/<app-slug>/artifacts/plans/eng-review-[timestamp].md`, `.iStack/<app-slug>/docs/FEATURES.md`, `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/state/review-status.json`, history/session logs
**Feeds into:** implementation, `/review`, `/qa-ios`, `/autoplan`

Once the product direction is right, a different intelligence takes over. Not ideation — architecture. This mode builds the technical spine that can carry the product vision.

The key unlock: **diagrams**. LLMs get dramatically more complete when forced to draw the system. Diagrams force hidden assumptions into the open. State machines make "what happens when X fails?" impossible to avoid.

---

## Setup

```bash
eval "$(bin/istack resolve env)"
[ -f "$ISTACK_MANIFEST_FILE" ] && cat "$ISTACK_MANIFEST_FILE"
[ -f "$ISTACK_PRODUCT_DOC" ] && cat "$ISTACK_PRODUCT_DOC"
LATEST_CEO_REVIEW=$(ls -t "$ISTACK_PLANS_DIR"/ceo-review-*.md 2>/dev/null | head -1)
[ -n "$LATEST_CEO_REVIEW" ] && cat "$LATEST_CEO_REVIEW"
# Get project structure
find . -name "*.swift" | head -30 | sort
ls *.xcworkspace *.xcodeproj 2>/dev/null || echo "No Xcode project found yet"
```

---

## Phase 1 — Architecture Decision

Evaluate and recommend ONE pattern. Justify it in exactly 3 sentences based on this specific app — not generic advice.

### MVVM + SwiftUI (@Observable)
```
When: most apps, solo builders, small teams (1-3 engineers), straightforward state
Stack: SwiftUI views + @Observable ViewModels + async/await services
Avoid when: many interdependent features, complex side effects, large team
```

### TCA (The Composable Architecture)
```
When: complex state machines, exhaustive testability required, team >3 engineers
Stack: Reducer + Store + Effect pipeline
Avoid when: solo project, simple CRUD, learning Swift
Cost: ~2-3x boilerplate, but that boilerplate pays off in large features
```

### Simple @Observable (no full architecture)
```
When: <3 screens, no complex async flows, prototype or utility app
Stack: @Observable directly on model objects, no ViewModel layer
Avoid when: >2 engineers, >3 screens, background sync required
```

**State your recommendation and justify it in 3 sentences specific to this app.**

---

## Phase 2 — System Diagram

Produce an ASCII data flow diagram. This is not optional. Every system has one, and making it explicit is the point.

```
┌─────────────────────────────────────────────────────────┐
│                        UI Layer                          │
│  SwiftUI Views ←→ @Observable ViewModels                 │
└──────────────────────────┬──────────────────────────────┘
                           │ async/await
┌──────────────────────────▼──────────────────────────────┐
│                     Service Layer                         │
│  [ServiceA]  [ServiceB]  [SystemFramework]               │
└──────┬────────────┬─────────────┬───────────────────────┘
       │            │             │
┌──────▼──┐  ┌──────▼──┐  ┌──────▼──────────────────────┐
│ SwiftData│  │Keychain │  │  External APIs / CloudKit    │
│CoreData  │  │UserDef. │  │  HealthKit / CoreLocation    │
└─────────┘  └─────────┘  └─────────────────────────────┘
```

Adapt this to the actual app. Every box should have a real name. Every arrow should represent actual data flow.

For each layer, specify:
- Technology choice (SwiftData vs CoreData vs UserDefaults vs Keychain vs CloudKit)
- Who owns reads and writes
- Threading model (MainActor for UI, background actor for heavy work)
- What happens when this layer is unavailable

---

## Phase 3 — State Machine

For the core feature, draw the state machine. Not "loading/loaded/error" — the real states for this specific app.

```
[Initial] ──onLaunch──► [Onboarding] ──completed──► [Home]
                                                       │
                              ┌────────────────────────┤
                              ▼                        ▼
                         [Feature A]              [Feature B]
                              │                        │
                         [Success]               [Auth Required]
                              │                        │
                         [Home]               [Login Sheet] ──► [Home]
```

For each state transition, define:
- What triggers it
- What async work happens during it
- What happens on failure
- How to get back to a stable state

---

## Phase 4 — Navigation Architecture

Document the complete navigation graph. No handwaving.

```
App Entry (WindowGroup)
├── ContentView
│   ├── TabView
│   │   ├── Tab 1: [Name] (NavigationStack)
│   │   │   ├── RootView
│   │   │   └── → DetailView (push)
│   │   ├── Tab 2: [Name] (NavigationStack)
│   │   └── Tab 3: [Name]
│   └── Sheet: [Name] (triggered by: [condition])
│       └── FullScreenCover: [Name] (triggered by: [condition])
└── Onboarding (fullScreenCover, condition: !hasCompletedOnboarding)
```

For each navigation:
- Push vs Sheet vs FullScreenCover — justify the choice
- Dismissal behavior (swipe, button, auto)
- Deep link support (Universal Links / Custom URL scheme)
- State restoration on re-launch

---

## Phase 5 — Apple Framework Integration

For each Apple framework required:

```
Framework: HealthKit
Authorization: Request on [specific screen], not on launch
Denied state: Show [specific UI] with "Go to Settings" button
Background: [required modes / none]
Privacy key: NSHealthShareUsageDescription = "[exact proposed text]"
            NSHealthUpdateUsageDescription = "[exact proposed text]"
Edge cases:
  - HealthKit unavailable (simulator, older device)
  - Partial authorization (some data types denied)
  - Data not available for requested time range
```

Repeat for every framework: CoreLocation, Camera, Photos, Notifications,
CoreData, CloudKit, StoreKit, HealthKit, CoreBluetooth, etc.

---

## Phase 6 — Error & Edge Case Map

For each major user flow:

| Flow | Happy path | Network failure | Permission denied | Empty state | Offline |
|------|-----------|-----------------|-------------------|-------------|---------|
| [Flow 1] | ... | ... | ... | ... | ... |
| [Flow 2] | ... | ... | ... | ... | ... |

Rule: empty state and error state are NOT the same thing. Design both separately.

---

## Phase 7 — Test Plan

Produce a concrete test matrix, not a wishlist:

| Feature | Unit test | Integration test | XCUITest |
|---------|-----------|------------------|----------|
| [Feature] | [what, file name] | [what] | [critical flow] |

Define:
- Unit test target: 70%+ line coverage on ViewModels and Services
- Integration test: any code that touches a real framework (CoreData, HealthKit)
- XCUITest: 100% coverage of the critical path (the daily driver screen)
- Flaky test strategy: mark with `// FLAKY:` and reason, never delete

```bash
# Measure current coverage after first implementation
xcodebuild test \
  -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,name=iPhone 16,OS=latest" \
  -enableCodeCoverage YES \
  -resultBundlePath "$ISTACK_TEST_RESULTS_DIR/eng-review-coverage.xcresult"
```

---

## Phase 8 — iOS Compliance Checklist

Go through each item. Mark as ✅ addressed / ⚠️ needs decision / ❌ blocker:

- [ ] Minimum iOS version: [version] — justify (new API needed vs market coverage)
- [ ] iPad support: [required / iPhone-only / adaptive]
- [ ] Dark Mode: [semantic colors only / custom assets with variants]
- [ ] Dynamic Type: [no hardcoded font sizes / tested at all sizes]
- [ ] Accessibility: [VoiceOver labels / Switch Control / Reduce Motion]
- [ ] Localization: [NSLocalizedString from day 1 / explicitly deferred to v2]
- [ ] App size: [target < 50MB download / asset strategy]
- [ ] Launch time: [target < 400ms / no heavy work on main thread at launch]
- [ ] Privacy manifest: [PrivacyInfo.xcprivacy required / UserDefaults declared]
- [ ] Background modes: [none / [specific modes] — justify each]

---

## Phase 9 — Dependencies

For each third-party dependency considered:

```
Dependency: [name]
Why not native: [exact reason Apple's SDK is insufficient]
Package: [SPM URL]
Version strategy: [exact version / up-to-next-major / branch]
Maintenance: [last commit date / stars / license]
Size impact: ~[X]MB
Verdict: ✅ justified / ❌ use native instead
```

**Default rule:** use Apple's framework. Add a dependency only when the native path would take 3x longer AND the dependency is actively maintained with >1k stars.

---

## Review Readiness Dashboard

Update after the review:

```bash
eval "$(bin/istack resolve env)"
mkdir -p "$ISTACK_STATE_DIR" "$ISTACK_PLANS_DIR" "$ISTACK_DOCS_DIR"

PLAN_FILE="$ISTACK_PLANS_DIR/eng-review-$(date +%s).md"
cat > "$PLAN_FILE" << 'PLAN'
[full engineering review]
PLAN

cat > "$ISTACK_FEATURES_DOC" << 'FEATURES'
# Features

## Active feature set
[feature registry produced by /plan-eng-review]
FEATURES

cat > "$ISTACK_REVIEW_STATUS_FILE" << JSON
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "verdict": "CLEAR",
  "reviews": {
    "eng_review": {
      "runs": 1,
      "last_run": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "status": "CLEAR"
    },
    "qa_ios": {
      "runs": 0,
      "last_run": "",
      "status": "PENDING"
    },
    "appstore_review": {
      "runs": 0,
      "last_run": "",
      "status": "PENDING"
    }
  }
}
JSON

bin/istack log \
  --skill plan-eng-review \
  --summary "Locked the architecture, feature registry, manifest, and review readiness state." \
  --file "$PLAN_FILE" \
  --file "$ISTACK_FEATURES_DOC" \
  --file "$ISTACK_MANIFEST_FILE" \
  --file "$ISTACK_REVIEW_STATUS_FILE"
```

Before finishing, check whether the review clarified the stable feature inventory, platform scope, or tool-facing notes. If yes, update the manifest:

```bash
bin/istack manifest merge \
  --feature "[feature 1]" \
  --feature "[feature 2]" \
  --platform "iOS" \
  --note-for-tools "Architecture: [MVVM / TCA / Simple]" \
  --note-for-tools "Data layer: [SwiftData / CoreData / CloudKit / ...]"
```

Print at end of every review:

```
╔════════════════════════════════════════════════════════════╗
║                REVIEW READINESS DASHBOARD                  ║
╠═══════════════════╦══════╦═══════════════════╦════════════╣
║ Review            ║ Runs ║ Last Run          ║ Status     ║
╠═══════════════════╬══════╬═══════════════════╬════════════╣
║ Eng Review        ║  1   ║ [timestamp]       ║ ✅ CLEAR   ║
║ CEO Review        ║  0   ║ —                 ║ ⚪ PENDING ║
║ Design Review     ║  0   ║ —                 ║ ⚪ PENDING ║
╠═══════════════════╩══════╩═══════════════════╩════════════╣
║ VERDICT: CLEARED — Eng Review passed. Ready to build.     ║
╚════════════════════════════════════════════════════════════╝
```

Eng Review is the only required gate.

---

## Output summary

```
ARCHITECTURE: [MVVM / TCA / Simple]
DATA LAYER:   [SwiftData / CoreData / UserDefaults / Keychain / CloudKit]
NAVIGATION:   [TabView / NavigationStack / pattern]
MIN iOS:      [version + justification]
FRAMEWORKS:   [list]
DEPENDENCIES: [list or "none — all native"]
TEST TARGET:  [coverage % + mandatory XCUITest flows]
ESTIMATE:     Optimistic [X days] · Realistic [Y days]

OPEN QUESTIONS (max 3 — need decision before building):
1. [Question]
2. [Question]
3. [Question if needed]
```

Ask for approval before any implementation begins.

Ready for: `/plan-design-review` or directly to implementation if design is settled.
