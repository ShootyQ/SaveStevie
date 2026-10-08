# Staple Snack (wave 10)

The existing 3.3-second paper-punch/crawl/snap entrance preserves cover and freezes
combat. Three health phases remain, but attacks now form sustained sequences.
Stevie stays stationary; every hit still has an ordinary ink counter.

| Phase | Sequences | Player decisions |
| --- | --- | --- |
| 100–70%, Classroom menace | Four staple stitches; double rush; paper punch into a relocated stitch | Replace worn cover between the four three-shot bursts. A rush crushes the intercepting wall, then leaps to another angle and warns again. Draw new ink during both warnings to jam his armor. Punch marks incoming cover, clears it, then leaps and warns the next volley. |
| 70–35%, Office supply riot | Nests first, then zipper into stitch, then clamp | Two nests warn and fire paired shots while the boss attacks. Draw through both to jam his armor. Zipper clears a lane, then warns a staple stitch: rebuild behind it. A new stroke across his held wall—or erasing it—jams the clamp and cancels its follow-up; ignoring it leads to a relocated stitch. |
| Below 35%, Jammed | Eight alternating misfire bursts; triple snap; three-burst overload | Maintain both marked firing lanes. Triple snap leaps to a different angle after each impact and warns all three separately. New ink during all three warnings jams his armor. Overload releases radial staples plus a focused pair in three timed bursts. |

Bursts use locked targets and origins; stitches/overload space their pulses by
0.65 seconds, retain the last burst cue while it flies, and misfires alternate every 0.5 seconds. Each charge has a full
1.05-second warning after its harmless 0.65-second repositioning leap. A wall
always absorbs a charge, even when destroyed. One old wall buys one impact;
it does not cancel the remaining sequence. Missed staples leave harmless pins,
but charging over an old pin no longer cancels the attack.

The boss takes 55% damage while armored. Jamming every snap, both nests or the
clamp causes a counter hit and opens a 2.4-second window with 1.8× incoming damage.
The jam returns up to 12 spent ink and pauses helpers during that window. Ordinary attack downtime does not expose him.
His HP is unchanged. He walks around the fort during short breaks; casts hold
position so their warning lines remain accurate. Repositioning leaps skip ink
contact and safely finish outside the fort if freeze or a phase change interrupts.

Phase changes clear projectiles, pressure and airborne helpers, interrupt casts,
stun existing helpers and give 2.8 seconds to rebuild, followed by 2.2 seconds
before the next warning. Cover-destroying warnings clear old boss shots. Nests
pause during cover destruction and misfires; minion contact warnings reset during
punch/zipper/clamp so removing cover cannot release an almost-complete bite.
Staple shots still cost walls eight HP and are absorbed even when breaking them.
No passive boss body damage: only a warned, unblocked rush hurts the fort.

## Jamling helpers

Standalone stitches spit two; punches two; their follow-up stitches add no extra pack; nest deployment and overload three. Each nest also
spits one after its second volley. Helpers visibly fly from their source to marked
landings for one second and wait 0.7 seconds before moving. They move 1.8× as fast
as before; helper HP and damage are unchanged. Airborne plus living helpers share
a six-helper cap. Contact still has a 1.3-second snap warning that cover interrupts.
Boss death clears helpers, shots and pending flights; helpers never enter normal
wave pools. Reduced motion removes flight spin and vertical leap motion.

## Verification

`node tests/validate.cjs` checks complete sequences and paid, replenished cover at
desktop, portrait and landscape sizes. Negative controls confirm unattended cover
fails sustained staples and blocking one old-wall charge leaves a damaging second
angle. Active counters prevent every double/triple snap, deal a counter hit and
open the armor window. Other checks cover nest/clamp counters, locked targeting,
helper caps, phase grace, freeze/pause/death, entrance and Count Crayon counters.

`node tests/browser-staple-boss.cjs` checks actual game updates, all phase warnings
and actions, airborne artwork, pause, reduced motion and rotation at four sizes.
The pressure comparison uses the actual game loop for 20 seconds with ordinary
starting ink and player HP: unattended cover loses, while timely paid counter
strokes survive without failing to pay for ink. Its separate long observation
run increases HP to keep phase one available.
