# /qa-ios

**Role:** QA Lead — iOS
**Stage:** Test
**Reads:** `git diff main...HEAD`, `.iStack/<app-slug>/artifacts/plans/eng-review-*.md`, existing test suite
**Writes:** fixes committed atomically, `.iStack/<app-slug>/artifacts/qa-reports/[timestamp].md`, `.iStack/<app-slug>/state/review-status.json`, regression tests, history/session logs
**Feeds into:** `/appstore-review`, `/ship-ios`

Build. Test. Find bugs. Fix them. Verify. Generate regression tests. Everything in one pass.

The most common use case: you're on a feature branch, just finished coding, want to verify everything works. Just run `/qa-ios` — it reads the diff, identifies what changed, builds on simulator, runs the test suite, tests critical flows, fixes what it finds, and generates regression tests for every bug.

---

## Phase 0 — Environment detection

```bash
eval "$(bin/istack resolve env)"

# Detect project type
WORKSPACE=$(ls *.xcworkspace 2>/dev/null | head -1)
PROJECT=$(ls *.xcodeproj 2>/dev/null | head -1)
PROJ_ARG=""
[ -n "$WORKSPACE" ] && PROJ_ARG="-workspace $WORKSPACE" || PROJ_ARG="-project $PROJECT"
echo "Project: ${WORKSPACE:-$PROJECT}"

# Get scheme
SCHEME=$(xcodebuild $PROJ_ARG -list 2>/dev/null | grep -A 20 "Schemes:" | grep -v "Schemes:" | head -1 | xargs)
echo "Scheme: $SCHEME"

# Get bundle ID
BUNDLE_ID=$(xcodebuild $PROJ_ARG -scheme "$SCHEME" -showBuildSettings 2>/dev/null | grep "PRODUCT_BUNDLE_IDENTIFIER" | head -1 | awk '{print $3}')
echo "Bundle ID: $BUNDLE_ID"

# Check Fastlane
[ -f "fastlane/Fastfile" ] && echo "Fastlane: ✅" || echo "Fastlane: not configured"

# Read simulator preference from project-local config or use default
SIMULATOR=$(sed -nE 's/^[[:space:]]*"default_simulator"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' "$ISTACK_CONFIG_FILE" 2>/dev/null | head -1)
[ -n "$SIMULATOR" ] || SIMULATOR="iPhone 16"
IOS_VERSION=$(sed -nE 's/^[[:space:]]*"default_ios"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/p' "$ISTACK_CONFIG_FILE" 2>/dev/null | head -1)
[ -n "$IOS_VERSION" ] || IOS_VERSION="latest"
DEST="platform=iOS Simulator,name=$SIMULATOR,OS=$IOS_VERSION"
echo "Target: $DEST"

# Read test plan from eng-review if exists
ls "$ISTACK_PLANS_DIR"/eng-review-*.md >/dev/null 2>&1 && echo "Test plan found — will use for flow coverage"
```

---

## Phase 1 — Diff analysis

```bash
# What changed?
CHANGED_FILES=$(git diff main...HEAD --name-only | grep "\.swift$")
echo "Changed Swift files:"
echo "$CHANGED_FILES"

# Count: is this a small change or a big one?
CHANGED_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
echo "Files changed: $CHANGED_COUNT"
```

Based on the diff, identify:
- Which features/screens were touched
- Which flows need to be tested
- Which tests already exist for this code

---

## Phase 2 — Build

```bash
xcodebuild build \
  $PROJ_ARG \
  -scheme "$SCHEME" \
  -destination "$DEST" \
  -configuration Debug \
  2>&1 | grep -E "^(error:|warning:|Build succeeded|BUILD FAILED)" | head -30
```

**On build failure:** STOP immediately. Report the exact error lines. Do not attempt any further phases. The error must be fixed before QA can proceed.

**On warnings:** note them — don't block. But report them at the end.

---

## Phase 3 — Test suite

```bash
xcodebuild test \
  $PROJ_ARG \
  -scheme "$SCHEME" \
  -destination "$DEST" \
  -configuration Debug \
  -enableCodeCoverage YES \
  -resultBundlePath "$ISTACK_TEST_RESULTS_DIR/test-results.xcresult" \
  2>&1 | grep -E "(Test Case|Test Suite|passed|failed|error:)" | tail -40
```

Parse and report:
- Total tests run
- ✅ Passed / ❌ Failed / ⏭ Skipped
- Any test exceeding 5 seconds (performance concern)
- Coverage % if available

**On test failure:** fix the failing test OR the code (whichever is wrong). Commit fix. Re-run. Repeat until green.

---

## Phase 4 — Simulator launch

```bash
# Find and boot the right simulator
DEVICE_ID=$(xcrun simctl list devices available | grep "$SIMULATOR" | grep -o '[A-F0-9-]\{36\}' | head -1)
echo "Device ID: $DEVICE_ID"

# Boot (idempotent — safe if already booted)
xcrun simctl boot "$DEVICE_ID" 2>/dev/null || true
sleep 2

# Build and install app
xcodebuild build \
  $PROJ_ARG \
  -scheme "$SCHEME" \
  -destination "id=$DEVICE_ID" \
  -configuration Debug \
  CONFIGURATION_BUILD_DIR=/tmp/istack-qa-build \
  2>&1 | tail -5

APP_PATH=$(find /tmp/istack-qa-build -name "*.app" -maxdepth 2 | head -1)
echo "App: $APP_PATH"

xcrun simctl install "$DEVICE_ID" "$APP_PATH"
xcrun simctl launch "$DEVICE_ID" "$BUNDLE_ID"
sleep 3

# Screenshot initial state
xcrun simctl io "$DEVICE_ID" screenshot /tmp/istack-qa-launch.png
echo "📸 Launch screenshot: /tmp/istack-qa-launch.png"
```

