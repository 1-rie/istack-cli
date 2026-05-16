# /xcode-health

**Role:** Platform Engineer
**Stage:** Any
**Reads:** project files, build output, package manifest
**Writes:** `.iStack/<app-slug>/artifacts/health/health-[timestamp].md`, history/session logs
**Feeds into:** `/review`, `/ship-ios`

Surface technical debt, configuration problems, and slow-burning issues before they become emergencies. Run weekly or before any significant release.

---

## Check 1 — Build warnings

```bash
WORKSPACE=$(ls *.xcworkspace 2>/dev/null | head -1)
PROJECT=$(ls *.xcodeproj 2>/dev/null | head -1)
PROJ_ARG=""
[ -n "$WORKSPACE" ] && PROJ_ARG="-workspace $WORKSPACE" || PROJ_ARG="-project $PROJECT"
SCHEME=$(xcodebuild $PROJ_ARG -list 2>/dev/null | grep -A 20 "Schemes:" | grep -v "Schemes:" | head -1 | xargs)

xcodebuild build \
  $PROJ_ARG \
  -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,name=iPhone 16,OS=latest" \
  2>&1 | grep "warning:" | sort | uniq -c | sort -rn | head -30
```

Categorize:
- **Deprecation warnings** — APIs with removal dates. Fix now.
- **Swift strict concurrency warnings** — will become errors in Swift 6. Fix now.
- **Unused variable warnings** — code quality. Fix now.
- **Module import warnings** — often signals architecture drift.

Goal: **zero warnings**. If >20 warnings: flag as technical debt priority.

---

## Check 2 — Build time

```bash
# Time a clean build
time xcodebuild build \
  $PROJ_ARG \
  -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,name=iPhone 16,OS=latest" \
  2>&1 | tail -3
```

Benchmarks:
- ✅ < 30s: excellent
- ⚠️ 30-90s: acceptable, monitor
- ❌ > 90s: team productivity killer — investigate

Common causes:
```bash
# Large files that slow Swift type checking
find . -name "*.swift" -exec wc -l {} \; | sort -rn | head -10
# Files >500 lines often have complex generics or large switch statements
```

---

## Check 3 — Swift Package dependencies

```bash
# List all resolved packages
cat .build/manifest.db 2>/dev/null || \
cat *.xcworkspace/xcshareddata/swiftpm/Package.resolved 2>/dev/null | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('pins', []):
    state = p.get('state', {})
    ver = state.get('version') or state.get('revision', 'unknown')[:8]
    print(f'{p[\"identity\"]:40} {ver}')
"
```

For each dependency, flag:
- Last updated > 1 year ago (maintenance risk)
- No version pinned (uses branch = unpredictable)
- License incompatible with App Store (GPL, AGPL)
- Dependency that Apple now provides natively

---

## Check 4 — Entitlements vs capabilities

```bash
ENTITLEMENTS=$(find . -name "*.entitlements" | grep -v Pods | head -1)
echo "Entitlements file: $ENTITLEMENTS"
cat "$ENTITLEMENTS" 2>/dev/null

# Check each entitlement is justified
echo ""
echo "Framework usage that requires entitlements:"
grep -rn "import HealthKit\|import CloudKit\|import CoreBluetooth\|import HomeKit\|import StoreKit" --include="*.swift" . | head -10
```

Every entitlement declared must:
1. Be enabled in the App ID on developer.apple.com
2. Have corresponding code that actually uses it
3. Have a `NSUsageDescription` in Info.plist (for user-facing permissions)

---

## Check 5 — Privacy manifest

```bash
PRIVACY_MANIFEST=$(find . -name "PrivacyInfo.xcprivacy" | grep -v Pods | head -1)
if [ -z "$PRIVACY_MANIFEST" ]; then
  echo "❌ PrivacyInfo.xcprivacy MISSING — required since May 2024"
  echo "   Generate one with: /appstore-review"
else
  echo "✅ Found: $PRIVACY_MANIFEST"
  cat "$PRIVACY_MANIFEST"
fi

# Check that UserDefaults is declared (Required Reason API)
grep -rn "UserDefaults" --include="*.swift" . | grep -v "Tests\|standard\." | wc -l | \
  xargs echo "UserDefaults usage count (must be declared in PrivacyInfo.xcprivacy):"
```

---

## Check 6 — Test coverage trend

