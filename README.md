# Luma: The Sunseed

A complete small browser Metroidvania built with TypeScript, React, Canvas 2D, and Web Audio. Six interconnected forest areas, two movement upgrades, shadow-wisp combat, three sunseeds, and a homecoming finale.

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

Touch controls appear on touch devices. Sound begins after starting the game. The toolbar offers mute, help, and fullscreen. Progress is saved in this browser on this device; it does not sync across devices.

## Adventure

Follow the eastward passages to Whisper Falls to find Sun Dash. Break the amber barrier in Amber Hollow and collect the Sky Feather. Explore the upper paths, free the three sunseeds from the wisps, and bring them to the Waking Glade's Sunwell.

## Implementation

- `app/game.ts`: fixed-step 120 Hz physics, rooms, rendering, audio, persistence, and progression.
- `app/page.tsx`: React game interface, map, guidance, pause menu, and touch input.
- `app/globals.css`: responsive interface styling.
- `public/forest.png` and `public/guardian.png`: original AI-generated environment and character artwork.
- `tests/gameplay.mjs`: deterministic engine tests using mocked browser APIs.

```sh
node tests/gameplay.mjs
node node_modules/typescript/bin/tsc --noEmit
```

The artwork uses a realistic forest backdrop with a stylized guardian and simple animated enemies. This is a compact 2D adventure rather than a large 3D game. The progress WebMCP tool is optional and feature-detected; unsupported browsers run the game normally.
