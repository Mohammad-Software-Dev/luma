# 3D asset direction and provenance

The first 2.5D conversion used assembled primitive meshes. That established a working renderer, but did not meet the requested realistic finish. This pass introduces actual textured assets and skeletons instead of describing the prototype as finished artwork.

## References checked

- [Three.js official glTF example](https://threejs.org/examples/webgl_loader_gltf.html): glTF scene import, PBR materials and lighting.
- [Three.js skeletal animation blending example](https://threejs.org/examples/webgl_animation_skinning_blending.html): animation transitions on a skinned mesh.
- [Verdant Forest showcase](https://github.com/AlexLisong/verdant-forest-showcase): a useful forest composition/performance reference, linking the original author and X posts. Its code and assets were not copied.
- [Three.js X account](https://x.com/threejs): direct requests were blocked by X (including a 403 for a post). The live X feed was not successfully reviewed. Accessible official examples and primary project pages informed the work instead.

The commercial games named by the user remain presentation references. Their meshes and textures are not licensed assets for this project.

## Shipped selection

Seven CC0 Poly Haven asset sets provide scanned rocks, ferns, a stump, pine, forest floor and mossy stone. Two CC0 CDmir/TinyWorlds models provide a textured rabbit and stag with skeletal animation. Source links and licenses are listed in [the art credits](../../public/art/CREDITS.md). All runtime files are local; the game makes no requests to asset vendors.

The rabbit retains Luma's sunblade and rust-red scarf. Its supplied run, jump and alert clips crossfade; a procedural foreleg/body overlay follows the existing strike timer. The stag's existing idle/run/lowered-head/death clips are matched to Briarhorn's combat states. Neither character is a newly hand-sculpted production model, and the attack overlay is not motion-captured combat animation.

## Preparation

Environment sources were downloaded from the file URLs supplied by `https://api.polyhaven.com/files/<asset-id>`, choosing 1K glTF packages. Images were resized to a maximum of 1024px and recompressed. Rock and stump geometry was decimated in Blender with UVs retained, then exported as ordinary GLB. The source pine package was too large for a browser: only variant A is shipped, simplified with meshoptimizer using its `Prune` and `Permissive` flags, compacted vertices, and original UV/normal attributes. The near mesh has 65,582 triangles; the distant version has 11,920. Meshoptimizer 1.3.0 was used only during preparation. It needs no runtime mesh decoder.

Character conversion scripts are preserved in `scripts/art/convert-rabbit.py` and `convert-deer.py`. With the corresponding source `.blend` downloaded from the credited page:

```sh
blender --background --disable-autoexec --python scripts/art/convert-rabbit.py -- /path/to/rabbit.blend /tmp/rabbit.glb
blender --background --disable-autoexec --python scripts/art/convert-deer.py -- /path/to/deer.blend /tmp/deer.glb
```

The shipped rabbit additionally removes unused animation clips and compacts GLB buffers. Its opaque body/normal textures are JPEG; the fur cutout is an indexed-alpha PNG. Original source packages are not required to build or play.

## Art work still needed

The natural environment, Luma, and Briarhorn now use textured assets. Other guardians and regular enemies still use the first procedural rigs. They need individual modeled replacements with a coherent shared style, authored combat animation and clear attack silhouettes. Some shrine/ruin geometry is also still procedural. This is a substantial asset-pipeline upgrade, not a claim that the complete game now matches the production art of the commercial references.
