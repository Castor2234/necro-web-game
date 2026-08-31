# Location_1 Scene — Documentation

> **File:** `src/game/scenes/Location_1.ts`
> **Exports:** `class Location_1 extends Phaser.Scene`
> **Scene key:** `SCENE.Location_1` → `'Location_1'` (defined in `src/game/helpers/keys.ts`)

## 1. Overview

`Location_1` is the main open-world map scene. It shows the necromancer's location with
three villages scattered across a 640×360 world. The player selects the necromancer or a
village and sends the **zombie rat horde** (`zombieRats`) on raids. Each raid can be one of
three actions:

| Action | Effect |
|---|---|
| **Attack** | Kills villagers and converts them into `humanCorpses`; the horde takes losses. |
| **Loot** | Collects `ratCorpses`; no losses. |
| **Scout** | Reveals the village's current population on the map. |

Villages are not static — their population grows over time (logistic growth) and decays
occasionally, which makes scouting meaningful.

The scene is registered in `src/game/main.ts` and paired with the React overlay
`Location1UI` (`src/components/Location_1UI/Location_1UI.tsx`) via `src/sceneUI.tsx`.

---

## 2. Imports / Dependencies

| Import | Module | Purpose |
|---|---|---|
| `Phaser` | `phaser` | Phaser 4 engine. |
| `SCENE` | `../helpers/keys` | Scene-key constants (`SCENE.Location_1`). |
| `emit`, `on`, `off` | `../helpers/events` | Type-safe EventBus helpers for scene↔UI communication. |
| `VillageAction` (type) | `../helpers/events` | `'attack' \| 'loot' \| 'scout'`. |
| `CameraController` | `../controllers/CameraController` | Wheel-zoom + middle-drag camera, world↔screen conversion. |
| `getStat`, `setStat` | `../state/gameState` | Read/write the Phaser Data Registry (single source of truth during play). |
| `GameState` (type) | `../state/gameState` | Typed registry stats. |
| `addResources` | `../state/secondary/resources` | Adds corpses to the resource store. |
| `getRatTaskSaveData`, `setRatTaskSaveData` | `../state/save` | Persist/restore the in-flight raid across scene switches and refreshes. |

---

## 3. Types & Core Constants

### 3.1 `VillageId`

```ts
type VillageId = 'village1' | 'village2' | 'village3';
```

Each id maps to a persisted population stat in `VILLAGE_POPULATION_KEYS`:

| Village id | Registry stat |
|---|---|
| `village1` | `village1Population` |
| `village2` | `village2Population` |
| `village3` | `village3Population` |

`isVillageId(value)` is a runtime type guard used to validate payloads coming from the UI
and stale save data.

### 3.2 `VillageConfig`

```ts
interface VillageConfig {
  id: VillageId;
  x: number;          // world position
  y: number;
  texture: string;    // sprite texture key
  maxPopulation: number;
  growthRate: number; // logistic-growth rate
}
```

### 3.3 Village table (`villageConfigs`)

| Village | Position (x, y) | Texture | maxPopulation | growthRate | initial pop. (`gameState.ts`) |
|---|---|---|---|---|---|
| `village1` | (130, 70) | `village_img` | **300** | 0.02 | 100 |
| `village2` | (40, 160) | `village_img` | **700** | 0.04 | 300 |
| `village3` | (185, 215) | `village_img` | **2000** | 0.05 | 1000 |

Population is stored in the registry and starts at the initial values configured in
`src/game/state/gameState.ts` (`village1Population: 100`, `village2Population: 300`,
`village3Population: 1000`).

### 3.4 `RatTask` — discriminated union

```ts
type RatTask =
  | {
      action: VillageAction;
      villageId: VillageId;
      targetX: number;
      targetY: number;
      state: 'moving-to-target' | 'returning';
    }
  | {
      action: VillageAction;
      villageId: VillageId;
      targetX: number;
      targetY: number;
      state: 'in-progress';
      timer: number; // ms remaining
    };
```

The `timer` field exists **only** on the `'in-progress'` member, so the update loop can
touch it without `timer!` assertions (the type system narrows the union).

### 3.5 Tuning constants

