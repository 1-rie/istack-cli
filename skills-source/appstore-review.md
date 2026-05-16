# /appstore-review

**Role:** App Store Specialist
**Stage:** Pre-ship
**Reads:** `Info.plist`, `*.entitlements`, `PrivacyInfo.xcprivacy`, `*.swift` source, `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/docs/PRODUCT.md`
**Writes:** `.iStack/<app-slug>/artifacts/appstore-reviews/appstore-review-[timestamp].md`, `.iStack/<app-slug>/state/review-status.json`, updates `.iStack/<app-slug>/manifest.json` if submission-relevant facts become clearer, history/session logs
**Feeds into:** `/ship-ios`

A rejection costs 24-48 hours minimum. This skill catches every rejection reason before Apple does.

This is not documentation-checking. It is a systematic audit of every known rejection category, run on your actual code.

---

## Phase 1 — Privacy & Permissions (most common rejection cause)

### NSUsageDescription completeness

```bash
# Find all permission-related framework usage
PLIST=$(find . -name "Info.plist" | grep -v Pods | head -1)
echo "Checking: $PLIST"

# Check which frameworks are imported
grep -rn "^import " --include="*.swift" . | grep -E "HealthKit|CoreLocation|AVFoundation|Photos|Contacts|EventKit|CoreMotion|CoreBluetooth|Speech|ARKit|HomeKit|StoreKit|UserNotifications|AppTrackingTransparency|LocalAuthentication" | sort -u
```

For every framework found, verify the corresponding key exists in Info.plist:

| Framework | Required Keys |
|-----------|--------------|
| `AVFoundation` (camera) | `NSCameraUsageDescription` |
| `AVFoundation` (mic) | `NSMicrophoneUsageDescription` |
| `Photos` (read) | `NSPhotoLibraryUsageDescription` |
| `Photos` (write) | `NSPhotoLibraryAddUsageDescription` |
| `CoreLocation` (when in use) | `NSLocationWhenInUseUsageDescription` |
| `CoreLocation` (always) | `NSLocationAlwaysAndWhenInUseUsageDescription` |
| `Contacts` | `NSContactsUsageDescription` |
| `EventKit` (calendar) | `NSCalendarsUsageDescription` |
| `EventKit` (reminders) | `NSRemindersUsageDescription` |
| `HealthKit` (read) | `NSHealthShareUsageDescription` |
| `HealthKit` (write) | `NSHealthUpdateUsageDescription` |
| `CoreMotion` | `NSMotionUsageDescription` |
| `CoreBluetooth` | `NSBluetoothAlwaysUsageDescription` |
| `Speech` | `NSSpeechRecognitionUsageDescription` |
| `LocalAuthentication` (Face ID) | `NSFaceIDUsageDescription` |
| `AppTrackingTransparency` | `NSUserTrackingUsageDescription` |
| `HomeKit` | `NSHomeKitUsageDescription` |
| `Siri/SiriKit` | `NSSiriUsageDescription` |
| Network (local) | `NSLocalNetworkUsageDescription` |

```bash
# Check each key exists and is not empty
for KEY in NSCameraUsageDescription NSMicrophoneUsageDescription NSPhotoLibraryUsageDescription NSLocationWhenInUseUsageDescription NSHealthShareUsageDescription NSHealthUpdateUsageDescription; do
  VAL=$(/usr/libexec/PlistBuddy -c "Print $KEY" "$PLIST" 2>/dev/null)
  if [ -z "$VAL" ]; then
    echo "❌ Missing: $KEY"
  else
    echo "✅ $KEY: $VAL"
  fi
done
```

**Quality check on descriptions:** each must explain WHY the app needs it from the user's perspective. "This app needs camera access" is rejected. "Take photos to document your daily habits" is approved.

### Privacy Manifest (PrivacyInfo.xcprivacy)

```bash
PRIVACY_MANIFEST=$(find . -name "PrivacyInfo.xcprivacy" | grep -v Pods | head -1)
if [ -z "$PRIVACY_MANIFEST" ]; then
  echo "❌ PrivacyInfo.xcprivacy MISSING — required since May 2024"
else
  echo "✅ Found: $PRIVACY_MANIFEST"
  cat "$PRIVACY_MANIFEST"
fi
```

Required Reason APIs — if used, must be declared in PrivacyInfo.xcprivacy:
```bash
# Check for Required Reason APIs
grep -rn "UserDefaults\|fileModificationDate\|systemUptime\|diskSpace\|activeKeyboard\|UIDevice.current.identifierForVendor" --include="*.swift" . | grep -v "// PRIVACY:" | head -20
```

