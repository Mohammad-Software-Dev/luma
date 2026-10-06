# Luma combat artwork

## Reused effects

Eight textures from **Particle Pack (1.1)** by **Kenney Vleugels / Kenney.nl**.

- Source: https://kenney.nl/assets/particle-pack
- Downloaded: 6 October 2026
- License: **CC0 1.0 Universal**, https://creativecommons.org/publicdomain/zero/1.0/
- Original license and contributor notice: `Kenney-LICENSE.txt` in this directory.
- Source files, in atlas order: `slash_02.png`, `slash_03.png`, `spark_06.png`, `star_01.png`, `smoke_07.png`, `twirl_01.png`, `light_01.png`, `circle_03.png` from the transparent PNG directory.
- Adaptation: packed into `effects.webp` as eight 256px cells, then tinted and animated in Canvas for sunlight blade trails, contact sparks, parries, dust, projectiles, and spells. The runtime uses warm gold, pale blue, and mint tints.

## Artwork generated for Luma

The built-in image generation tool created the following original art for this project, with the existing Luma character as the identity reference for the hero sheets:

- `luma-combat.webp`: twelve painted combat poses, three four-frame combos.
- `luma-movement.webp`: idle, rising jump, falling, and forward dash.
- `creatures.webp`: four poses each for the leaf moth, amber beetle, lantern flower, and woodland owl.
- `bosses.webp`: Briarhorn, Tidewing, Amberback, Gale Sovereign, Moonbloom, and Solwarden.

Sprite silhouettes were extracted and packed without changing their painted forms, preserving their alpha. Source rectangles and anatomical pivots are recorded in `app/art-atlas.ts`. Boss stance and wing movement are animated procedurally in the renderer.

`luma-base.webp` and `luma-run.webp` are compressed derivatives of the project's existing `guardian.png` and `guardian-run.png`, which remain in the repository as originals.

The prompt set and art direction are recorded in `docs/art/prompts.md`. No character sprites were extracted from commercial games.
