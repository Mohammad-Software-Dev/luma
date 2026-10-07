# Whisper Falls showcase — 7 October 2026

## Design

The campaign audit identified repeated terrace layouts and boss attacks that were disconnected from each stage's traversal. This update makes the Falls' currents useful through exploration, a traversal trial, combat, and the guardian encounter.

| Area | Purpose | Player action |
| --- | --- | --- |
| Whisper Falls | Safe introduction | Hold jump inside the first fountain; release to land on a stepping stone. Continue toward Sun Dash. |
| The Spillway | Timing and optional exploration | Ride a pulsing lift to the raised beacon shelf. Take the western current into a high alcove for the Riverheart. |
| Torrent Stair | Combine movement and combat | Ride upward toward the elevated sentry, or use the ordinary terrace route. Clear all creatures and light the beacon. |
| Tidewing's Basin | Apply the learned mechanic under pressure | Watch the flood warning, ride a current or climb to safety, then approach the guardian during recovery. |

Currents preserve stronger upward jump momentum rather than slowing it down. Releasing jump returns normal gravity. The pulsing lift flows for 64% of its 5.5-second cycle, rests, then visibly rises for the final 16%. Existing floor islands provide a place to wait. Decorative reduced-motion settings stop ribbon animation while retaining the current's state and essential flood cue. Keyboard remapping, controller A, and the existing touch jump input all use the same held-jump behavior.

The Riverheart grants 20 light once and doubles dash cooldown recovery while actively riding. It does not require a new save format: its discovery is validated and stored alongside the other memories. Existing discoveries, boss victories, and checkpoint progress remain valid. The optional ledge is appended to the platform list to preserve IDs of existing collectible motes.

Tidewing cycles fan, rain, and flood attacks, with its existing phase change. The flood gives a 1.8-second warning and lasts 2.6 seconds; water below y=620 threatens a grounded player. Currents and raised platforms provide escape options. A 2.8-second recovery follows; Tidewing descends toward melee height. Gentle Journey increases warning by 35% and recovery by 40%. Death and phase changes cancel the active flood through the boss state machine.

## Verification

The 113-check gameplay suite passes. The campaign audit drives real physics through all six trials, their beacons and exits, early exploration beacons, and all six gauntlet terrace routes. Most geometry checks disable enemies and hazards to isolate reachability. The new Spillway check retains timed hazards, disables its sentry, and reaches the Riverheart, beacon, and eastern exit with five hearts and no double jump.

All six guardians retain their existing attack/recovery counterplay checks; those isolate attacking from dodging. Separate full-fight bots defeat Briarhorn and Tidewing with five hearts and no immunity override. The Tidewing bot uses normal movement, current riding, Sun Dash, and repeated attacks/parries. These simulations establish a viable route and combat strategy, not human difficulty or completion-time estimates.

Additional checks cover current pulse states, release-to-land behavior, preserving jump momentum, one-time reward and save persistence, dash recovery, flood damage boundaries, a complete flood escape without immunity, death reset, and Gentle Journey timings. TypeScript and production build checks accompany them.

Browser review uses `/benchmarks/render.html`: “Spillway current” starts beside the optional lift, “Ride / release current” toggles held jump, and “Tidewing flood” previews the fight from its flood cycle. “Freeze flood preview” pauses after four seconds of real simulation for visual inspection. These review controls are development-only and do not write adventure progress.

## Local rendering sample

The live Tidewing benchmark starts on the flood cycle with Luma riding the left current, so the sample includes the warning, active water, and recovery. In the same local in-app browser at 1280×720 CSS pixels, DPR 2, and a 1920×1080 backing canvas, 479 warm frames measured a **16.7 ms median**, **18.6 ms p95**, and **zero frames over 25 ms**. CPU simulation plus draw submission measured 1.1 ms median and 1.7 ms p95. Two fixed 1/120-second updates run per frame; the harness uses player immunity for sampling only. This is approximately 60 fps on this machine, not a guarantee on slower devices. The final visual adjustment removes the flood's vertical outline.

Use “Benchmark Tidewing” in the review page to repeat this sample. Keep the tab visible. Results are rendered in the page header, and no adventure progress is saved.

## Remaining player evaluation

A full human campaign playthrough and completion-time measurement remain outstanding. The most useful feedback is whether current entry feels clear, how often the pulsing lift causes a missed landing, whether the Riverheart is discoverable, and whether Tidewing's warning leaves enough time from different arena positions. Physical controller, touch, audio, and lower-end-device performance still need hardware testing.
