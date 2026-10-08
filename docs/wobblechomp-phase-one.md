# Wobblechomp: wave 10, phases one and two

Wave 10 now replaces Staple Snack with Wobblechomp. After the timer and remaining
monsters clear, combat, ink regeneration and wall aging stop. He stomps in from
the side, the camera zooms for his roar, then Wobblechomp Fight V5 starts. Existing
boss stomp/roar recordings are reused.
Walls survive his entrance. Pausing/backgrounding stops the entrance; reduced
motion removes the zoom. Scratch Page’s wave-10 boss shortcut starts combat directly.

Detaching the arm, spiky leg and eye stalk starts **phase two**. Four player-directed spike splats win the encounter and award the boss kill before a friendly repair scene. Phase three is a friendly post-victory repair scene: the player redraws his appendages, they attach, and he walks off happy.

## Draw and defend

- Punch: red aiming line, distant extending fist, then 12 damage. A wall on the
  line blocks it and takes 22 damage, stunning him for three seconds. The arm
  stays cuttable during that stun. Each punch permits one arm cut: cutting ends the stun, and the next punch exposes the second cut.
- Spikes: raised foot, then five real aimed spikes. Each deals 6 damage;
  cover intercepts them and takes 4 damage. The boss stays planted for the kick, which runs at 1× preview speed (about 2.1 seconds), then gives a 2.2-second follow-up after its first cut. Removing the leg stops these volleys.
- Teeth: shake, staggered airborne launch of 6–10 doodles, marked landings,
  landings scattered across the page at least 95 pixels from the fort,
  bounce/pause, then scurry. Each tooth warns for 1.2 seconds before one 7-damage
  bite. Base tooth HP is 6 (11.4 on wave 10). Blocked teeth take wall ink damage and chew for 3 damage every 0.65 seconds; frozen teeth still take ink damage but cannot chew. Cover, killing, freeze and stun answer the bite. At most ten helpers live.
- Beam: one laser sweeps between up to six existing drawings, leaving fading cosmetic scorch marks. It starts erasing after 0.45
  seconds, removing another every 0.18 seconds. Earlier cuts save more walls.
  No player damage or ink stealing. Cutting the stalk cancels its beam. It remains cuttable for 1.2 seconds after the beam ends, with the boss held still.
- Roll: tuck, marked orbit route, fast movement, three spaced spike bursts and
  three tooth drops. No leg means no rolling spikes; teeth remain available.
  Joints are hidden while tucked. The phase-one rolling body passes through walls without consuming them; its projectiles can still be blocked. Walking continues to avoid walls, and phase-two rolls ride drawings. Boss body contact never damages Stevie.

Slash through the **visible green ring** on the stalk or spiky leg and release. Their full 18-pixel ring is a cut target, rather than only the tiny joint line. Arm cuts accept the same full ring, including the second cut on a later punch. Every paid cut slash must be at least 12 pixels long. Each appendage needs two
separate paid strokes. The first cut interrupts that part and opens a 1.6-second
second-cut opportunity (2.2 seconds for the leg); the arm instead needs a second punch. Repeated crossings
and copied lines count once per released stroke. Existing walls do not cut.
Only affordable stroke geometry can cut. Ordinary ink damage helps, but cannot
finish the boss without detaching all three parts. Each cut removes 16% of max HP;
the sixth finishes phase one. Damaging inks and normal tool upgrades still work.

## Playtest tuning

`js/wobblechomp-boss.js` runs the animation rig at **1.45×** (foot: **1×**, eye beam: **1.9×**) its inspection speed.
The opening delay is 1.4 seconds; recoveries between attacks are 0.35 seconds.
The chain is punch → spikes → teeth → beam → punch → roll → spikes → beam,
skipping detached parts. On desktop he orbits the fort between attacks (110 px/s), moves
during recoveries (95 px/s) and rolls at 280 px/s. Projectiles are capped at 32.
The body renders at 54.4 pixels wide, with the entire modular silhouette
shrunk further than King Doodle-Doom’s body width. It stays at least 95 pixels
from the fort boundary on roomy pages, adapting to side-lane width on narrow phones. Portrait pages use top/bottom attack positions and side transit lanes; short
landscape pages use a side rail. Ordinary movement tries to slide around cover. A trapped boss samples movement every 0.35 seconds, warns when progress stalls,
and smashes a nearby trapping wall after about 0.7 seconds of stalled progress. This does not run during a block stun or second-cut opening. Punches stop visually at the first cover hit, including when
that hit destroys the wall. Spikes travel
at 180 px/s, tooth helpers walk at 45 px/s, and the boss holds still during the
follow-up windows (1.6 seconds for the eye, 2.2 for the leg; the arm needs a second punch). Lower `pace` if playtests need more reaction time. Tooth bite warning time
is separate from animation speed. Real phone testing should assess touch speed.

