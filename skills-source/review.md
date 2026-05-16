# /review

**Role:** Paranoid Staff iOS Engineer
**Stage:** Review
**Reads:** `git diff main...HEAD`, full codebase
**Writes:** auto-fixes committed, `.iStack/<app-slug>/artifacts/reviews/review-[timestamp].md`, history/session logs
**Feeds into:** `/qa-ios`, `/ship-ios`

Passing tests do not mean the branch is safe.

This mode finds bugs that survive CI and explode in production — or get an App Store rejection. Not style nitpicks. Structural problems. The production incident that hasn't happened yet.

**Fix-first:** obvious mechanical issues are auto-fixed and committed. Genuinely ambiguous issues (security, race conditions, design decisions) get surfaced for your call.

---

## Setup

```bash
# Get the diff
git diff main...HEAD --name-only
git diff main...HEAD --stat

# If on main, review last commit
git diff HEAD~1 --name-only
```

---

## Auto-fix pass (silent, commit as "fix(review): auto-fixes")

Apply these without asking. Commit atomically:

**Memory management:**
- `closure { self.method() }` where `self` can outlive closure → `{ [weak self] in self?.method() }`
- `closure { self.property = value }` in escaping context → add `[weak self]`
- `NotificationCenter.default.addObserver` without corresponding `removeObserver` in `deinit`

**Swift safety:**
- `let value = optionalDict["key"]!` where `optionalDict["key"]` could be nil → `guard let` or `if let`
- `try!` in non-test, non-throwable-by-design code → proper `do/catch`
- `DispatchQueue.main.async { self.updateUI() }` → `await MainActor.run { self.updateUI() }` (if already in async context)
- Unused `import` statements

**Code quality:**
- `print("debug")` statements left in production code → remove
- `// TODO: fix this` comments older than 7 days (check git blame) → flag, don't remove
- Hardcoded strings that should be localized if `Localizable.strings` exists in project

---

## Critical review pass (report and ask)

For each finding: **file:line — issue — risk — proposed fix**. Ask before fixing.

### Memory & Lifecycle

**Retain cycles (multi-hop):**
Trace ownership chains: View → ViewModel → Service → Closure → back to ViewModel.
```swift
// Red flag pattern:
class ViewModel {
    var onComplete: (() -> Void)?  // Does anything capture self here?
}
```

**Timer not invalidated:**
```swift
// Every Timer.scheduledTimer needs invalidate() in deinit or viewDidDisappear
grep -n "Timer.scheduledTimer\|Timer.publish" --include="*.swift" -r .
```

**Delegate retain cycles:**
```swift
// Delegates should be weak unless the delegate clearly outlives the delegator
grep -n "var delegate:" --include="*.swift" -r . | grep -v "weak"
```

### Concurrency (Swift 6 / async-await era)

**Data races:**
- Mutable `var` properties on class types accessed from multiple async contexts without `@MainActor` or actor isolation
- `@ObservationIgnored` used to bypass observation — is this intentional?
- `nonisolated` functions that access mutable state

**Task lifecycle:**
```swift
// Unstructured Task without cancellation handling
Task {
    await longRunningOperation()  // what happens when view disappears?
}
// Should be: stored in a property and cancelled in deinit/onDisappear
```

**Main thread violations:**
```swift
// UI updates not on MainActor
grep -n "\.reloadData\|\.layoutIfNeeded\|isHidden\s*=" --include="*.swift" -r .
```

### Error handling

**Silent swallow:**
```swift
catch {}            // ERROR: user never knows what failed
catch { _ = error } // ERROR: same
catch { print(error) } // WARNING: dev-only, not surfaced to UI
```

**Missing denied-permission path:**
For every `requestAuthorization` call, trace what happens when `.denied` or `.restricted`:
```bash
grep -n "requestAuthorization\|requestAccess\|requestWhenInUseAuthorization" --include="*.swift" -r .
```
Each must have a corresponding flow that tells the user what to do.

**Force try in production:**
```bash
grep -n "try!" --include="*.swift" -r . | grep -v "/Tests/"
```

### App Store & Runtime

**Private API usage:**
```bash
grep -n "perform(NSSelectorFromString\|valueForKeyPath\|_[A-Z]" --include="*.swift" -r .
```

**Deprecated API without fallback:**
```bash
grep -n "UIWebView\|openURL:\|kCGBitmapByteOrder32" --include="*.swift" -r .
```

**Watchdog termination risk:**
- Heavy work on `@MainActor` at app launch (CoreData migration, large JSON parse, image processing)
- `URLSession` synchronous calls anywhere

**Background task not ended:**
```bash
grep -n "beginBackgroundTask" --include="*.swift" -r .
# Each must have matching endBackgroundTask in all code paths
```

### SwiftUI specific

**Expensive view body:**
```swift
// View body should be fast — no heavy computation
var body: some View {
    let processed = hugeArray.map { expensiveTransform($0) }  // ❌ runs every render
    // Should be in ViewModel, computed once
}
```

**Missing list stability:**
```swift
ForEach(items) { item in  // Does item conform to Identifiable with a stable ID?
    // UUIDs generated on the fly = every render remakes the list
}
```

**GeometryReader abuse:**
```swift
// GeometryReader forces a full layout pass — used for simple centering = antipattern
// Use .frame(maxWidth: .infinity) instead
```

**@State on reference type:**
```swift
@State var viewModel = SomeClass()  // Class needs @StateObject or @Observable
```

### Data & Persistence

**Wrong CoreData/SwiftData context:**
```swift
// All CoreData work must happen on the correct context/actor
// Background insertions via viewContext = data corruption risk
```

**Secrets in UserDefaults:**
```bash
grep -n "UserDefaults.*token\|UserDefaults.*password\|UserDefaults.*secret" --include="*.swift" -r . -i
# Tokens and passwords belong in Keychain
```

**Missing migration:**
```swift
// SwiftData/CoreData model changes without migration = crash on update
// Check if model version was incremented for any schema changes
```

---

## Completeness audit

After reviewing code changes:

- [ ] Every new ViewModel has at least 2 unit tests
- [ ] Every new XCUITest-worthy flow has a test (or documented reason why not)
- [ ] Every new `Info.plist` key has a usage description
- [ ] `CHANGELOG.md` updated for user-facing changes
- [ ] New public Swift APIs have `///` doc comments
- [ ] Any new background mode has a justification comment in `Info.plist`

**Completeness gap rule (from gstack):** If a shortcut implementation is present and the complete version would take less than 30 minutes, flag it. "80% implementation" is not acceptable when the 100% version is right there.

---

## Output format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REVIEW — [branch or "last commit"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AUTO-FIXED: [N issues — committed as "fix(review): auto-fixes"]
  · [file:line] [what was fixed]
  · ...

MUST FIX (blocking):
1. [File:Line] — [Issue]
   Risk: [crash / data loss / App Store rejection / security]
   Fix: [concrete proposal]

SHOULD FIX (not blocking):
1. [File:Line] — [Issue] — [Why it matters]

COMPLETENESS GAPS:
· [Missing test / missing doc / missing key]

WHAT'S DONE WELL:
· [Specific thing — be precise, this matters]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready for: /qa-ios
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