| Constant | Value | Meaning |
|---|---|---|
| `DECAY_BASE_CHANCE` | `0.2` | 20% chance per growth tick of an extra population dip |
| `DECAY_PERCENT_MIN` | `0.01` | Smallest decay: 1% of current population |
| `DECAY_PERCENT_MAX` | `0.06` | Largest decay: 6% of current population |
| `POPULATION_GROWTH_INTERVAL_MS` | `5000` | Village population ticks every 5 s while the scene is active |
| `BAR_WIDTH` / `BAR_HEIGHT` | `64` / `6` | Raid progress-bar rectangle size |
| `BAR_OFFSET_Y` | `38` | Progress bar is drawn 38 px below the village |

Action durations and horde speed are **not** hard-coded; they come from the registry
(`attackDuration`, `lootDuration`, `scoutDuration`, `ratSpeed`) so upgrades in the Workshop
scene take effect automatically.

---

## 4. Scene Lifecycle

### 4.1 `constructor()`

Calls `super(SCENE.Location_1)`.

### 4.2 `create()`

```text
background image 'location_1_bg' (320,180) at depth -1
  ├─ CameraController (wheel zoom, middle-drag pan)
  ├─ Necromancer: static sprite 'necro_icon' at (20,50), depth 1, interactive
  │     pointerover → scale 1.1 | pointerout → scale 1.0
  │     pointerdown (canvas-only) → selectNecromancer()
  ├─ Villages: static sprites 'village_img' from villageConfigs, data-tagged
  │     (villageId, maxPopulation, growthRate), hover scale, click → selectVillage()
  ├─ Population labels: Text '???' above each village (revealed by scouting)
  ├─ Empty-space click (no object under cursor) → deselect both menus
  ├─ House: dynamic sprite 'house_1_img' at (350,160) [visual only]
  ├─ Zombie rats: dynamic sprite 'zombie_horde_img', scale 0.5, hidden at start
  ├─ Arcade overlaps:
  │     rats ↔ villages       → handleRatVillageOverlap
  │     rats ↔ necromancer    → handleRatNecromancerOverlap
  │     (auto-torn-down by the Arcade World on scene shutdown)
  ├─ Subscribes to the 'village-action' EventBus event (on/off with this-context)
  ├─ restoreRatTask()          ← resumes a raid saved mid-flight
  └─ shutdown handler → off('village-action'), syncRatTaskSaveData(),
       cameraController.destroy(), destroy travelLine & population labels
```

Finally, `emit('current-scene-ready', this)` tells the React overlay (and the auto-save
system) the scene is live.

### 4.3 `update(_time, delta)`

```text
if camera has changed:
  → re-sync anchored UI positions ('village-ui-position' / 'necromancer-ui-position')

if ratTask exists:
  if state === 'in-progress':
    timer -= delta
    progressBar.scaleX = 1 - timer / duration
    if timer <= 0:
      resolve action (loot/scout/attack)
      destroy progress bar
      if horde wiped out → clear task, emit 'rats-busy' false
      else beginReturnTrip() (state → 'returning')
  else:
    redraw travel line from the horde to its destination
    (village while moving-to-target, necromancer while returning)

population growth accumulator += delta; every 5 s → growVillagePopulation()
```

---

## 5. Zombie Rat Raid — State Machine

```text
            UI: emit('village-action', {action, villageId})
                            │
                            ▼
                    handleVillageAction()        ─ validates villageId, finds sprite
                            │
                            ▼
                        sendRats()               ─ guards: ratTask already set? rats < 1?
                            │                      positions horde at necromancer, shows it
                            ▼
                    'moving-to-target'           physics.moveTo(village, ratSpeed)
                            │                      draws travel line, syncs save,
                            │                      emits 'rats-busy' true
                            │
              overlap with intended village
                (handleRatVillageOverlap)
                            │
                            ▼
             ┌► 'in-progress' ────────────────┐   horde hidden, progress bar shown
             │   (timer = actionDuration)      │   update() counts down timer
             │                                │
     timer reaches 0 ──────────────────────────┘
             │
             ▼
   resolveAction():  loot / scout / attack     (see table below)
             │
             ├── horde wiped out? (attack)
             │       └► ratTask = null · 'rats-busy' false · save synced · END
             │
             ▼
      beginReturnTrip() → state 'returning'
             │            horde visible, moveTo necromancer
             ▼
   overlap with necromancer
     (handleRatNecromancerOverlap)
             │
             ▼
   emit('rats-returned', {villageId})
   ratTask = null · 'rats-busy' false · save synced
```

### 5.1 `sendRats(action, target)`

