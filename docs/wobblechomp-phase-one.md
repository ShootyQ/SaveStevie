# Wobblechomp: wave 10, phase one

Wave 10 now replaces Staple Snack with Wobblechomp. After the timer and remaining
monsters clear, combat, ink regeneration and wall aging stop. He stomps in from
the side, the camera zooms for his roar, then chapter music resumes. Existing
boss stomp/roar recordings are reused; this fight has no dedicated soundtrack yet.
Walls survive his entrance. Pausing/backgrounding stops the entrance; reduced
motion removes the zoom. Scratch Page’s wave-10 boss shortcut starts combat directly.

The first playable slice contains **phase one only**. Detaching the arm, spiky
leg and eye stalk wins the encounter and awards normal boss rewards. Future
phases will replace that temporary finish with their transitions.

## Draw and defend

- Punch: red aiming line, distant extending fist, then 12 damage. A wall on the
  line blocks it and takes 22 damage, stunning him for three seconds. The arm
  stays cuttable during that stun. Cutting the arm also interrupts its attack.
- Spikes: raised foot, then five real aimed spikes. Each deals 6 damage;
  cover intercepts them and takes 4 damage. Removing the leg stops these volleys.
- Teeth: shake, staggered airborne launch of 6–10 doodles, marked landings,
  landings scattered across the page at least 95 pixels from the fort,
  bounce/pause, then scurry. Each tooth warns for 1.2 seconds before one 7-damage
  bite. Cover, killing, freeze and stun answer the bite. At most ten helpers live.
- Beam: marks up to six existing drawings, then starts erasing after 0.45
  seconds, removing another every 0.18 seconds. Earlier cuts save more walls.
  No player damage or ink stealing. Cutting the stalk cancels its beam.
- Roll: tuck, marked orbit route, fast movement, three spaced spike bursts and
  three tooth drops. No leg means no rolling spikes; teeth remain available.
  Joints are hidden while tucked. Boss body contact never damages Stevie.

Draw across the **green-ringed joint** and release. Each appendage needs two
separate paid strokes. The first cut interrupts that part and opens a 1.6-second
second-cut opportunity; otherwise wait for its next attack. Repeated crossings
and copied lines count once per released stroke. Existing walls do not cut.
Only affordable stroke geometry can cut. Ordinary ink damage helps, but cannot
finish the boss without detaching all three parts. Each cut removes 16% of max HP;
the sixth finishes phase one. Damaging inks and normal tool upgrades still work.

## Playtest tuning

`js/wobblechomp-boss.js` runs the animation rig at **1.45×** (eye beam: **1.9×**) its inspection speed.
The opening delay is 1.4 seconds; recoveries between attacks are 0.35 seconds.
The chain is punch → spikes → teeth → beam → punch → roll → spikes → beam,
skipping detached parts. He orbits the fort between attacks (110 px/s), moves
during recoveries (95 px/s) and rolls at 280 px/s. Projectiles are capped at 32.
The body renders at 54.4 pixels wide, with the entire modular silhouette
shrunk further than King Doodle-Doom’s body width. It stays at least 95 pixels
from the fort boundary. Narrow portrait pages use a lower rail; short
landscape pages use a side rail. Ordinary movement tries to slide around cover. A trapped boss samples movement every 0.35 seconds, warns when progress stalls,
and smashes a nearby trapping wall after about 0.7 seconds of stalled progress. This does not run during a block stun or second-cut opening. Punches stop visually at the first cover hit, including when
that hit destroys the wall. Spikes travel
at 180 px/s, tooth helpers walk at 45 px/s, and the boss holds still during the
1.6-second second-cut window. Lower `pace` if playtests need more reaction time. Tooth bite warning time
is separate from animation speed. Real phone testing should assess touch speed.

## Verification

- `node tests/validate.cjs`: paid/copy/old/unpaid/paused cuts, six-cut victory,
  real punch/spike cover, fan count, beam targets/no ink theft/no player damage,
  tooth launch/warnings/freeze, roll hazards and cleanup, attack cadence and caps.
- `NODE_PATH=/opt/codex/cua_node/lib/node_modules node tests/browser-wobblechomp-fight.cjs`:
  desktop, two portrait phone sizes and landscape; frozen/pauseable entrance,
  all five attacks, real mouse/touch paid cuts and normal reward progression.
- Existing modular preview, menu and animation checks remain separate.
