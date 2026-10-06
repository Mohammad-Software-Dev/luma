# Rendering and encounter quality — 6 October 2026

## Measured performance

Same local Codex in-app browser, 1280×720 CSS viewport, device pixel ratio 2. Baseline: commit `c985a872274c681690aa515ebf8c157667325fdd`. Updated: this change. Tests ran against the development server after assets loaded. Each glade run discarded 31 warm-up frames and sampled 179 frames during the same camera sweep. Live Solwarden combat sampled 479 frames after warm-up, with two fixed 1/120-second simulation steps per frame and player immunity enabled only in the harness.

| Scenario | Backing canvas | Frame median | Frame p95 | CPU draw/update median | CPU p95 | Frames over 25 ms |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline glade | 2560×1440 | 33.3 ms | 34.3 ms | 1.7 ms | 2.4 ms | 137 / 179 |
| Updated glade, default cap | 1920×1080 | 16.7 ms | 17.7 ms | 0.8 ms | 1.1 ms | 0 / 179 |
| Updated glade, original resolution | 2560×1440 | 16.7 ms | 17.6 ms | 0.8 ms | 1.3 ms | 0 / 179 |
| Updated live Solwarden combat | 1920×1080 | 16.7 ms | 17.7 ms | 0.7 ms | 1.4 ms | 0 / 479 |

This is approximately 30 to 60 fps in the sampled glade scene. The equal-resolution run demonstrates that the improvement is not solely from lowering the pixel budget. RAF intervals measure observed frame pacing, not GPU execution timestamps; CPU durations measure draw submission (plus simulation in the combat run), not completed GPU work. Short warm-scene runs do not establish whole-campaign performance, cold-load stutter, or results on other hardware.

The old renderer filtered large scenery sprites and rebuilt terrain and radial glows each frame. The update bakes three scenery planes on room entry, caches platform compositions, reuses glow sprites, caps particles, culls off-screen enemies, and skips hidden-tab rendering. The default canvas respects a 1920×1080 pixel budget while preserving aspect ratio. Room changes release old platform/plane canvases. Some room-entry preparation remains synchronous and should be profiled on lower-end devices.

## Reproduce and inspect

Run `npm run dev`, then open `http://localhost:5173/benchmarks/render.html`. “Benchmark updated” measures the glade; “Benchmark updated native” forces the original 2560×1440 backing canvas; “Benchmark boss” samples real Solwarden updates and rendering. Keep the tab visible and avoid interacting during measurement. The page also has biome and guardian review controls. It runs an isolated session, disables adventure saving, and mutes audio. It is a development entry point, outside `public`, and is not a production build entry.

The temporary baseline copy used for comparison was removed. To reproduce the old numbers, use the baseline commit in a separate checkout with the same camera sweep and sample schedule.

## Environment composition

`app/scenery.ts` authors six biome palettes and landmark compositions. Distant vistas move at 0.075 camera speed, far silhouettes at 0.16, weather at 0.32, middle landmarks at 0.52, and near foliage at 1.16. Hanging edge vines and low plants add foreground depth without covering landing surfaces. Trial and arena compositions push large props away from the central route. Reduced motion fixes decorative offsets and removes secondary sway.

Ground and raised surfaces use each biome's material: mossy stone and high branches in the glade, wet slate at the falls, amber shelves underground, roots in the canopy, mushrooms and broad temple terraces in the sanctuary, and sandstone ruins at Sunspire. Moving platforms retain their material as they travel.

## Encounter design references and changes

Moon Studios describes fluid transitions, follow-through, squash/stretch, and responsive reactions in its [Ori animation interview](https://www.orithegame.com/rockpapershotgun-how-animation-powers-ori-and-the-will-of-the-wisps/). Luma applies those principles through pose blends, body compression, wing motion, recoil, and recovery silhouettes. This remains a Canvas sprite implementation; it does not reproduce Ori's production animation pipeline.

Nicolas Kraj's [Anatomy of an Attack](https://gdkeys.com/keys-to-combat-design-1-anatomy-of-an-attack/) explains anticipation, readable attack direction, release, and recovery. Luma now separates repositioning from committed aim, uses clear wind-up and landing cues, and preserves counter windows. The new attacks use original project artwork and behavior, not extracted commercial assets.

- Moths rise, commit to a curved swoop, then return toward their perch. Beetles accelerate into a locked charge. Rooted lantern flowers brace and alternate single shots with spreads.
- Guardians reposition before warning an attack; movement varies between ground strides, winged arcs, and Moonbloom's rooted casting.
- Slams release ground waves on landing. Gale dives into its committed landing position. Projectile attacks release spaced salvos rather than one simultaneous burst.
- Phase changes clear pending hazards and give a short non-damaging transition. Only active attacks cause body-contact damage; repositioning and recovery allow approaches.
- Twenty-four newly generated boss action poses cover movement, anticipation, release, and recovery. [Prompts and asset paths](../art/boss-action-prompts.md) record their origin.

## Validation and remaining playtesting

104 deterministic checks cover progression, all six guardian fights, a first-boss fight with ordinary jumps and five hearts, committed aim, delayed volleys, safe phase changes, moth swoops, cache reuse and cleanup, world-height terrain selection, canvas limits, atlas bounds, and bounded particles. TypeScript and production build checks accompany the tests. Browser review covers the new scenery and guardian poses.

A complete human campaign playthrough is still needed to tune difficulty and duration. Physical controller, touch-device, audio, and lower-end hardware checks remain separate from the automated and local browser evidence.
