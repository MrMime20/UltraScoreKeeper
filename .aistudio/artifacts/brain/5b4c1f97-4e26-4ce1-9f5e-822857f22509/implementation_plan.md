# Comprehensive Game State Persistence & Hit Log Refinement

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during clarification:
> - **Reached on Error Phrasing**: Confirmed as `[Player] reached on an error at [location]`.
> - **Game Reset Handling**: Confirmed to display a confirmation dialog before wiping saved game data from LocalStorage.

- **Confirmed Decision 1**: Uncomplicated field locations. Removed multi-tier sub-zones (such as "Deep Second Base" and "Third Base in the hole") in favor of clean baseball positions: `Second Base`, `Third Base`, `First Base`, `Home Plate`, `Pitcher's Mound`, `Shortstop`, `Left Field`, `Center Field`, and `Right Field`.
- **Confirmed Decision 2**: Out-of-the-park clicks are eliminated. Clicks must be inside the field bounds (grass or dirt) or foul territory past the foul lines. Clicks outside the field boundary do not register and trigger a helpful guidance notification.
- **Confirmed Decision 3**: Advanced tool modules will default to closed (`collapsed`) on fresh games.

---

## 1. Overview & Core Concept

- **What It Does**: Enhances the bleacher baseball scorekeeper app with total game persistence across page reloads (scores, inning, outs, teams, theme, hit log, and high-precision elapsed time calculating original start time and accumulated pause duration). Streamlines the hit logging experience with natural play sentences, simplified location zones, field-boundary validation, and clean Canvas-style expandable modules.
- **Target Audience / Persona**: Parents and fans sitting on the bleachers who want a frictionless, reliable way to track youth and amateur baseball games without losing game data if their browser tab reloads.
- **Key Value**: Zero data loss on refresh, accurate stopwatch time preservation, and fast, intuitive single-tap play logging.

---

## 2. User Experience & Visual Design

- **Module Presentation**:
  - On fresh game start, the Advanced Tools drawer displays all modules in a clean collapsed state with subtle chevrons.
  - Tapping a module smoothly expands it using buttery CSS grid animation (`grid-template-rows: 0fr -> 1fr`).
- **Interactive Diamond & Location Tracking**:
  - Field bounds validation: Clicking on grass or dirt registers the hit pin and updates the location badge cleanly.
  - Clicking past the foul lines registers as `Foul Territory`.
  - Clicks outside the stadium boundaries are rejected with an unobtrusive toast notification: *"Please tap inside the field"*.
- **Hit Outcome Selection & Sentence Construction**:
  - Clean dropdown options: `Single`, `Double`, `Triple`, `Home Run`, `Pop-out`, `Line-out`, `Flyout`, `Groundout`, `Reached on Error`, `Strikeout`, `Walk`, `Foul Ball`.
  - Smart play sentences dynamically generated per hit type:
    - Single: `[Name] hit a single to [Location].`
    - Double: `[Name] hit a double to [Location].`
    - Triple: `[Name] hit a triple to [Location].`
    - Home Run: `[Name] hit a home run to [Location].`
    - Reached on Error: `[Name] reached on an error at [Location].`
    - Pop-out: `[Name] popped out to [Location].`
    - Line-out: `[Name] lined out to [Location].`
    - Flyout: `[Name] flied out to [Location].`
    - Groundout: `[Name] grounded out to [Location].`
    - Strikeout: `[Name] struck out.` (Diamond hidden/disabled)
    - Walk: `[Name] walked.` (Diamond hidden/disabled)
    - Foul Ball: `[Name] hit a foul ball to [Location].`
- **Confirmation Dialog for Reset**:
  - Tapping "New Game" opens a confirmation modal before clearing LocalStorage state, preventing accidental taps from wiping game progress.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Stopwatch Calculation via Timestamp Math**:
  - *Chosen Approach*: Track `clockStartedAt` (epoch timestamp), `accumulatedPausedMs`, `isRunning`, and `lastPausedAt`.
  - *Why*: Instead of naive second counters that drift or reset on reload, elapsed time is computed as:
    $$\text{Elapsed} = (\text{CurrentTime} - \text{clockStartedAt}) - \text{accumulatedPausedMs}$$
    When paused, time stops accumulating. When reloaded, the exact running or paused duration is preserved down to the second.
  - *Alternatives Considered*: Storing only `secondsElapsed` counter; rejected because reload while running would fail to account for time elapsed while the page was reloading or backgrounded.
