# SCRATCHPAD — Bunny of the Day TODOs

## 1. Login Challenge (Passphrase Gate)
**Goal:** Prompt the user with a phrase; they must supply the correct input before seeing the bunny.

### Design Notes
- This is a **client-side passphrase gate**, not real authentication — no backend, no user accounts.
- The passphrase must never be stored or transmitted in plaintext.
- **Approach:** Store a hashed version of the expected answer (e.g., SHA-256 via Web Crypto API). Hash the user's input in-browser and compare. Never log or send raw input.
- Gate state (unlocked = true) can live in `sessionStorage` so the challenge persists per tab but resets on close — no plaintext data stored.
- Show the challenge prompt before the bunny card loads. On correct input, reveal the bunny.
- UI: a centered input + submit button with the challenge phrase displayed above it.

### Acceptance Criteria
- [ ] Challenge phrase is displayed before bunny content
- [ ] User input is hashed with Web Crypto (SHA-256) before comparison
- [ ] Raw input is never stored, logged, or sent anywhere
- [ ] Session unlock state stored in `sessionStorage` (boolean flag only)
- [ ] Wrong input shows an error; correct input reveals the bunny card
- [ ] Tests cover: correct hash match, wrong input rejection, session persistence logic

---

## 2. Tests — `/testbunny` Command
**Goal:** All features covered by Karma/Jasmine tests, runnable via a single command printed in the console.

### Test Command
Add to `package.json` scripts:
```json
"testbunny": "ng test --no-watch --browsers=ChromeHeadless"
```
Then users can run: `npm run testbunny`

### Test Coverage Plan
- [ ] `AppComponent` — existing logic
  - [ ] `getTodayString()` returns correct `YYYY-MM-DD`
  - [ ] `getDayOfYear()` returns a positive integer in range 1–366
  - [ ] `loadCache()` returns null on empty/corrupt localStorage
  - [ ] `saveCache()` writes to localStorage under correct key
  - [ ] `ngOnInit()` uses cache when date matches today
  - [ ] `ngOnInit()` calls `fetchBunny()` when cache is stale or absent
  - [ ] `fetchBunny()` selects correct index via `dayOfYear % hits.length`
  - [ ] Error state set when API returns empty hits
  - [ ] Error state set when HTTP call fails
- [ ] Login challenge feature (new)
  - [ ] Correct passphrase hash unlocks the app
  - [ ] Incorrect passphrase shows error, does not unlock
  - [ ] Session unlock flag stored in `sessionStorage`, not `localStorage`
  - [ ] Raw input is not stored anywhere after hash comparison
- [ ] Skip-to-next-bunny feature (new)
  - [ ] Clicking skip advances the index by 1
  - [ ] Skip wraps around at end of hits array
  - [ ] Skipped index is NOT persisted to the daily cache (ephemeral)

---

## 3. Skip to Next Bunny Button
**Goal:** A button on the bunny card that cycles to the next photo in the current day's API results without re-fetching.

### Design Notes
- Keep the `hits` array in component state after fetching (currently discarded after selection).
- Track a `skipOffset: number` in component state (starts at 0, increments on click).
- Index becomes: `(getDayOfYear() + skipOffset) % hits.length`
- The skip offset is **ephemeral** (in-memory only) — refreshing resets to the daily bunny. This is intentional; the deterministic daily pick is the canonical experience.
- Update the displayed bunny data reactively from `hits[newIndex]` without a new HTTP call.
- Button label: "Next bunny →" — placed in the card footer next to photo credit.

### Acceptance Criteria
- [ ] Button visible on the bunny card
- [ ] Clicking advances to the next image in the fetched results
- [ ] Wraps around from last to first
- [ ] No additional API calls on skip
- [ ] Tests cover skip index logic and wrap-around

---

## Implementation Order
1. `testbunny` script + baseline tests for existing code
2. Skip button (simpler, no security concerns)
3. Login challenge (requires Web Crypto, session state, careful input handling)
4. Tests for features 2 and 3

---

## Security Notes (Login Challenge)
- Use `window.crypto.subtle.digest('SHA-256', encoded)` — no external library needed.
- The expected hash is hardcoded in source (this is obscurity, not real security — document this clearly).
- Never use `btoa`/plaintext comparison for the passphrase.
- Do not attach the raw input value to any DOM attribute or console statement.
