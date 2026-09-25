# Brain Sync — Manual Acceptance Tests

Everything a script can check is automated:

- `npm test`: unit, property, server and security tests;
- `npm run test:e2e-sync`: the sync UI in a real browser;
- `npm run test:e2e-release`: release upgrade and offline flight in a real browser.

What's left needs real hardware and a person. [`BRAIN-SYNC-SPEC.md`](./BRAIN-SYNC-SPEC.md) §52
makes the physical flight test **mandatory before production-ready status**.

Use a staging build (`VITE_BRAIN_SYNC_URL` pointing at a staging server over HTTPS) installed to the
Home Screen. Record for each run: date, app version, device/OS/browser, pass/fail, notes.

## A. Physical flight test (§52): mandatory

Device: an iPhone with Brain installed to the Home Screen. Second device: any other browser or
phone.

| # | Step | Expected | Pass |
|---|---|---|---|
| 1 | Open the installed app, Brain Sync → Enable Brain Sync (or pair), save the recovery code | status "☁ Synced" | ☐ |
| 2 | Turn on Airplane Mode **and** turn Wi-Fi off | — | ☐ |
| 3 | Close the app fully (app switcher → swipe away), reopen it | app opens normally from cache; status "✈ Offline · Progress saved locally" | ☐ |
| 4 | Play and **complete** two games, including one campaign level (e.g. Tower of Hanoi level 1) | Results appear immediately; next level unlocks; no error or spinner about sync | ☐ |
| 5 | Check the game menus / History | new results and bests are there; status shows "N changes to sync" | ☐ |
| 6 | Close and reopen the app, still offline | everything from step 4 still there | ☐ |
| 7 | **Reboot the phone**, still in Airplane Mode, reopen the app | everything from step 4 still there; app works offline | ☐ |
| 8 | Play one more game offline | saves normally | ☐ |
| 9 | Turn Airplane Mode off / Wi-Fi on; bring the app to the foreground | within seconds, without pressing anything, status becomes "☁ Synced" | ☐ |
| 10 | — | (Sync Now also works, but must not be needed) | ☐ |
| 11 | Open the second paired device, bring Brain to the foreground | status "☁ Synced" | ☐ |
| 12 | On the second device, check the same games' History and level progress | every offline result from steps 4 and 8 is there, level unlocked, bests correct | ☐ |

## B. Pairing with a real camera

| # | Step | Expected | Pass |
|---|---|---|---|
| 1 | Device A: Brain Sync → Add Device | QR shown, countdown from 5:00 | ☐ |
| 2 | iPhone (Home Screen app): Brain Sync → Scan QR code | camera permission prompt; live preview | ☐ |
| 3 | Point at A's QR | connects within a couple of seconds; "Connected…"; A shows "✓ … is now connected" | ☐ |
| 4 | Repeat on Android Chrome and on a desktop browser with a webcam | same | ☐ |
| 5 | Deny camera permission on one device | clear message offering "Paste pairing code" / recovery code; nothing breaks | ☐ |
| 6 | Let a QR expire, then scan it | "expired or already used" message; "New code" works | ☐ |
| 7 | Scan the same QR from a second new device after the first joined | rejected (single use) | ☐ |

## C. Recovery and device management

| # | Step | Expected | Pass |
|---|---|---|---|
| 1 | On a fresh browser: Brain Sync → Use recovery code, type it with a deliberate typo | "Check for a typo" before anything is sent | ☐ |
| 2 | Type it correctly | connects; progress arrives; any local progress on that browser is kept | ☐ |
| 3 | From another device, Remove this one | next sync here: "Sync paused · Progress is safe on this device"; local progress untouched; play continues | ☐ |
| 4 | Reconnect it with the recovery code | syncs again | ☐ |
| 5 | Create a new recovery code; try the old one on a fresh browser | old code rejected; new code works; existing devices unaffected | ☐ |
| 6 | Disconnect This Device | status "Progress stored on this device"; local progress untouched | ☐ |
| 7 | Delete Cloud Data (type DELETE) on a test identity | all devices stop syncing ("paused"); every device keeps its local progress | ☐ |

## D. Platform storage behaviour (audit §3)

| # | Check | Expected | Pass |
|---|---|---|---|
| 1 | iPhone: progress made in a Safari **tab** vs the **Home Screen app** | they are separate installations. Pairing both (or using sync) is how they share progress | ☐ |
| 2 | Deploy a new app version while a tab is open | old version keeps running until "Reload to update"; after reloading, all progress is there | ☐ |
| 3 | Export JSON on a synced device, then import it on a fresh local-only browser (Merge) | everything restored; no sync credential in the file | ☐ |

## E. Operations (before launch)

| # | Check | Pass |
|---|---|---|
| 1 | `npm run sync-backup` produces a file; a restore drill per `deploy/BRAIN-SYNC-OPERATIONS.md` §4 succeeds | ☐ |
| 2 | Server access log contains only `METHOD /route STATUS ms` lines (no IDs, tokens, IPs) | ☐ |
| 3 | `curl -i http://<api>/v1/profile` over plain HTTP through the proxy is refused / redirected | ☐ |
| 4 | Requests from an origin not in `BRAIN_SYNC_ALLOWED_ORIGINS` get no CORS headers | ☐ |