```bash
# Get current test count
TESTS=$(find . -name "*Tests*.swift" | xargs grep "func test" 2>/dev/null | wc -l | tr -d ' ')
echo "Tests: $TESTS"

# Test-to-source ratio
SWIFT_FILES=$(find . -name "*.swift" | grep -v Tests | grep -v Pods | wc -l | tr -d ' ')
echo "Source files: $SWIFT_FILES"
echo "Ratio: ~$(echo "scale=1; $TESTS / $SWIFT_FILES" | bc) tests per source file"

# Files with zero test coverage (approximation)
echo ""
echo "Source files with no corresponding test file:"
find . -name "*.swift" | grep -v "Tests\|Preview\|Pods\|Generated" | while read f; do
  BASE=$(basename "$f" .swift)
  find . -name "${BASE}Tests.swift" -o -name "${BASE}Test.swift" 2>/dev/null | grep -q . || echo "  $f"
done | head -15
```

---

## Check 7 — Deprecated APIs

```bash
echo "=== Deprecated API usage ==="
# UIWebView (rejected since Dec 2020)
grep -rn "UIWebView" --include="*.swift" . && echo "❌ CRITICAL: UIWebView"

# openURL: (deprecated since iOS 10)
grep -rn "openURL:" --include="*.swift" . | grep -v "canOpenURL" | head -3

# Old SwiftUI navigation
grep -rn "NavigationView\b" --include="*.swift" . | head -5

# Deprecated NotificationCenter usage
grep -rn "UIApplication.willResignActiveNotification\b" --include="*.swift" . | head -3
```

---

## Check 8 — Info.plist hygiene

```bash
PLIST=$(find . -name "Info.plist" | grep -v Pods | head -1)
echo "Checking: $PLIST"

# Debug-only keys in production plist
/usr/libexec/PlistBuddy -c "Print NSAllowsArbitraryLoads" "$PLIST" 2>/dev/null && \
  echo "⚠️  NSAllowsArbitraryLoads is set — justify in App Store notes or remove"

# Check for launch screen
/usr/libexec/PlistBuddy -c "Print UILaunchStoryboardName" "$PLIST" 2>/dev/null || \
  /usr/libexec/PlistBuddy -c "Print UILaunchScreen" "$PLIST" 2>/dev/null || \
  echo "⚠️  No launch screen configured"

# Background modes
/usr/libexec/PlistBuddy -c "Print UIBackgroundModes" "$PLIST" 2>/dev/null
```

---

## Check 9 — Technical debt scan

```bash
# TODOs and FIXMEs
echo "=== Technical debt markers ==="
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.swift" . | \
  grep -v "Tests\|// TODO.*test" | head -20
echo "Total: $(grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.swift" . | wc -l | tr -d ' ')"

# Dead code indicators
grep -rn "// TODO: remove\|// REMOVE\|// DEAD\|// UNUSED" --include="*.swift" . | head -10
```

---

## Health score

Calculate overall health:

- 0 warnings: 25 pts
- 10+ warnings: 0 pts, 1-9: 15 pts
- Build < 30s: 20 pts, 30-90s: 10 pts, >90s: 0 pts
- Privacy manifest present: 15 pts
- Test ratio > 1.0: 20 pts, 0.5-1.0: 10 pts, <0.5: 0 pts
- No deprecated APIs: 20 pts

**Health score: [N]/100**
- 80-100: 🟢 Healthy
- 60-79:  🟡 Needs attention
- <60:    🔴 Technical debt accumulating

---

## Save report

```bash
eval "$(bin/istack resolve env)"
mkdir -p "$ISTACK_HEALTH_DIR"
REPORT_FILE="$ISTACK_HEALTH_DIR/health-$(date +%Y%m%d-%H%M%S).md"
cat > "$REPORT_FILE" << 'REPORT'
[full xcode health output]
REPORT

bin/istack log \
  --skill xcode-health \
  --summary "Captured an Xcode health snapshot for the project." \
  --file "$REPORT_FILE"
```

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
XCODE HEALTH — [Project] [date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BUILD WARNINGS: [N] [✅/⚠️/❌]
  Top categories: [list]

BUILD TIME: [N]s [✅/⚠️/❌]
  Slowest file: [name, lines]

DEPENDENCIES: [N packages]
  Concerns: [list or "none"]

ENTITLEMENTS: ✅ Aligned / ⚠️ [mismatch]
PRIVACY MANIFEST: ✅ Present / ❌ Missing
DEPRECATED APIs: ✅ None / ❌ [list]

TEST COVERAGE:
  [N] tests / [N] source files = [ratio]
  Files with no tests: [N]

TECH DEBT: [N] TODO/FIXME markers

HEALTH SCORE: [N]/100 [🟢/🟡/🔴]

PRIORITY ACTIONS:
  1. [Most impactful fix]
  2. [Second]
  3. [Third]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
