# /investigate

**Role:** Debugger  
**Stage:** Build / Review  
**Reads:** crash logs, error messages, git history, codebase  
**Writes:** root cause documented, fix committed, regression test added  
**Feeds into:** `/review`, `/qa-ios`

The Iron Law: **no fixes without investigation.**

Never guess. Never apply a fix you can't explain. The fix that doesn't address the root cause ships the bug again in 3 weeks, in a different form.

When `/investigate` activates, it automatically applies `/freeze` to the module being investigated — preventing accidental "fixes" to unrelated code while debugging.

---

## Phase 0 — Auto-freeze

```bash
# Identify the module being investigated
# Ask: "What module or feature is the bug in?"
# Then freeze:
FROZEN_PATH="[path to module]"
echo "🔒 FREEZE ACTIVE: $FROZEN_PATH"
echo "All edits restricted to: $FROZEN_PATH"
```

---

## Phase 1 — Define the problem precisely

Ask (or infer from context). Answer all 5 before proceeding:

1. **Observed behavior:** What exactly happens? (exact error message, exact crash, exact wrong output)
2. **Expected behavior:** What should happen?
3. **Reproduction:** What are the exact steps to reproduce? Can you reproduce it every time?
4. **When started:** After what commit / what change / what iOS version / what device?
5. **Scope:** Does it happen on all devices? Specific iOS version? Specific data? Specific user action?

If you have a crash log, read it fully. The top 5 frames are almost always what matters:

```bash
# Check recent crash logs
ls -lt ~/Library/Logs/DiagnosticReports/*.ips 2>/dev/null | head -5
# Or check for crash logs in the project
find . -name "*.crash" -o -name "*.ips" 2>/dev/null | head -5
```

---

## Phase 2 — Evidence gathering

```bash
# When did this code last change?
git log --oneline --follow -- [suspected file] | head -20

# What changed recently in the area?
git log --oneline --since="7 days ago" -- [module path]

# What does the full call stack look like?
grep -rn "[error keyword]" --include="*.swift" . | head -20

# Are there related tests?
find . -name "*Tests*.swift" | xargs grep -l "[suspected class]" 2>/dev/null | head -5

# iOS-specific diagnostics
# Memory issues:
grep -rn "deinit\|willDealloc\|invalidate\|removeObserver" --include="*.swift" . | grep -A2 -B2 "[suspected class]" | head -20

# Concurrency:
grep -rn "@MainActor\|Task\|async\|await\|Actor" --include="*.swift" . | grep "[suspected area]" | head -20

# State:
grep -rn "@State\|@Observable\|@ObservableObject\|@Published" --include="*.swift" . | grep "[suspected class]" | head -20
```

---

## Phase 3 — Form hypotheses

List exactly 3 hypotheses, most likely first.

```
HYPOTHESIS 1 (most likely — [N]% confidence):
Cause: [precise technical explanation]
Evidence FOR: [what supports this]
Evidence AGAINST: [what contradicts this]
Test: [exactly how to confirm or rule out — must be concrete and runnable]

HYPOTHESIS 2 ([N]% confidence):
[same format]

HYPOTHESIS 3 ([N]% confidence):
[same format]
```

If you can't form 3 hypotheses, you need more evidence. Go back to Phase 2.

---

## Phase 4 — Test hypotheses

Test in order: most likely first. One at a time.

**Diagnostic tools for iOS:**

```swift
// Add temporarily to confirm hypothesis (remove before committing fix):

// 1. Thread checking
Thread.isMainThread ? nil : assertionFailure("UI update on background thread: \(#function)")

// 2. State change tracking
@Observable class MyViewModel {
    var items: [Item] = [] {
        didSet { print("📊 items changed: \(items.count) items, thread: \(Thread.isMainThread ? "main" : "bg")") }
    }
}

// 3. Object lifecycle
deinit { print("✅ \(type(of: self)) deallocated — no retain cycle") }
// If this never prints → retain cycle confirmed

// 4. Slow render detection (add to view body during investigation)
let _ = Self._printChanges()

// 5. SwiftUI value equality
struct MyView: View, CustomDebugStringConvertible {
    var item: Item
    var debugDescription: String { "MyView(item: \(item.id))" }
}
```

```bash
# Run specific test to confirm/deny
xcodebuild test \
  $PROJ_ARG \
  -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,name=iPhone 16,OS=latest" \
  -only-testing:"[TestTarget]/[TestClass]/[testMethod]" \
  2>&1 | grep -E "(passed|failed|error)" | tail -5
```

**Stop after 3 consecutive failed attempts.** If 3 approaches don't work, the root cause understanding is wrong. Return to Phase 2 with new evidence. Never spiral.

---

## Phase 5 — Root cause statement

Before writing a single line of fix, state:

```
ROOT CAUSE:
[Precise technical explanation. Ideally: "When [condition], [component] does [wrong thing] 
because [specific code path] assumes [wrong assumption]."]

EVIDENCE THAT CONFIRMS THIS:
[What test or observation proved hypothesis N correct]

FIX APPROACH:
[What change addresses the root cause, not the symptom]

RISK:
[What could the fix break? What to test after applying?]

WOULD A TEST HAVE CAUGHT THIS?
[Yes: what test / No: here's the test we'll add]
```

Get user confirmation: "Root cause identified. Proceed with fix? (yes/no)"

---

## Phase 6 — Apply fix

Minimum change that addresses the root cause. Do not refactor. Do not "improve" unrelated code.

```bash
# Fix, then verify
git add [fixed files]
git commit -m "fix([module]): [root cause description]

Root cause: [one sentence]
Verified by: [what test or observation confirms the fix]"
```

---

## Phase 7 — Verify and regression test

```bash
# 1. Reproduce the original problem — confirm gone
# 2. Run the full test suite
xcodebuild test \
  $PROJ_ARG \
  -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,name=iPhone 16,OS=latest" \
  2>&1 | grep -E "(passed|failed)" | tail -5

# 3. Write the regression test
```

```swift
// Regression test — required for every investigated bug
func test_regression_[bugDescription]() {
    // Context: Investigated [date], root cause: [one sentence]
    // This test would have caught: [explain what was wrong]
    
    // Arrange: exact conditions that triggered the bug
    
    // Act: exact action that caused the wrong behavior
    
    // Assert: the correct behavior that was missing
    XCTAssert(...)
}
```

---

## Phase 8 — Remove diagnostic code

```bash
# Remove all debugging additions before final commit
grep -rn "print(" --include="*.swift" . | grep -v "Tests\|// KEEP" | head -10
grep -rn "_printChanges\|assertionFailure.*thread\|deinit.*print" --include="*.swift" . | head -5
```

Remove every `print()`, `_printChanges()`, and diagnostic `assertionFailure` added during investigation.

Commit: `chore([module]): remove investigation diagnostics`

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INVESTIGATION REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROBLEM: [precise statement]

ROOT CAUSE: [technical explanation]

HYPOTHESES TESTED:
  H1: [hypothesis] → [confirmed / ruled out]
  H2: [hypothesis] → [ruled out by: evidence]
  H3: [hypothesis] → [ruled out by: evidence]

FIX: [what was changed] — [commit hash]

REGRESSION TEST: test_regression_[name]() — [file]

WHAT WOULD HAVE PREVENTED THIS:
[Type of test / Architecture pattern / Code review check]

🔓 Freeze removed. Normal editing restored.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
