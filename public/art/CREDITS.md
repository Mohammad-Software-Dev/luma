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
- `boss-actions-a.webp` and `boss-actions-b.webp`: 24 new action poses across the six guardians, generated in built-in mode using the original boss designs as references. Pivots are in `app/boss-action-atlas.ts`; full prompts are in `docs/art/boss-action-prompts.md`.

Sprite silhouettes were extracted and packed without changing their painted forms, preserving their alpha. Source rectangles and anatomical pivots are recorded in `app/art-atlas.ts`. Boss stance and wing movement are animated procedurally in the renderer.

`luma-base.webp` and `luma-run.webp` are compressed derivatives of the project's existing `guardian.png` and `guardian-run.png`, which remain in the repository as originals.

The prompt set and art direction are recorded in `docs/art/prompts.md`. No character sprites were extracted from commercial games.

## Environment assets

Eight shaded sprites from **Foliage Sprites (1.0)** by **Kenney / Kenney.nl**.

- Source: https://kenney.nl/assets/foliage-sprites
- Downloaded: 6 October 2026
- License: **CC0 1.0 Universal**; original notice in `Kenney-Foliage-LICENSE.txt`.
- Original files: `sprite_0052.png`, `sprite_0056.png`, `sprite_0060.png`, `sprite_0063.png`, `sprite_0071.png`, `sprite_0073.png`, `sprite_0092.png`, `sprite_0095.png` from `PNG/Shaded/`.
- Adaptation: packed into `environment-foliage.webp`, tinted by biome, placed as platform dressing and a separate foreground parallax layer.

Original painted scenery generated with the built-in image generation tool:

- `environment-terrain.webp`: mossy limestone, root bridge, wet slate, amber crystal shelf, moon mushroom, and broken sandstone arch platforms.
- `environment-props.webp`: ancient tree, ruined pillar, mushroom grove, seed-lantern beacon, root-wrapped sunwell and amber brambles.

Full prompts, asset locations and integration details: `docs/art/environment-prompts.md`.

- `environment-crystals.webp`: original painted amber seals, arena formations, shattered stumps, and regrowing sprouts, created with the built-in image generation tool. Alpha preserved in the WebP conversion. Full prompt: `docs/art/amber-crystal-prompts.md`.

## 2.5D models and surfaces

`app/models-3d.ts` and `app/renderer-3d.ts` contain original procedural mesh models, joint animation, geometry, and generated surface textures created for Luma. Three.js is used under its MIT license. Existing original vistas are reused as distant matte paintings. No meshes or animations were copied or extracted from Metroid Dread, Prince of Persia, F.I.S.T., or the other reference games. Existing painted sprites remain available in the Canvas fallback.

### Licensed scanned environment and skeletal characters (11 October 2026)

The default renderer now uses the following locally bundled assets. The earlier procedural models remain as fallbacks and for creatures that have not yet received an art replacement.

| Adapted asset | Original source | License |
| --- | --- | --- |
| Thirteen moss-covered rock variants | [Rock Moss Set 01](https://polyhaven.com/a/rock_moss_set_01), [Rock Moss Set 02](https://polyhaven.com/a/rock_moss_set_02) | CC0 |
| Four fern variants | [Fern 02](https://polyhaven.com/a/fern_02) | CC0 |
| Tree stump | [Tree Stump 01](https://polyhaven.com/a/tree_stump_01) | CC0 |
| Optimized pine, variant A | [Pine Sapling Medium](https://polyhaven.com/a/pine_sapling_medium) | CC0 |
| Ground and cliff PBR maps | [Forest Ground 04](https://polyhaven.com/a/forest_ground_04), [Mossy Rock](https://polyhaven.com/a/mossy_rock) | CC0 |
| Luma skeletal rabbit | [Rabbit by CDmir, collaborator TinyWorlds](https://opengameart.org/content/rabbit-0) | CC0 |
| Briarhorn skeletal stag | [Old Deer Male by CDmir, collaborator TinyWorlds](https://opengameart.org/content/old-deer-male) | CC0 |

Poly Haven's [asset license](https://polyhaven.com/license) permits modification and redistribution, including with source projects. [CC0 1.0 dedication](https://creativecommons.org/publicdomain/zero/1.0/). Only asset files were used; website preview renders were not bundled.

Adaptations: geometry reduction, 1024px environment maps, JPEG/PNG compression, Blender-material conversion to glTF PBR, animation baking, removal of unused character clips, palette adjustments, and original Luma sword/scarf accessories. Pine A was reduced from 2,662,894 to 65,582 triangles. Rock meshes target about 2,200 triangles each; the stump about 6,000. Original source animations drive locomotion; code adds combat poses and transitions. No proprietary reference-game assets were extracted.

See `docs/art/3d-assets.md` for rendering references, production limits and preparation notes. File hashes and source mapping are in `public/art/3d/manifest.json`.
