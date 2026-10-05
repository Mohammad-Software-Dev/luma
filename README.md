# Luma: The Sunseed

A complete small browser Metroidvania built with TypeScript, React, Canvas 2D, and Web Audio. Six interconnected forest areas with individual cinematic backdrops, two movement upgrades, varied enemies, three sunseeds, and a homecoming finale.

## Run

Requires Node.js 22.13 or later.

```sh
npm ci
npm run dev
```

Open the local address printed by the server. For a production build, run `npm run build`.

## Controls

| Input | Action |
| --- | --- |
| A / D or left / right arrows | Move |
| Space / W / up arrow | Jump; hold for height |
| J / X | Light strike |
| Shift / K | Sun Dash after discovery |
| Jump again in the air | Double jump after discovery |
| E / down arrow | Use shrines and passages |
| M | World map |
| Escape | Pause |

Standard-mapped controllers are supported: left stick/D-pad to move, A to jump, X to strike, B/RB to dash, Y to interact, View to open the map, and Menu to pause. Use up/down and A to navigate menus; left/right adjusts volume and motion settings; B closes a menu. Press a controller button to let the browser detect it. Nonstandard mappings fall back to keyboard/touch. Controller rumble is optional where the browser and hardware support it.

Touch controls appear on touch devices. Sound begins after starting the game. The toolbar offers saved mute, help, and game settings; fullscreen is in the footer. Progress is saved in this browser on this device; it does not sync across devices. Older version-1 saves remain compatible, and defeated enemies now stay defeated after reloading. The game pauses when the browser loses focus or the active controller disconnects.

## Adventure

Follow the eastward passages to Whisper Falls to find Sun Dash. Break the amber barrier in Amber Hollow and collect the Sky Feather. Explore the upper paths, free the three sunseeds from the wisps, and bring them to the Waking Glade's Sunwell.

## Quality update

- An eight-frame run cycle plus jump, fall, landing, strike, hurt, and dash poses.
- Five new optimized WebP environments for the falls, grotto, canopy, sanctuary, and ruins.
- Three-hit combat combinations with a stronger finisher, brief impact pauses, dust, and footsteps.
- Drifters, telegraphed chargers, projectile sentries, and an eight-heart Keeper with a second attack phase.
- Strike projectiles to disperse them, or dash through them. Watch wind-up lines, then dodge before attacks release.
- Controller gameplay/menu input, optional vibration, dash cooldown feedback, and a boss health bar.
- Reduced-motion preferences disable camera shake and vibration and reduce interface animation.

## Exploration update

- The connected map shows actual passages, Sky Feather gates, the next objective, and suggested routes.
- Select an area to see its outgoing passages and sunseed status. Adjacent destinations are revealed as you explore.
- Rest with E / Y at a Sunwell to activate it. Open the map while standing beside a lit Sunwell, then select another lit Sunwell to travel there.
- Entering an area no longer silently activates its checkpoint. Death and reload return to the last Sunwell where you rested; collected abilities, seeds, and defeated enemies remain saved.
- Existing version-1 saves retain their previous checkpoint and gain the starting Sunwell. Previously visited areas still require a rest to unlock travel.
- Restoring the forest stays complete after reloading. Lethal damage clears the old room’s projectiles and prevents pickups from that room during respawn.

## Combat update

- Distinct animated woodland creatures: leaf-winged moths, charging beetles, lantern flowers, and an owl-like Keeper.
- Charging lanes, committed projectile fan warnings, and filling wind-up rings make each attack readable. Warning lines have dark outlines for bright backgrounds.
- Strikes briefly stun regular enemies and make contact safe during recovery; danger returns when the creature recovers.
- A 140 ms input buffer helps chain three strikes. Damage, finishers, parries, guarding, and awakenings have visible feedback. Pausing clears queued attacks.
- The Keeper guards while preparing and opens after firing. Two well-timed three-hit counter windows can awaken it; its second phase has a wider fan and an explicit HUD cue.
- Projectiles stop at terrain. Creature awakenings fade out instead of disappearing immediately; invulnerability uses a gentle opacity pulse instead of rapid blinking.

## Comfort and controls update

- Settings are available from the title toolbar and pause menu. Music and game sounds have separate volume controls, alongside saved mute and optional controller vibration.
- Reduced motion can follow the device preference or be enabled explicitly. It removes camera shake and vibration and reduces interface and decorative animation.
- Gentle Journey lengthens attack warnings and recovery windows, slows charge/projectile attacks, extends damage immunity to 2.4 seconds, and makes falls free of heart loss. It preserves movement upgrades and all objectives.
- Rebind movement, jump, strike, dash, interaction, and map keys. Hints and guidance update to match. Escape always pauses; conflicting keys are rejected. Default secondary aliases remain available until that action is remapped.
- Preferences save separately from adventure progress. Starting a new journey keeps them; malformed settings safely fall back to defaults. When storage is unavailable, preferences still work for the session.

## Next development priorities

1. **Exploration depth:** optional secrets and a meaningful use for collected light, followed by additional ability-gated rooms and rewards.
2. **Release playtesting:** physical controller and touch-device checks, browser audio checks, and a full playthrough before updating the hosted game.

The previous development branch has been merged. Work continues directly on `main` as requested.

## Implementation

- `app/game.ts`: fixed-step 120 Hz physics, rooms, rendering, audio, persistence, and progression.
- `app/page.tsx`: React game interface, guidance, pause menu, and touch input.
- `app/preferences.ts` and `app/game-settings.tsx`: validated device preferences, remapping, and accessible settings.
- `app/world-map.tsx`: connected map, area details, and Sunwell travel.
- `app/globals.css`: responsive interface styling.
- `public/forest.png`, `public/*.webp`, `public/guardian.png`, and `public/guardian-run.png`: original AI-generated environment and character artwork.
- `tests/gameplay.mjs`: 59 deterministic checks using mocked browser APIs, including combat, progression, save compatibility, controller mapping, enemy attack timing, travel restrictions, checkpoint migration, respawn isolation, buffered combos, interruption and recovery, a full Keeper counter fight, projectile terrain collision, actual jumps to all three sunseeds (with enemies disabled to isolate geometry), preference validation and persistence, real keyboard remapping, assist difficulty, rumble suppression, and separate audio buses. Hardware controller behavior still benefits from real-device playtesting.

```sh
npm test
npm run typecheck
npm run build
```

GitHub Actions runs the gameplay checks, TypeScript check, and production build on pushes and pull requests.

The artwork uses a realistic forest backdrop with a stylized guardian and simple animated enemies. This is a compact 2D adventure rather than a large 3D game. The progress WebMCP tool is optional and feature-detected; unsupported browsers run the game normally.
