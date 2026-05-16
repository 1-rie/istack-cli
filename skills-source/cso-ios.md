# /cso-ios

**Role:** Chief Security Officer — Mobile
**Stage:** Review / Pre-ship
**Reads:** full Swift source, `Info.plist`, `*.entitlements`, network layer, data storage
**Writes:** `.iStack/<app-slug>/artifacts/security-audits/security-audit-[timestamp].md`, history/session logs
**Feeds into:** `/ship-ios`

OWASP Mobile Top 10 audit for iOS. Zero noise: only findings with concrete exploit scenarios and ≥8/10 confidence. Every finding includes exactly how to exploit it.

---

## OWASP Mobile Top 10 — iOS Edition

### M1 — Improper Credential Usage

```bash
# Hardcoded credentials
grep -rn "api[_-]key\|apikey\|secret\|password\|token\|bearer" --include="*.swift" . -i | \
  grep -v "// SAFE:\|UserDefaults\|Keychain\|@State\|parameter\|//.*=" | \
  grep '"[A-Za-z0-9_\-]\{10,\}"' | head -20

# Credentials in plist
grep -rn "APIKey\|Secret\|Password\|Token" --include="*.plist" . | head -10
```

**Exploit scenario:** Static analysis of binary extracts hardcoded API key. Attacker uses key to access backend.

### M2 — Inadequate Supply Chain Security

```bash
# Third-party packages with recent security advisories
cat Package.resolved 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('pins', []):
    print(f\"{p['identity']} @ {p['state'].get('version', p['state'].get('revision', 'unknown')[:8])}\")
" 2>/dev/null || echo "No Package.resolved found"
```

**Check:** any dependencies that are abandonware (last commit >2 years)?

### M3 — Insecure Authentication

```bash
# Biometric auth bypass patterns
grep -rn "LAContext\|localAuthentication\|evaluatePolicy" --include="*.swift" . | head -10

# Check if biometric auth result is properly validated
grep -A5 "evaluatePolicy" --include="*.swift" -rn . | grep -E "success|error|reply" | head -10

# JWT token validation
grep -rn "JWT\|jsonwebtoken\|decode.*token" --include="*.swift" . -i | head -10
```

**Red flag:** `evaluatePolicy` result not checked, or fallback to password bypasses biometric intent.

### M4 — Insufficient Input/Output Validation

```bash
# SQL injection risk (FMDB, SQLite.swift, raw SQL)
grep -rn "executeQuery\|execute.*SELECT\|rawQuery" --include="*.swift" . | \
  grep -v "?" | head -10  # Unparameterized queries

# URL injection
grep -rn "URL(string:.*\\\(.*\)\|URLComponents.*queryItems" --include="*.swift" . | head -10

# XSS in WKWebView
grep -rn "evaluateJavaScript\|loadHTMLString" --include="*.swift" . | head -10
```

### M5 — Insecure Communication

```bash
# HTTP (non-TLS) usage
grep -rn '"http://' --include="*.swift" . | grep -v "localhost\|127\.0\.0\.1\|// SAFE" | head -10

# Certificate pinning check
grep -rn "pinnedCertificate\|serverTrustPolicy\|URLAuthenticationChallenge\|didReceive challenge" --include="*.swift" . | head -5

# App Transport Security
/usr/libexec/PlistBuddy -c "Print NSAppTransportSecurity" */Info.plist 2>/dev/null
```

**High risk:** `NSAllowsArbitraryLoads = YES` without domain exceptions = all traffic unencrypted.

### M6 — Inadequate Privacy Controls

```bash
# Sensitive data in logs
grep -rn "print.*email\|print.*phone\|print.*password\|print.*token\|NSLog.*user\|os_log.*private" --include="*.swift" . | head -10

# Sensitive data in pasteboard
grep -rn "UIPasteboard\|\.general\.string" --include="*.swift" . | head -5

# Analytics collecting PII
grep -rn "Analytics\.\|Mixpanel\.\|Amplitude\." --include="*.swift" . | grep -i "email\|phone\|name\|user_id" | head -10
```

### M7 — Insufficient Binary Protections