## Verification

- `node tests/validate.cjs`: paid/copy/old/unpaid/paused cuts, six-cut handoff, infinite ink without numeric infinity, bounded bumpers and four-hit ricochet victory,
  real punch/spike cover, fan count, beam targets/no ink theft/no player damage,
  tooth launch/warnings/freeze, roll hazards and cleanup, attack cadence and caps.
- `NODE_PATH=/opt/codex/cua_node/lib/node_modules node tests/browser-wobblechomp-fight.cjs`:
  desktop, two portrait phone sizes and landscape; frozen/pauseable entrance,
  all five attacks, real mouse/touch paid cuts and normal reward progression.
- Existing modular preview, menu and animation checks remain separate.

Detached parts use page coordinates: they fall, settle and stay where they land even when he moves, turns or rolls. Resize translates them with the page. Movement tries clear routes around drawing corners before the warned trap breakout.

Scratch Page tests offer **Restart test · same build** from pause, defeat, wave-clear and victory screens. Restart restores the selected starting wave, tool, upgrades and Notebook choice with full health and ink; it stays unranked. Returning to the menu ends the active test, while Settings retains Repeat last test for the session.

`tests/browser-wobblechomp-effects.cjs` checks one rendered laser, scorch marks, fixed fallen parts, pause and pure rendering at four viewports. `tests/browser-test-lab.cjs` exercises same-build restarts from pause, defeat, wave clear and campaign victory.

Portrait phones alternate attack positions above and below Stevie, with side routes around the fort and side rolls. Attacks wait until he is at least 145 pixels above/below Stevie. The side margin is 24 pixels; keepout stays 95 pixels on roomy phone pages and adapts to the available side-lane width on narrow pages (79 pixels on a 320-pixel canvas). Desktop movement is unchanged.

Tall desktop pages reserve space below the HUD and all three instruction lines for the complete upright stalk. The same top boundary applies to the entrance, idle movement, rolls, wall routes and resize recovery.

## Phase two: doodle rails

The detached spiky foot drains into an ink pot over 1.6 seconds. The pot becomes unlimited only after all six cuts; the ink bar shows ∞ while stored ink remains a finite max-ink value. Existing perks and saved progression stay intact.

After a 2.2-second tuck warning, Wobblechomp rolls at 175 px/s (145 on narrow pages). Draw lines to guide his roll toward the marked fallen spiky foot. He follows the tangent that best matches his incoming movement (stroke order breaks a perpendicular tie), rides around bends with bounded corner offsets, and rolls off the end at normal speed. A redirected roll remains eligible to score for six seconds; naturally bouncing into the foot does not score. Each rail stays solid during the ride and is consumed on exit, spike impact, or an interruption at the page edge/fort. If the rail is erased or expires, he releases immediately. Each of the four spike hits requires another line ride. Ordinary damage cannot bypass this phase. The fort harmlessly deflects his body; two warned tooth helpers spawn every 4.5 seconds with the existing ten-helper cap.

Unlimited strokes cost no ink, do not spend or earn Freehand bank charge, and cannot refund ink through closed loops. New bumpers last at most ten seconds and are capped at forty including copied lines. Death, victory and leaving the run restore normal ink rules. Pause stops the roll and siphon; rendering is pure.

The walking rig follows actual travel distance, with squash, lean, swinging limbs and a stronger hop when the leg is missing. Blocked movement does not advance the stride, and reduced motion suppresses decorative gait. The preview includes a Wonky walk toggle. Ink in the foot and pot uses canvas overlays on the existing atlas; no extra asset download.

## Friendly finale

The fourth spike splat grants the boss kill and victory music once. Combat stops immediately, and the ordinary last-monster pop is replaced by Wobblechomp asking for help. The player can continue directly or draw three parts in separate boxes. First strokes start at the shoulder, hip or stalk-base marker. Strokes are colored yellow with black outlines, closed shapes gain orange spots, and the stalk gets an eye at its tip. Each submitted drawing attaches to the body; all three remain visible during his happy walk away. Normal wave-clear rewards follow departure.

Drawing costs no ink and uses no combat RNG. Each part is bounded to sixteen strokes of four hundred points. Cancelled pointers discard unfinished strokes, and reset/menu/death clears the scene. Pause, hidden tabs and app backgrounding hold the celebration. A keyboard-accessible Stevie doodle button supplies each part, and Tab stays inside the dialog. The friendly scene does not change saved progression or award another kill.
