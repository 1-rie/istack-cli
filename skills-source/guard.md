# /guard

**Role:** Full Safety Mode  
**Stage:** Any  
**Activation:** `/guard [optional path]`

Activates both `/careful` (destructive command warnings) and `/freeze` (edit lock) simultaneously. Maximum safety for production work, sensitive data, or any session where mistakes are expensive.

Use when:
- Touching production code that affects live users
- Debugging near sensitive data (auth, payments, health data)
- Making changes you're not fully confident about
- Working with App Store Connect credentials or signing certificates

---

## Activation

```
/guard                    → careful mode only (no directory restriction)
/guard Sources/Features/  → careful + freeze on Sources/Features/
```

Show at the start of each response while guard is active:
```
🛡️  GUARD ACTIVE
   Careful: ✅ (destructive command warnings on)
   Freeze:  ✅ [path] / ❌ (not set)
```

---

## Deactivation

`/unfreeze` removes the freeze boundary and deactivates both careful and guard mode.

Confirm:
```
🔓 Guard deactivated. Normal mode restored.
```