```bash
# Check if app is compiled with protections
# (Requires built binary — check if available)
if [ -d "./build" ]; then
  APP_PATH=$(find ./build -name "*.app" -maxdepth 3 | head -1)
  BINARY="$APP_PATH/$(basename $APP_PATH .app)"
  if [ -f "$BINARY" ]; then
    # Check PIE (Position Independent Executable)
    otool -hv "$BINARY" | grep PIE || echo "⚠️  PIE not enabled"
    # Check stack canary
    otool -Iv "$BINARY" | grep stack_chk || echo "⚠️  Stack canary not found"
    # Check ARC
    otool -Iv "$BINARY" | grep _objc_retain | head -1 || echo "⚠️  ARC not confirmed"
  fi
fi
```

### M8 — Security Misconfiguration

```bash
# Entitlements audit
ENTITLEMENTS=$(find . -name "*.entitlements" | grep -v Pods | head -1)
[ -f "$ENTITLEMENTS" ] && cat "$ENTITLEMENTS" || echo "No entitlements file found"

# Check for overly broad entitlements
grep -E "com\.apple\.security\.network\.server|com\.apple\.security\.files\.all" "$ENTITLEMENTS" 2>/dev/null | head -5

# Keychain sharing
grep "keychain-access-groups" "$ENTITLEMENTS" 2>/dev/null | head -3

# iCloud container access
grep "com.apple.developer.icloud" "$ENTITLEMENTS" 2>/dev/null | head -3
```

### M9 — Insecure Data Storage

```bash
# Keychain vs UserDefaults for sensitive data
grep -rn "UserDefaults.*set.*\(.*password\|.*token\|.*secret\|.*key\)" --include="*.swift" . -i | head -10

# File protection levels
grep -rn "NSDataWritingAtomic\|write(to:" --include="*.swift" . | grep -v "completeFileProtection\|completeFileProtectionUnlessOpen" | head -10

# CoreData encryption
grep -rn "NSPersistentStoreDescription\|NSPersistentStore" --include="*.swift" . | grep -v "protection\|encrypt" | head -5

# Caching sensitive responses
grep -rn "URLCache\|NSURLCache\|cachedResponse" --include="*.swift" . | head -5
```

**High risk:** Auth tokens in UserDefaults are readable by other apps on jailbroken devices. Use Keychain.

### M10 — Insufficient Cryptography

```bash
# Weak crypto algorithms
grep -rn "MD5\|SHA1\|kCCAlgorithmDES\|ECB\|RC4\|kSecAttrAccessibleAlways" --include="*.swift" . -i | grep -v "// SAFE:\|SHA1.*verification\|legacy" | head -10

# Hardcoded encryption keys/IVs
grep -rn "let.*key.*=.*\[.*0x\|let.*iv.*=.*\[.*0x\|AES.*init.*key.*\"" --include="*.swift" . | head -10

# Proper Keychain attributes
grep -rn "kSecAttrAccessible" --include="*.swift" . | head -5
# kSecAttrAccessibleAlways = insecure
# kSecAttrAccessibleWhenUnlocked = correct for most cases
```

---

## Confidence gate

Only report findings with ≥8/10 confidence. For each finding:
1. State the finding precisely
2. Write the exploit scenario (how would an attacker use this?)
3. State confidence: /10
4. Propose the fix

Exclude:
- Theoretical risks with no viable exploit path
- Issues already mitigated by iOS sandbox
- Warnings that are false positives for this app's use case

---

## Save report

```bash
eval "$(bin/istack resolve env)"
mkdir -p "$ISTACK_SECURITY_AUDITS_DIR"
REPORT_FILE="$ISTACK_SECURITY_AUDITS_DIR/security-audit-$(date +%Y%m%d-%H%M%S).md"
cat > "$REPORT_FILE" << 'REPORT'
[full security audit output]
REPORT

bin/istack log \
  --skill cso-ios \
  --summary "Recorded a security audit of the current mobile codebase." \
  --file "$REPORT_FILE"
```

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECURITY AUDIT — [App Name]
OWASP Mobile Top 10 · iOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL ([N]):
1. [M-category] [File:Line]
   Finding: [precise description]
   Exploit: [how an attacker would use this]
   Fix: [concrete code change]
   Confidence: [N]/10

HIGH ([N]):
...

MEDIUM ([N]):
...

PASSED WITH NO FINDING:
· M[N]: [category] — no issues found
· ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VERDICT: 🟢 SECURE / 🟡 REVIEW / 🔴 DO NOT SHIP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
