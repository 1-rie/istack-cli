# /benchmark-ios

**Role:** Performance Engineer — iOS
**Stage:** Review / Ship
**Reads:** build output, Instruments traces, XCTest performance results
**Writes:** `.iStack/<app-slug>/artifacts/benchmarks/[timestamp].json`, baseline comparisons, history/session logs
**Feeds into:** `/ship-ios`, performance tracking over time

Measure before and after every PR that touches performance-sensitive code. What you don't measure, you don't control.

---

## Phase 1 — App Launch Time

```bash
# Launch time measurement via XCTest
# Add to test target if not present:
cat > /tmp/LaunchTimeTests.swift << 'SWIFT'
import XCTest

final class LaunchTimeTests: XCTestCase {
    func testLaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            XCUIApplication().launch()
        }
    }
}
SWIFT
echo "Launch time test template ready"
```

Run:
```bash
xcodebuild test \
  $PROJ_ARG \
  -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,name=iPhone 16,OS=latest" \
  -only-testing:LaunchTimeTests \
  2>&1 | grep -E "(average|stddev|ms)" | head -10
```

**Benchmarks:**
- ✅ < 400ms: excellent
- ⚠️ 400-800ms: acceptable, investigate
- ❌ > 800ms: user-visible slow launch, must fix

**Common causes of slow launch:**
- Heavy `AppDelegate.application(_:didFinishLaunchingWithOptions:)` — defer work
- CoreData stack initialization on main thread — use background context
- Large asset decoding at launch — lazy load
- Synchronous network calls at launch (never)

---

## Phase 2 — Memory Footprint

```bash
# Memory measurement via XCTest
cat > /tmp/MemoryTests.swift << 'SWIFT'
import XCTest

final class MemoryTests: XCTestCase {
    func testMemoryOnLaunch() {
        measure(metrics: [XCTMemoryMetric()]) {
            let app = XCUIApplication()
            app.launch()
            // Navigate to main screen
            sleep(2)
        }
    }
}
SWIFT
```

**Benchmarks:**
- ✅ < 50MB baseline: lean
- ⚠️ 50-100MB: acceptable for feature-rich apps
- ❌ > 100MB at launch: investigate before iOS kills it in background

---

## Phase 3 — Scrolling Performance

For any screen with a list or scroll view:

```bash
# XCTest scrolling performance
cat > /tmp/ScrollPerformanceTests.swift << 'SWIFT'
import XCTest

final class ScrollPerformanceTests: XCTestCase {
    func testScrollPerformance() {
        let app = XCUIApplication()
        app.launch()

        measure(metrics: [XCTOSSignpostMetric.scrollDecelerationMetric]) {
            // Navigate to list view
            // Scroll
            app.swipeUp()
            app.swipeUp()
            app.swipeDown()
        }
    }
}
SWIFT
```

**Benchmark:** 60fps target. Any frame drop below 55fps is detectable to users.

---

## Phase 4 — Binary Size Analysis

```bash
# Get IPA size breakdown
if [ -f "./build/App.ipa" ]; then
  # Total IPA size
  IPA_SIZE=$(ls -lh ./build/App.ipa | awk '{print $5}')
  echo "IPA total: $IPA_SIZE"

  # Unzip and analyze
  unzip -o ./build/App.ipa -d /tmp/istack-ipa-analysis >/dev/null 2>&1

  # Find large assets
  find /tmp/istack-ipa-analysis -name "*.png" -o -name "*.jpg" | \
    xargs ls -la 2>/dev/null | sort -k5 -rn | head -10

  # Framework sizes
  find /tmp/istack-ipa-analysis -name "*.framework" -o -name "*.dylib" | \
    xargs du -sh 2>/dev/null | sort -rh | head -10
fi
```

**Benchmarks:**
- Download size: target < 50MB (cellular download limit was 200MB but smaller = better conversion)
- Large images: any PNG > 500KB should be JPG or WebP
- Embedded frameworks: each adds to size — justify

---

## Phase 5 — XCTest Performance Regression

```bash
# Run any existing performance tests and compare to baseline
xcodebuild test \
  $PROJ_ARG \
  -scheme "$SCHEME" \
  -destination "platform=iOS Simulator,name=iPhone 16,OS=latest" \
  -only-testing:"*PerformanceTests" \
  2>&1 | grep -E "(average|stddev|exceeded|passed|failed)" | head -20
```

---

## Phase 6 — Save baseline

```bash
eval "$(bin/istack resolve env)"
mkdir -p "$ISTACK_BENCHMARKS_DIR"
cat > "$ISTACK_BENCHMARKS_DIR/$(date +%Y%m%d-%H%M%S).json" << JSON
{
  "version": "$(agvtool what-marketing-version 2>/dev/null | grep -o '[0-9.]*' | head -1)",
  "build": "$(agvtool what-version 2>/dev/null | head -1)",
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git": "$(git rev-parse --short HEAD)",
  "launch_ms": "[measured value]",
  "memory_mb": "[measured value]",
  "ipa_mb": "[measured value]"
}
JSON
```

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BENCHMARK — v[VERSION] vs previous
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LAUNCH TIME:   [N]ms [vs previous: +/-Nms] [✅/⚠️/❌]
MEMORY:        [N]MB [vs previous: +/-NMB] [✅/⚠️/❌]
IPA SIZE:      [N]MB [vs previous: +/-NMB] [✅/⚠️/❌]
SCROLL (60fps target): [✅ smooth / ⚠️ drops detected]

REGRESSIONS: [none / list]
IMPROVEMENTS: [none / list]

Baseline saved to $ISTACK_BENCHMARKS_DIR/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
