# /unfreeze

**Role:** Unlock  
**Stage:** Any

Remove the active freeze boundary and return to normal editing mode. Also deactivates careful mode if activated via `/guard`.

Confirm:
```
🔓 Freeze removed. Normal editing mode restored.
    Careful mode: also deactivated.
```

If no freeze was active:
```
No freeze was active. Already in normal mode.
```

The hooks remain registered in the session — run `/freeze [path]` again at any time to set a new boundary.
