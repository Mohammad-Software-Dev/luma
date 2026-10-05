# Luma: The Sunseed

A browser Metroidvania built with TypeScript, React, Canvas 2D, and Web Audio. Its campaign spans **six stages and 24 areas**, with cinematic forest backdrops, movement upgrades, traversal trials, combat gauntlets, optional discoveries, and six mandatory guardian battles.

## Run

Requires Node.js 22.13 or later.

```sh
git clone https://github.com/Mohammad-Software-Dev/luma.git
cd luma
npm ci
npm run dev
```

Open **http://localhost:5173** (or the address printed by the server). Keep the terminal running; Ctrl+C stops the server. To update an existing checkout, run `git pull` on `main` before starting it. Sound begins when you start your journey.

For a production build, run `npm run build`.

## Campaign

Each stage has four areas: exploration, a traversal trial, a combat gauntlet, and a boss arena. Find and interact with one trail beacon in each of the first three areas. **All three beacons and every creature in the gauntlet must be cleared before the arena opens. Defeating the stage boss is the only way to unlock the next stage.** Sunwell travel respects these gates.

| Stage | Traversal trial | Combat gauntlet | Final guardian |
| --- | --- | --- | --- |
| Waking Glade | Bramble Brook | Rootbound Crossing | Briarhorn: charges and ground waves |
| Whisper Falls | The Spillway | Torrent Stair | Tidewing: projectile fans and marked rain |
| Amber Hollow | Ember Veins | Crystal Ascent | Amberback: eruptions and charges |
| Windborne Canopy | Swaying Boughs | Stormleaf Watch | Gale Sovereign: spirals and fans |
| Moonpetal Sanctuary | Lunar Causeway | Starlit Terraces | Moonbloom: rain, spirals, and eruptions |
| Sunspire Ruins | The Broken Aqueduct | Dawnward Keep | Solwarden: three phases combining earlier attacks |

Trials introduce thorns, timed vents, swinging pods, moving platforms, lifts, and gaps. Find Sun Dash in Whisper Falls and the Sky Feather in Amber Hollow; later routes use these abilities. The map shows the next objective, each stage’s progress, passages, and requirements.

Guardians announce attacks before releasing them. Dodge, jump, dash, or strike projectiles to create a path, then counter when the guardian opens during recovery. Their second phases intensify their attacks; Solwarden has a third phase. Crossing into a battle seals the arena until victory or defeat. A failed attempt resets that guardian’s health while retaining beacons and cleared gauntlet creatures.

Guardian victories grant 40 light, restore health, activate the arena checkpoint, and open the next stage. The guardians of Amber Hollow, Moonpetal Sanctuary, and Sunspire Ruins restore the three sunseeds. Awakening all six guardians restores dawn.

## Controls

| Input | Action |
| --- | --- |
| A / D or left / right arrows | Move |
| Space / W / up arrow | Jump; hold for height |
| J / X | Light strike; chain three strikes for a stronger finisher |
| Shift / K | Sun Dash after discovery |
| Jump again in the air | Double jump after discovery |
| E / down arrow | Use beacons, Sunwells, memories, and passages |
| M | World map |
| Escape | Pause |

Standard-mapped controllers are supported: left stick/D-pad to move, A to jump, X to strike, B/RB to dash, Y to interact, View to open the map, and Menu to pause. Use up/down and A to navigate menus; left/right adjusts settings; B closes a menu. Press a controller button to let the browser detect it. Nonstandard mappings fall back to keyboard/touch. Optional rumble depends on browser and hardware support.

Touch controls appear on touch devices. The toolbar offers help, saved mute, and game settings; fullscreen is in the footer. The game pauses when the browser loses focus or the active controller disconnects.

## Exploration, checkpoints, and upgrades