- **Decision 2: Comprehensive LocalStorage Synchronizer**:
  - *Chosen Approach*: Centralized `saveGameState()` and `loadGameState()` routines that bundle scores, inning, top/bottom half, outs, team names, clock state, and module states into LocalStorage.
  - *Why*: Ensures seamless recovery on mobile browser restarts, tab discards, or accidental reloads.

---

## 4. Technical Architecture & Data Strategy

```
┌───────────────────────────────────────────────────────────────┐
│                    Browser LocalStorage                        │
│  - baseball_game_state (scores, inning, outs, teams, clock)   │
│  - baseball_hit_log (ordered list of plays)                   │
│  - baseball_theme & baseball_haptics_enabled                  │
└──────────────────────────────┬────────────────────────────────┘
                               │ auto-sync on every action
                               ▼
┌───────────────────────────────────────────────────────────────┐
│                    Client Application State                    │
├──────────────────────────────┬────────────────────────────────┤
│ Score & Inning Controller    │ Stopwatch Clock Engine         │
│  - homeScoreVal / awayScore  │  - clockStartedAt (timestamp)  │
│  - currentInning / isTop     │  - accumulatedPausedMs         │
│  - currentOuts (0, 1, 2)     │  - isRunning / lastPausedAt    │
├──────────────────────────────┼────────────────────────────────┤
│ Diamond Geometry Engine      │ Advanced Modules Controller    │
│  - Boundary validation       │  - Canvas module accordion     │
│  - Clean location naming     │  - Initial collapsed state     │
│  - Sentence generator        │  - Reorder & delete handlers   │
└──────────────────────────────┴────────────────────────────────┘
```

### Component & State Mapping

1. **State Store (`saveGameState` / `loadGameState`)**:
   - Executes after score increments/decrements, inning flips, out changes, team name edits, and clock state updates.
   - Restores DOM indicators (scores, batting underline, inning half badge, outs circles, timer display) during `DOMContentLoaded`.
2. **Clock Calculation (`startTimer`, `toggleTimer`, `resetTimer`)**:
   - `toggleTimer()`:
     - If starting: sets `clockStartedAt = Date.now()` (if first start) or adds pause duration `accumulatedPausedMs += Date.now() - lastPausedAt`. Sets `isRunning = true`.
     - If pausing: sets `lastPausedAt = Date.now()`, `isRunning = false`.
   - `resetTimer()`: clears clock timestamps and resets display to `00:00:00`.
3. **Diamond Hit Detection (`calculateHitZone`, `placeHitPin`)**:
   - Computes distance and angle relative to Home Plate (490, 680).
   - If outside field arc ($\text{dist} > 620$ or $\text{dy} < -25$), rejects tap with guidance toast.
   - Fair territory categorized into clean base and outfield locations without extraneous text.
4. **Outcome Select & Hit Logger (`logHitSubmitBtn`)**:
   - Formats clean natural sentence stem based on selected outcome.
   - Inserts hit into `hitLogData` with inning label (`T1`, `B3`) and persists to LocalStorage.
5. **Reset Confirmation Modal**:
   - Accessible modal asking the user to confirm clearing all game data before resetting.

---

## Verification Plan

- **Clock Persistence Test**: Start clock, pause for 10 seconds, resume, reload page, verify exact elapsed seconds match user's expected time.
- **Score & Outs Persistence Test**: Increment runs, outs, inning, team names; reload browser; verify all state returns accurately.
- **Hit Log Field Boundary Test**: Tap outside field (past outfield fence) -> verify click is rejected with toast; tap in fair outfield -> verify clean name ("Center Field", "Left Field"); tap past foul lines -> verify "Foul Territory".
- **Outcome Sentences Test**: Log each outcome (Single, Double, Triple, Home Run, Pop-out, Line-out, Reached on Error, Groundout, Flyout, Strikeout, Walk) and verify exact formatting.
- **Module Default Test**: Clear storage and open Advanced Tools -> verify Hit Log module is initially closed.
- **Build Verification**: Run `compile_applet` and check for clean compilation.