### Privacy Nutrition Label

Check declared data types match actual usage:
- Name, Email, Phone → if collected for accounts
- Location → if CoreLocation used
- Health/Fitness → if HealthKit used
- Identifiers (Device ID) → if IDFA or `identifierForVendor` used
- Usage Data → if analytics SDK used

```bash
# Check for analytics SDKs
grep -rn "import Firebase\|import Amplitude\|import Mixpanel\|import Segment\|import Crashlytics" --include="*.swift" . | head -10
# Each SDK may collect data you haven't declared
```

---

## Phase 2 — App Store Review Guidelines

### 2.1 — App Completeness
```bash
# Check for placeholder content
grep -rn "TODO\|FIXME\|Lorem ipsum\|placeholder\|coming soon" --include="*.swift" . | grep -iv "// TODO.*test" | head -10

# Check for commented-out features marked "coming soon"
grep -rn "coming soon\|not yet implemented\|work in progress" --include="*.swift" . -i | head -10
```

- [ ] App does not crash on first launch (verify with clean simulator install)
- [ ] Demo/test accounts provided in App Store Connect metadata if login required
- [ ] All advertised features functional — compare feature list in metadata to actual build

### 2.2 — Minimum Functionality
```bash
# Check for WKWebView as primary content (guideline 4.2)
grep -rn "WKWebView\|WKNavigationDelegate" --include="*.swift" . | head -5
# If primary content is a WKWebView loading a website → likely rejection
```

### 3.1 — Payments
```bash
# Check for non-IAP payment methods used for digital goods
grep -rn "import Stripe\|import Braintree\|PaymentSheet\|checkout\|payment" --include="*.swift" . -i | grep -v "// physical" | head -10
```

- [ ] Digital goods/subscriptions sold via Apple IAP only
- [ ] No "buy on our website for cheaper" messaging
- [ ] Physical goods/services may use external payment — verify this is the case if non-IAP found

```bash
# Check StoreKit usage if IAP is expected
grep -rn "import StoreKit\|SKProductsRequest\|Product.products" --include="*.swift" . | head -5
```

### 4.0 — Design
```bash
# Check for iPhone SE compatibility (smallest current screen: 375pt wide)
grep -rn "\.frame(width: [4-9][0-9][0-9]\|\.frame(minWidth: [4-9][0-9][0-9]" --include="*.swift" . | head -10
# Fixed widths >375 will overflow on SE
```

- [ ] No broken layout at 375pt width (iPhone SE)
- [ ] Launch screen is distinct from app UI (confusing if identical)
- [ ] Custom components don't poorly mimic native ones

### 5.1 — Privacy Policy
```bash
# Check App Store Connect metadata file if exists
[ -f "fastlane/metadata/en-US/privacy_url.txt" ] && cat "fastlane/metadata/en-US/privacy_url.txt" || echo "Privacy URL: check App Store Connect manually"
```

- [ ] Privacy Policy URL set in App Store Connect and live
- [ ] Terms of Service present if collecting user accounts or data
- [ ] Age Rating correctly set for content

### Sign in with Apple
```bash
# If offering third-party social login, Sign in with Apple is required
grep -rn "import GoogleSignIn\|import FBSDKLoginKit\|import TwitterKit\|GIDSignIn\|LoginButton" --include="*.swift" . | head -5
# If found: verify AuthenticationServices / Sign in with Apple is also present
grep -rn "import AuthenticationServices\|ASAuthorizationAppleIDProvider" --include="*.swift" . | head -5
```

---

## Phase 3 — Technical Compliance

### Deprecated APIs
```bash
# Critical deprecated APIs
grep -rn "UIWebView" --include="*.swift" . && echo "❌ UIWebView: REJECTED since Dec 2020"
grep -rn "openURL:" --include="*.swift" . | grep -v "canOpenURL" && echo "⚠️  openURL: deprecated, use open(_:options:)"
grep -rn "kCLAuthorizationStatusAuthorized[^W]" --include="*.swift" . && echo "⚠️  Old location auth constant"
```

### Background Modes
```bash
/usr/libexec/PlistBuddy -c "Print UIBackgroundModes" "$PLIST" 2>/dev/null
# Each declared mode must be actively used
# Declaring unused modes = rejection
```