- Rest at a Sunwell to heal, save a checkpoint, and activate travel. Open the map beside a lit Sunwell and select another lit Sunwell in an unlocked stage to travel there. Entering an area alone does not activate its checkpoint.
- Three optional Memory Blooms wait above the brook, falls, and canopy. Return with movement upgrades and interact beside a bud to awaken it. Each grants 20 light and a story recorded on the map, which provides clues before discovery.
- Resting also opens the blessings menu. Heartwood costs 20 light for a sixth heart and 35 for a seventh. Glowkeeper costs 25 light and extends mote collection. Purchases require enough light and cannot be repeated after completion.
- Beacons grant 10 light once. Abilities, discoveries, blessings, cleared creatures, beacons, and guardian victories persist through death and reload. Unfinished guardian fights restart at full health.

## Comfort and settings

Music and game sounds have separate volume controls, with saved mute and optional controller vibration. Reduced motion follows the device preference or can be set explicitly; it removes camera shake and vibration and reduces interface animation.

Gentle Journey lengthens attack warnings and recovery windows, slows charge/projectile attacks, extends damage immunity to 2.4 seconds, and makes falls free of heart loss. It keeps every campaign objective and gate.

Movement, jump, strike, dash, interaction, and map keys can be rebound. Hints update to match. Escape always pauses; conflicting keys are rejected. Default secondary aliases remain available until that action is remapped.

## Save compatibility

Adventure progress is saved in this browser on this device and does not sync across devices. Preferences save separately and survive starting a new journey. If storage is unavailable, the game remains playable for the session.

The expanded campaign writes version-2 progress under the existing save key. **Continuing a version-1 save retains earned abilities, light, hearts, blessings, memories, sunseeds, and regular creature rewards, but begins the new campaign at Waking Glade.** Its six guardians and trail beacons start unfinished, including for previously completed saves. This prevents old progress from skipping the new stage battles. The game explains the migration on continuation. Version-2 saves resume at the last checkpoint in an unlocked stage.

Starting a new journey resets adventure progress and retains device preferences.

## Implementation and verification

- `app/campaign.ts`: stage content, authored trials, shared gate rules, and boss attack profiles used by both behavior and warnings.
- `app/game.ts`: fixed-step 120 Hz physics, enemies, hazards, moving platforms, rendering, audio, persistence, and progression.
- `app/page.tsx`: React interface, guidance, pause menu, and touch input.
- `app/world-map.tsx`: six-stage campaign map, four-area stage routes, memory clues, and Sunwell travel.
- `app/preferences.ts`, `app/game-settings.tsx`, and `app/sunwell.tsx`: validated preferences, remapping, settings, and blessing purchases.
- `public/forest.png`, `public/*.webp`, and guardian images: original generated environment and character artwork, extended with procedural animation and effects.
- `tests/gameplay.mjs`: 87 deterministic checks with mocked browser APIs. Coverage includes campaign and travel gates, save migration and malformed data, checkpoints, boss attack cycles and rewards, all six guardian counter fights, a first-boss fight with ordinary jumps and five hearts, hazards, moving-platform carry, combat buffering, controller mapping, preferences, audio buses, blessings, and memories. Real movement checks reach every trial beacon and exit and every gauntlet beacon; enemies and hazards are disabled in those geometry checks to isolate reachability.

```sh
npm test
npm run typecheck
npm run build
```

GitHub Actions runs gameplay checks, TypeScript checks, and production builds on pushes and pull requests. Work continues directly on `main` as requested.

Browser review covers desktop and narrow-screen layouts, the campaign map, guardian interface, and hazard visuals. Hardware controller, physical touch-device, and audio checks still need real-device playtesting. The expanded content supports a longer adventure, but its completion time has not been measured in a full human playthrough.

## Next development priorities

1. Play the complete six-stage campaign to tune difficulty, encounter pacing, checkpoints, and duration from actual player feedback.
2. Expand the variation between combat gauntlets and add optional side routes and rewards.
3. Complete physical controller, touch, and audio checks before updating the hosted release.

The artwork combines realistic environment backdrops with stylized animated characters in a 2D game. The optional progress WebMCP tool is feature-detected; unsupported browsers run the game normally.