---

## Phase 5 — Critical flow testing

Based on the diff and test plan from `/plan-eng-review`, test each critical flow:

For each flow:
1. Describe what's being tested
2. Execute the flow via `xcrun simctl` commands and state changes
3. Take screenshots at key moments
4. Check crash logs after each flow

```bash
# Check for crashes after each flow
xcrun simctl spawn "$DEVICE_ID" log show \
  --predicate "process == \"$(basename $APP_PATH .app)\"" \
  --last 30s \
  2>/dev/null | grep -iE "(fault|error|crash|exception|abort)" | head -10
```

**Standard flows to always test:**
1. First launch / onboarding (if changed)
2. Core daily-driver feature (always)
3. Permission request flow — grant AND deny paths
4. Empty state (delete all data, restart)
5. Offline behavior (enable airplane mode via `xcrun simctl`, test, re-enable)
6. Background → foreground (press Home, wait 5s, re-launch)

```bash
# Simulate network loss
xcrun simctl simctl_network_loss "$DEVICE_ID" enable 2>/dev/null || true
# ... test offline flow ...
xcrun simctl simctl_network_loss "$DEVICE_ID" disable 2>/dev/null || true
```

---

## Phase 6 — Visual checks

```bash
# Dark Mode
xcrun simctl ui "$DEVICE_ID" appearance dark
sleep 1
xcrun simctl io "$DEVICE_ID" screenshot /tmp/istack-qa-dark.png
echo "📸 Dark mode: /tmp/istack-qa-dark.png"

# Light Mode
xcrun simctl ui "$DEVICE_ID" appearance light
sleep 1
xcrun simctl io "$DEVICE_ID" screenshot /tmp/istack-qa-light.png

# Large Text (accessibility)
xcrun simctl ui "$DEVICE_ID" content_size extra-extra-extra-large 2>/dev/null || true
sleep 1
xcrun simctl io "$DEVICE_ID" screenshot /tmp/istack-qa-largetext.png
xcrun simctl ui "$DEVICE_ID" content_size medium 2>/dev/null || true
```

Check screenshots for:
- Dark Mode: no white-on-white, no black-on-black, all icons visible
- Large Text: no truncated text, no overflowing elements, no cut-off labels

---

## Phase 7 — Fix loop

For each bug found:

1. State the bug precisely: screen + action + expected + actual
2. Fix it — minimum change, don't refactor while fixing
3. Commit: `fix(qa): [precise description of what broke]`
4. Rebuild and re-test the specific flow
5. Take a "fixed" screenshot
6. **Write regression test:**

```swift
// Regression test template
func test_regression_[bugDescription]() throws {
    // Context: Found in QA [date], fixed in [commit hash]
    // Scenario: [exact steps that triggered the bug]

    // Arrange
    let sut = [SystemUnderTest]()

    // Act — reproduce the exact scenario

    // Assert — verify the correct behavior
    XCTAssert(...)
}
```

**Stop after 3 consecutive failed fix attempts.** If 3 attempts don't fix it, the root cause is wrong — run `/investigate` instead.

---

## Phase 8 — Final test run

```bash
# Re-run full test suite after all fixes
xcodebuild test \
  $PROJ_ARG \
  -scheme "$SCHEME" \
  -destination "$DEST" \
  -enableCodeCoverage YES \
  -resultBundlePath "$ISTACK_TEST_RESULTS_DIR/test-results-final.xcresult" \
  2>&1 | grep -E "(passed|failed|Test session)" | tail -10
```

---

## Save report

```bash
mkdir -p "$ISTACK_QA_REPORTS_DIR"
REPORT_FILE="$ISTACK_QA_REPORTS_DIR/$(date +%Y%m%d-%H%M%S).md"
cat > "$REPORT_FILE" << 'REPORT'
[full QA report output]
REPORT

bin/istack log \
  --skill qa-ios \
  --summary "Completed QA, updated report artifacts, and refreshed review readiness." \
  --file "$REPORT_FILE" \
  --file "$ISTACK_REVIEW_STATUS_FILE"
```

---

## Output format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QA REPORT — [date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BUILD:     ✅ Succeeded / ❌ Failed
TESTS:     [N passed] / [N failed] / [N skipped]
COVERAGE:  [N%]
NEW TESTS: [N regression tests added]

FLOWS TESTED:
✅ [Flow name]
❌ [Flow name] — [what broke]
⚠️  [Flow name] — [works but needs attention]

BUGS FOUND & FIXED ([N]):
1. [Screen/Flow] — [what broke]
   Fix: [what was changed] — commit [hash]
   Regression test: test_regression_[name]()

BUGS NOT FIXED — needs your decision ([N]):
1. [Description] — [why it needs a product call]

VISUAL:
Dark Mode:   ✅ / ⚠️ [issue]
Large Text:  ✅ / ⚠️ [issue]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready for: /appstore-review → /ship-ios
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
