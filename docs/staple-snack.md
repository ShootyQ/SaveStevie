# Staple Snack (wave 10)

After the timed fight and survivor cleanup, combat and music pause for a 3.3-second
paper-punch, crawl and double-clack entrance. Existing walls remain. The camera
briefly closes in; reduced motion keeps it still. Chapter 2 music resumes for combat;
the existing paper shuffle and impact sounds provide the entrance/click cues.

| Phase | Moves | Defensive response |
| --- | --- | --- |
| 100–70%, Classroom menace | Staple fan; two-leg ricochet rush; paper punch | Ordinary walls absorb the fan. Any live wall stops a rush and exposes him. Punch marks a wall area, destroys nearby cover, then leaves a rebuild window; it does not damage Stevie. |
| 70–35%, Office supply riot | Traveling wall zipper; clamp-and-drag; two staple nests | Draw behind the zipper. A new stroke crossing the held wall releases the clamp; erasing it also works. Draw through a nest to jam it. Every nest shot has a locked aiming warning and ordinary cover blocks it. |
| Below 35%, Jammed | Alternating two-lane misfire barrage; three separately warned snaps; radial jam explosion | Cover the marked lanes. Each snap commits to its warning; stopping the first two still leaves a warned follow-up. Draw cover during the two-second jam warning, then use his long recovery. |

Phase transitions clear boss projectiles and pressure objects, interrupt casts,
stun existing helpers and give 2.8 seconds to rebuild. The boss waits a further
2.2 seconds before a new cast. Staple shots cost an intercepting wall eight HP; that shot is absorbed even if
it breaks the wall. Cover-destroying casts clear old staple shots. Nests pause firing while the zipper, clamp,
misfires or jam explosion are active. No passive Staple Snack body contact damage:
only a warned, unblocked rush can damage the fort.

The boss circles the fort at 2.3 times his base walking speed between casts and
during recovery. Cooldown and recovery run together rather than creating two
consecutive waits. Casts hold position to preserve their locked warning lines.
If cover blocks his orbit, he tries the reverse arc or an outward step.

## Jamling helpers

Misshapen silver/rust staple tangles hop toward the fort and chew walls slowly.
Staple Snack spits out one after a fan and two after a paper punch, nest deployment
or jam explosion. Nests also eject one after every second volley. There is no
independent summon timer. Each helper flies from its source for one second toward
a marked landing outside the fort, then waits 0.7 seconds before moving. Living
helpers and airborne deployments together are capped at six. Phase changes cancel
airborne deployments; boss death clears them. Contact has a
1.3-second visible snap windup; cover interrupts it. Defeating the boss clears his
helpers and shots. They never join the ordinary random wave pool.

Staples that miss and reach the page edge stick as harmless pins, capped at eight.
Drawing through a pin clears it; charging into one jams the boss.

## Count Crayon fairness correction

Rune warnings show their casting lane. A wall across that lane cancels the rune,
including a rune targeting inside the fort. Existing draw-through cancellation
still works. Body contact now has a 1.3-second warning and cover interrupts it.

## Verification

`node tests/validate.cjs` covers paid starting-pencil counters for all nine moves
at desktop, portrait and landscape sizes, unblocked damage, targeting locks,
helper limits, phase grace, interruption, cleanup, contact/rune counters and the
entrance. `node tests/browser-staple-boss.cjs` checks actual artwork, every phase,
telegraphs, pause, reduced motion and viewport rotation. Existing boss encounter
browser tests cover the preserved first-boss mechanics.