- **Guards:** only one raid at a time (`ratTask` must be `null`) and the horde must be
  non-empty (`zombieRatsAmount >= 1`). The guard protects against a stale React
  `'rats-busy'` state corrupting the task.
- Teleports the horde to the necromancer, shows it, records the task as
  `'moving-to-target'`, snapshots the save, emits `'rats-busy' true`, draws the travel
  line, and calls `physics.moveTo(target, ratSpeed)`.

### 5.2 `handleRatVillageOverlap`

Fires when the horde physically overlaps any village. It only acts when the task is
`'moving-to-target'` **and** the overlapped village is the intended target (so the horde
doesn't stop early if it clips a different village en route). It stops the horde, hides it,
switches to `'in-progress'` with `timer = getActionDuration(action)`, creates the progress
bar above the village, and syncs the save.

### 5.3 Action resolution (timer expiry)

| Action | Implementation |
|---|---|
| **Loot** — `resolveLoot` | `looted = Between(1, ratCount)`; `addResources({ ratCorpses: looted })`; emits `'village-looted'` with `lootedCorpses`. |
| **Scout** — `resolveScout` | Emits `'village-scouted'`; sets the population label to the truncated population (the "???" reveal). |
| **Attack** — `resolveAttack` | `strength = ratCount * ratPower`; `possibleKills = ⌊strength / 10⌋`. If `< 1`, the whole horde dies (`zombieRatsAmount = 0`). Otherwise `kills = min(population, Between(1, possibleKills))`; `unitDeaths = Between(1, ratCount)`; population reduced by `kills`, `humanCorpses` increased by `kills`, horde reduced by `unitDeaths`; emits `'creature-stats-changed'` and `'village-attacked'`. |

After resolution the progress bar is destroyed. If the horde was wiped out (only possible
via attack) the task is cleared and `'rats-busy'` goes false — no return trip. Otherwise
`beginReturnTrip()` runs.

### 5.4 Return trip

`beginReturnTrip()` re-hands the task to the save layer *before* switching the state, so a
save is never observed mid-transition. The horde becomes visible again, the travel line is
redrawn toward the necromancer, and `physics.moveTo(necromancer, ratSpeed)` starts the
return.

`handleRatNecromancerOverlap` completes the loop: stops the horde, hides it, clears the
travel line, emits `'rats-returned' { villageId }`, clears the task, syncs the save, and
emits `'rats-busy' false`.

---

## 6. Village Population

- **Read/write** via the registry (`getVillagePopulation` / `setVillagePopulation`) and the
  `VILLAGE_POPULATION_KEYS` map. Values are clamped to ≥ 0.
- **Growth** — `growVillagePopulation()` runs every 5 s while the scene is active:

  ```ts
  growth = rate * current * (1 - current / maxPopulation);  // logistic
  current = max(current + growth, 0);
  ```

  Logistic growth naturally slows as the village approaches `maxPopulation`.

- **Decay** — with 20% chance per tick, the population dips a further 1–6%. Both formulas
  keep the population at ≥ 0.
- **Labels** display `'???'` until a scout reveals the number; the label is destroyed on
  scene shutdown.

---

## 7. Selection & UI Anchoring

| Action | Emitted event | Payload |
|---|---|---|
| Click necromancer | `'necromancer-selected'` | `true` / `false` |
| Click village | `'village-selected'` | `{ id }` \| `null` |
| (both) | `'village-ui-position'` / `'necromancer-ui-position'` | `{ x, y }` in **screen** coordinates |

- Menus are anchored to the **sprite position** (not the click point) so they stay in a
  consistent spot relative to the object.
- `emitAnchorPosition()` converts world → screen with
  `cameraController.worldToScreen()`, and `update()` re-emits the position while the camera
  is moving so the React menus track the sprites.
- `isCanvasClick(pointer)` filters pointer events so clicks that land on the React overlay
  (not the game canvas) don't select sprites underneath.
- Selecting one object deselects the other; clicking empty space deselects both.

---

## 8. Events

All events are typed in `src/game/helpers/events.ts` (`GameEvents`); this scene only uses
the `emit` / `on` / `off` helpers.

### Subscribed (with scene context; cleaned up on shutdown)

| Event | Handler | Purpose |
|---|---|---|
| `'village-action'` | `handleVillageAction` | Player pressed Attack / Loot / Scout in the React menu. |

### Emitted

| Event | Payload | When |
|---|---|---|
| `'current-scene-ready'` | `Phaser.Scene` | After `create()`. |
| `'village-selected'` | `{ id } \| null` | Village selected / deselected. |
| `'necromancer-selected'` | `boolean` | Necromancer selected / deselected. |
| `'village-ui-position'` | `{ x, y }` | Anchor sync (village menu). |
| `'necromancer-ui-position'` | `{ x, y }` | Anchor sync (necromancer menu). |
| `'rats-busy'` | `boolean` | Raid started / finished (UI disables buttons while `true`). |
| `'rats-returned'` | `{ villageId }` | Horde is back at the necromancer. |
| `'village-attacked'` | `{ villageId, kills }` | Attack resolved. |
| `'village-looted'` | `{ villageId, lootedCorpses }` | Loot resolved. |
| `'village-scouted'` | `{ villageId }` | Scout resolved. |
| `'creature-stats-changed'` | `void` | Horde count changed (attack). |

---

## 9. Save / Restore of In-Flight Raids

A raid is a multi-second journey across scene switches and page refreshes, so the scene
keeps it in sync with the save module (`src/game/state/save.ts`):

- **`syncRatTaskSaveData()`** — snapshots `ratTask` (or `null`) as a `SavedRatTask` via
  `setRatTaskSaveData()`. It captures the action, target, state, remaining `timer` (only for
  `'in-progress'`), the progress-bar fill scale, and the horde's position/visibility.
- **`restoreRatTask()`** — called at the top of `create()`. Reads `getRatTaskSaveData()` and
  rebuilds the raid exactly where it left off:
  - validates `villageId` (stale/corrupt saves targeting an unknown village are ignored),
  - restores horde position & visibility,
  - `'in-progress'` → recreates the progress bar and restores its fill scale,
  - `'moving-to-target'` / `'returning'` → redraws the travel line and re-issues
    `physics.moveTo` at `ratSpeed`.
  - Either way it emits `'rats-busy' true` so the UI locks again.
- **Shutdown** — the scene's `'shutdown'` handler calls `syncRatTaskSaveData()` *before*
  teardown, so switching scenes never loses the horde mid-trip.
- `saveGame` / `initGameStateFromSave` serialize/restore that snapshot, and
  `resetGameState` clears it for a new game.

---

## 10. Key Design Notes

- **Single Graphics for the travel line** — `drawTravelLine()` reuses one
  `Phaser.GameObjects.Graphics` object instead of allocating a fresh one per frame.
- **Type-safe timer** — the `RatTask` discriminated union makes the `timer` accessible only
  in the `'in-progress'` branch, removing the old `timer!` assertions.
- **No manual overlap cleanup** — colliders/overlaps are owned by the Arcade world, which
  tears them down on `ArcadePhysics.shutdown`.
- **Defensive event handling** — `isVillageId()` guards both UI payloads and restored saves;
  a malformed village id can never reach the task logic.
- **Balance knobs come from the registry** — durations, speed, and power are governed by
  stats (`attackDuration`, `lootDuration`, `scoutDuration`, `ratSpeed`, `ratPower`) that the
  Workshop upgrades modify, keeping Location_1 free of duplicated tuning values.

---

## 11. Related Files

| File | Relation |
|---|---|
| `src/game/main.ts` | Registers the `Location_1` scene with the Phaser game. |
| `src/game/helpers/keys.ts` | `SCENE.Location_1` key constant. |
| `src/game/helpers/events.ts` | `VillageAction` type + all `Location_1`-related event contracts. |
| `src/game/controllers/CameraController.ts` | Camera zoom/pan and `worldToScreen()`. |
| `src/game/state/gameState.ts` | Registry stats used by this scene (populations, horde, durations). |
| `src/game/state/save.ts` | `SavedRatTask` persistence + restore (`syncRatTaskSaveData`, `restoreRatTask`). |
| `src/game/state/secondary/resources.ts` | `addResources` for `humanCorpses` / `ratCorpses`. |
| `src/game/scenes/1Preloader.ts` | Loads `location_1_bg`, `village_img`, `necro_icon`, `zombie_horde_img`, `house_1_img`. |
| `src/components/Location_1UI/Location_1UI.tsx` | React overlay: village action menu + necromancer menu. |
| `src/sceneUI.tsx` | Maps `SCENE.Location_1` → `Location1UI`. |