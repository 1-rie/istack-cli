# /ship-ios

**Role:** Release Engineer — iOS
**Stage:** Ship
**Reads:** test results, Review Readiness Dashboard, `.iStack/<app-slug>/state/review-status.json`
**Writes:** version tags, CHANGELOG.md, TestFlight build
**Feeds into:** `/document-release`, monitoring

One command from "approved" to "on TestFlight."

---

## Phase 0 — Review gate

```bash
eval "$(bin/istack resolve env)"

# Check review status
cat "$ISTACK_REVIEW_STATUS_FILE" 2>/dev/null || echo "No review status found"
```

Print the Review Readiness Dashboard:

```
╔════════════════════════════════════════════════════════════╗
║                REVIEW READINESS DASHBOARD                  ║
╠═══════════════════╦══════╦═══════════════════╦════════════╣
║ Review            ║ Runs ║ Last Run          ║ Status     ║
╠═══════════════════╬══════╬═══════════════════╬════════════╣
║ Eng Review        ║  [N] ║ [timestamp]       ║ [status]   ║
║ QA iOS            ║  [N] ║ [timestamp]       ║ [status]   ║
║ App Store Review  ║  [N] ║ [timestamp]       ║ [status]   ║
╠═══════════════════╩══════╩═══════════════════╩════════════╣
║ VERDICT: [CLEARED / MISSING REQUIRED REVIEW]              ║
╚════════════════════════════════════════════════════════════╝
```

If `/qa-ios` hasn't been run this branch: ask "QA hasn't been run on this branch. Ship anyway? (yes/no)"
If user says yes: proceed and note in commit message.
If user says no: stop, suggest running `/qa-ios`.

---

## Phase 1 — Pre-flight

```bash
# Clean git status
git status --porcelain
# If dirty: stop and report uncommitted changes

# Sync with main
git fetch origin
git log HEAD..origin/main --oneline
# If behind: warn user

# Detect project
WORKSPACE=$(ls *.xcworkspace 2>/dev/null | head -1)
PROJECT=$(ls *.xcodeproj 2>/dev/null | head -1)
PROJ_ARG=""
[ -n "$WORKSPACE" ] && PROJ_ARG="-workspace $WORKSPACE" || PROJ_ARG="-project $PROJECT"
SCHEME=$(xcodebuild $PROJ_ARG -list 2>/dev/null | grep -A 20 "Schemes:" | grep -v "Schemes:" | head -1 | xargs)
DEST="platform=iOS Simulator,name=iPhone 16,OS=latest"
```

```bash
# Final test run
xcodebuild test \
  $PROJ_ARG \
  -scheme "$SCHEME" \
  -destination "$DEST" \
  -configuration Release \
  2>&1 | grep -E "(passed|failed|error:)" | tail -5
```

**On test failure: STOP.** Do not proceed. Report failures. Fix them or explicitly override.

---

## Phase 2 — Version bump

```bash
# Read current version
CURRENT_VERSION=$(agvtool what-marketing-version 2>/dev/null | grep -o '[0-9]*\.[0-9]*\.[0-9]*' | head -1)
CURRENT_BUILD=$(agvtool what-version 2>/dev/null | grep -o '^[0-9]*' | head -1)
echo "Current: v$CURRENT_VERSION (build $CURRENT_BUILD)"
```

Ask: "Current version is **$CURRENT_VERSION** (build $CURRENT_BUILD). New version?"
Present options:
- Patch: `$MAJOR.$MINOR.$(($PATCH+1))` — bug fixes
- Minor: `$MAJOR.$(($MINOR+1)).0` — new features
- Major: `$(($MAJOR+1)).0.0` — breaking/significant change
- Build only: same version, build +1 — internal/TestFlight update

Wait for answer. Apply:

```bash
agvtool new-marketing-version $NEW_VERSION
agvtool next-version -all

echo "New version: $(agvtool what-marketing-version 2>/dev/null | grep -o '[0-9]*\.[0-9]*\.[0-9]*')"
echo "New build: $(agvtool what-version 2>/dev/null)"

git add -A
git commit -m "chore(release): bump version to $NEW_VERSION (build $NEW_BUILD)"
```

---

## Phase 3 — CHANGELOG update

```bash
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -n "$LAST_TAG" ]; then
  git log $LAST_TAG..HEAD --oneline
else
  git log --oneline -20
fi
```

Update `CHANGELOG.md`:
```markdown
## v[VERSION] — [YYYY-MM-DD]

### Added
- [features from feat: commits]

### Fixed
- [fixes from fix: commits]

### Changed
- [changes from refactor:/chore: commits relevant to users]
```

```bash
git add CHANGELOG.md
git commit -m "docs(release): update CHANGELOG for v$NEW_VERSION"
```

---

## Phase 4 — Archive

**Fastlane only.** xcodebuild direct for App Store distribution is a maintenance trap — code signing alone makes it fragile across machines and CI. If Fastlane isn't configured: stop here and run `/setup-ios-deploy` first. It takes 10 minutes once and saves hours every release.

```bash
# Verify Fastlane is ready
if [ ! -f "fastlane/Fastfile" ]; then
  echo "❌ Fastlane not configured."
  echo "   Run /setup-ios-deploy first."
  exit 1
fi

[ ! -f "Gemfile" ] && echo "❌ Gemfile missing — run /setup-ios-deploy" && exit 1

# Ensure certificates are current
bundle exec fastlane match appstore --readonly 2>/dev/null || {
  echo "⚠️  Certificates need sync..."
  bundle exec fastlane match appstore
}

# Build
bundle exec fastlane gym \
  --scheme "$SCHEME" \
  --configuration Release \
  --export_method app-store \
  --output_directory ./build \
  --output_name "App.ipa" \
  --clean \
  --xcargs "ENABLE_BITCODE=NO"
```

**On archive failure — causes and fixes:**
- Certificate mismatch → `bundle exec fastlane match appstore` (re-sync)
- Entitlement not enabled in App ID → developer.apple.com → Certificates, IDs & Profiles
- Release-only Swift error → check `#if DEBUG` guards and `SWIFT_OPTIMIZATION_LEVEL`
- Profile expired → `bundle exec fastlane match appstore --force`

---

## Phase 5 — Upload to TestFlight

```bash
bundle exec fastlane pilot upload \
  --ipa "./build/App.ipa" \
  --skip_waiting_for_build_processing \
  --changelog "$(git log --oneline -5 | awk '{$1=""; print $0}' | head -5 | tr '\n' '; ')"
```

---

## Phase 6 — Tag and push

```bash
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION

$(git log $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD --oneline | head -10)"

git push origin $(git branch --show-current) --tags
```

---

## Phase 7 — Run /document-release

```bash
echo "Running /document-release..."
# Load and execute document-release/SKILL.md
```

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SHIP REPORT — v[VERSION] (build [N])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TESTS:    ✅ [N] passed / ❌ [N] failed
ARCHIVE:  ✅ Succeeded / ❌ Failed: [error]
UPLOAD:   ✅ Uploaded to TestFlight / ❌ Failed
TAG:      v[VERSION] pushed

TestFlight availability:
  Internal testers: ~5-15 minutes (processing)
  External testers: ~24 hours (Beta App Review for new builds)

Next: Monitor crashes in Xcode Organizer once testers install.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
