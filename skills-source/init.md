# /init

**Alias of:** `/init-app`  
**Role:** Project Bootstrapper  
**Stage:** Think → Plan  
**Reads:** current project root, optional imported iStack pack, existing `CLAUDE.md`  
**Writes:** `.iStack/<app-slug>/manifest.json`, local knowledge pack structure, project-local `CLAUDE.md` block  
**Feeds into:** `/office-hours`, `/autoplan`, every other iStack skill

Use `/init` as the default entrypoint when attaching iStack to a repo or starting a new app. It runs the same bootstrap flow as `/init-app`, including the terminal splash, local pack creation, optional import, and repo-local `CLAUDE.md` update.

Start the interaction with this exact welcome block before asking any questions:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            .-=========-.
          .'   .----.    '.
         /    / .--. \     \
        |     | |  | |      |
        |      \ '--' /     |
        |        |  |       |
        |        |  |       |
         \       |__|      /
          '.             .'
            '-._______.-'

              ISTACK
      Made in l'imprimerie
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then say, in one short sentence, that you need three quick inputs to initialize the local app pack.

For the full workflow, follow [`/init-app`](../init-app/SKILL.md).