Validate each declared mode has corresponding code:
- `fetch` → `URLSession` background tasks
- `remote-notification` → push notification handling
- `audio` → AVAudioSession continuous playback
- `location` → significant location or heading updates
- `bluetooth-central`/`peripheral` → CoreBluetooth background

### App Transport Security
```bash
/usr/libexec/PlistBuddy -c "Print NSAppTransportSecurity:NSAllowsArbitraryLoads" "$PLIST" 2>/dev/null
# If true: must justify in App Store Connect review notes
# Goal: remove and use HTTPS everywhere
```

### URL Schemes
```bash
/usr/libexec/PlistBuddy -c "Print CFBundleURLTypes" "$PLIST" 2>/dev/null
# Custom URL schemes declared must be handled in code
grep -rn "application.*open.*url\|scene.*open.*url" --include="*.swift" . | head -5
```

---

## Phase 4 — App Store Connect Metadata Checklist

```bash
# Check Fastlane metadata if configured
if [ -d "fastlane/metadata" ]; then
  echo "App name length: $(cat fastlane/metadata/en-US/name.txt 2>/dev/null | wc -c) chars (max 30)"
  echo "Subtitle length: $(cat fastlane/metadata/en-US/subtitle.txt 2>/dev/null | wc -c) chars (max 30)"
  echo "Keywords length: $(cat fastlane/metadata/en-US/keywords.txt 2>/dev/null | wc -c) chars (max 100)"
fi
```

Manual checks (flag for human review):
- [ ] App name ≤ 30 chars
- [ ] Subtitle ≤ 30 chars
- [ ] Keywords ≤ 100 chars, no competitor names, no category names (Apple rejects these)
- [ ] Description: no mention of Android/other platforms, no pricing promises
- [ ] Screenshots: required sizes covered
  - iPhone 6.9" (iPhone 16 Pro Max) — **required**
  - iPhone 6.5" (iPhone 15 Plus) — **required**
  - iPad Pro 13" — required if iPad supported
- [ ] No iOS UI chrome in screenshots if using device frames

---

## Phase 5 — Non-obvious rejection patterns

Check these less-obvious rejection patterns:

```bash
# Affiliate links for App Store apps in app content (guideline 3.2.1)
grep -rn "apple.com/app\|apps.apple.com\|phobos.apple.com" --include="*.swift" . | grep -i "affiliate\|at=" | head -5

# Downloading code at runtime (guideline 2.5.2)
grep -rn "dlopen\|NSBundle.*load\|JSContext\|JavaScriptCore" --include="*.swift" . | head -5

# Duplicate app detection — does this exact feature set already exist in your submissions?
```

- [ ] If app targets kids (<13): COPPA compliance, no behavioral advertising, no external links
- [ ] If using AR: clear indicator shown when camera is active
- [ ] If using Bluetooth: legitimate use case, not for tracking
- [ ] If streaming content: appropriate age rating

---

## Save report

```bash
eval "$(bin/istack resolve env)"
mkdir -p "$ISTACK_APPSTORE_REVIEWS_DIR"
REPORT_FILE="$ISTACK_APPSTORE_REVIEWS_DIR/appstore-review-$(date +%Y%m%d-%H%M%S).md"
cat > "$REPORT_FILE" << 'REPORT'
[full app store review output]
REPORT

bin/istack log \
  --skill appstore-review \
  --summary "Audited App Store rejection risk and refreshed the release gate." \
  --file "$REPORT_FILE" \
  --file "$ISTACK_REVIEW_STATUS_FILE"
```

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APP STORE REVIEW — [App Name] v[version]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRIVACY KEYS:      ✅ All present / ❌ Missing: [list]
PRIVACY MANIFEST:  ✅ Present & complete / ❌ Missing / ⚠️ Incomplete
NUTRITION LABEL:   ✅ Matches app / ⚠️ Review: [what to check]
PAYMENTS:          ✅ IAP only / ⚠️ [concern]
DEPRECATED APIs:   ✅ None / ❌ [list]
BACKGROUND MODES:  ✅ Justified / ⚠️ [unjustified mode]
METADATA:          ✅ Complete / ❌ Missing: [list]
SIGN IN W/ APPLE:  ✅ Present / ❌ Required but missing / N/A

REJECTION RISK: 🟢 LOW · 🟡 MEDIUM · 🔴 HIGH

REQUIRED FIXES (will cause rejection):
1. [Issue] — [file:line or "App Store Connect"]

RECOMMENDED FIXES (best practice):
1. [Issue]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready for: /ship-ios
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
