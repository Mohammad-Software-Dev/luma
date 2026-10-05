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

Standard-mapped controllers are supported: left stick/D-pad to move, A to jump, X to strike, B/RB to dash, Y to interact, View to open the map, and Menu to pause. Use up/down and A to navigate menus; B closes a menu. Press a controller button to let the browser detect it. Nonstandard mappings fall back to keyboard/touch. Controller rumble is optional where the browser and hardware support it.

Touch controls appear on touch devices. Sound begins after starting the game. The toolbar offers mute, help, and fullscreen. Progress is saved in this browser on this device; it does not sync across devices. Older version-1 saves remain compatible, and defeated enemies now stay defeated after reloading. The game pauses when the browser loses focus or the active controller disconnects.

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

## Implementation

- `app/game.ts`: fixed-step 120 Hz physics, rooms, rendering, audio, persistence, and progression.
- `app/page.tsx`: React game interface, map, guidance, pause menu, and touch input.
- `app/globals.css`: responsive interface styling.
- `public/forest.png`, `public/*.webp`, `public/guardian.png`, and `public/guardian-run.png`: original AI-generated environment and character artwork.
- `tests/gameplay.mjs`: 24 deterministic checks using mocked browser APIs, including combat, progression, save compatibility, controller mapping, and enemy attack timing. Hardware controller behavior still benefits from real-device playtesting.

```sh
node tests/gameplay.mjs
node node_modules/typescript/bin/tsc --noEmit
```

The artwork uses a realistic forest backdrop with a stylized guardian and simple animated enemies. This is a compact 2D adventure rather than a large 3D game. The progress WebMCP tool is optional and feature-detected; unsupported browsers run the game normally.
