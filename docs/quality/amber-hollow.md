# Amber Hollow showcase — 7 October 2026

## Stage design

Amber Hollow now connects traversal and combat through breakable crystal formations. The existing exploration thorns introduce Sun Dash; Ember Veins requires two seals along its elevated route before the trial beacon can activate. Crystal Ascent adds an optional eastern alcove with a third seal and the Emberheart. The new platform is appended to preserve existing collectible IDs.

Emberheart grants 20 light once and adds one damage to the third combo strike against a recovering guardian. It does not bypass guards or affect ordinary enemies. The map records its story and supplies a clue before discovery.

Amberback's charges can collide with formations at x=1080 and x=1780. The crash cancels contact damage for that update and exposes a 3.2-second counter window (4.48 seconds in Gentle Journey). The collision itself does no boss damage: the player must approach and strike. Formations regrow after nine seconds, showing sprouts during the final two seconds. Death resets arena formations; trail seals stay broken. Existing beacon and guardian progress remains valid.

The painted atlas has separate intact, shattered, and regrowing states with preserved transparency. It is loaded once; drawing uses source rectangles without per-frame filters. Reduced motion suppresses impact shake while retaining essential attack and regrowth cues.

## Verification

All 122 gameplay checks pass, alongside TypeScript and the production build. New checks cover walking versus dashing into seals, swept collision through a whole formation, required trial seals, save validation and reload, an actual jump-and-dash route to the alcove, reward damage boundaries, both charge directions, regrowth and death reset, and accessibility timings.

A full Amberback simulation wins with five hearts, normal movement and attacks, and no immunity override or Emberheart damage upgrade. It actually triggers crystal crashes. The bot moves away after eruption aim locks and stays clear until the eruption ends. Geometry tests disable enemies and hazards to isolate reachability; the full boss fight retains its combat hazards. These checks establish viable routes and strategies, not human difficulty or campaign duration.

Browser review inspected the intact seal and a paused real crash, including the painted stump and separated combat labels. No browser console errors were captured. Development-only controls at `/benchmarks/render.html` include Ember Veins seals, Freeze crystal crash, and Benchmark Amberback; they never save adventure progress and are excluded from the production build.

## Local performance

At 1280×720 CSS pixels, DPR 2, and a 1920×1080 backing canvas, the Amberback benchmark recorded 479 warm frames: 16.7 ms median, 17.7 ms p95, and one frame above 25 ms. CPU simulation plus draw submission was 1.0 ms median and 1.6 ms p95. The sample starts with a charge aimed toward the left formation, includes two 1/120-second updates per frame, and uses player immunity solely for measurement. This is approximately 60 fps locally, not a guarantee for other hardware.

Remaining evaluation: human route readability and difficulty, full campaign duration, lower-end devices, physical controllers, touch, and audio.
