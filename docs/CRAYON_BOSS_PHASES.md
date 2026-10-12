# Count Crayon — wave 15, Alpha 0.1.53

Phase one is implemented as the repeating attack sequence below. Heat-seeking crayons are the next attack in that sequence, rather than a separate health-gated phase. Later health phases remain proposals.

## Paint, melt, move, raise, hunt

1. **Paint:** a short wind-up precedes six coloured routes branching outward in six directions and winding through different page regions in 0.32 seconds. All initial lines are harmless; exactly one carries melting wax and the other five are harmless decoys. Each new route rotates red, blue, green, purple, yellow.
2. **Melt:** after 0.5 seconds, thick melted wax follows the active route at 190px/s. Only the melt reaching Stevie causes the 10-damage hit. Two or three rubbing passes, chosen per route at creation, shorten its route. Back-and-forth motion of at least 12px, leaving the trail, or lifting the eraser allows another pass; same-direction pointer samples count once. Pale scrub marks show damage. After the final pass: the melt keeps moving until the remaining endpoint, then stops without hurting Stevie. Drawing an extension continues that same melt; erased wax gives no ink refund and briefly protects the paper below from rubbing.
3. **Quarter-turn:** after painting, Count Crayon moves roughly 90 degrees around the page over 1.6 seconds. Very short pages keep this movement on a safe flank. His body continues erasing contacted walls without explosions, healing or refunds.
4. **Raise crayons:** he parks for 5.3 seconds and lifts a crayon. Growing pools appear after a 0.7-second chant, then crawl upward into crayon minions after 3.3 seconds. Erase each pool twice before it finishes rising, or fight the emerged helpers normally. The first pass visibly removes a chunk; lift the eraser or leave its footprint before a second pass. Each spawned pool picks one of three custom shapes and one of five colours using combat RNG at creation. A custom four-pose crawl sheet shows hands grabbing the rim, elbows hauling, a belly drag and a hands-and-knees scramble. The newborn briefly keeps its crouch before standing; it no longer hops/wobbles out. Each helper has 26 HP, 75px/s movement and 7 contact damage; at most six are alive.
5. **Hunt:** a 0.8-second boss-centred warning precedes four to six erasable miniature crayon wizards bursting outward from his body at 260px/s for 0.65 seconds. They choose different flank waypoints, then approach Stevie while planning body-clear routes around live walls. They never phase through or damage cover; closed barriers keep them out until a gap opens. They travel at about 240px/s, deal 7 damage on fort contact and expire after eight seconds. The boss continues around Stevie during this attack, rather than returning to a corner route, then starts the next coloured fan.

## Return the matching colour

Cut the route first, then draw a free wax stroke (even with an empty ink tank; ordinary strokes still cost ink) from its surviving coloured wax to a matching shield wedge. Each of five colours has two opposite wedges, with circle/triangle/square/diamond/plus marks shared by the stub and shield for additional recognition. Curved strokes can approach a chosen wedge; the first shield contact counts, so drawing through a wrong wedge to a matching far side does not bypass the puzzle.

Wrong-colour attempts display a hint without consuming the stub. Each valid stub can return only once, including a zero-paid Freehand stroke. Wax follows the connected route live as you draw it, using the same travelling melt rather than starting a separate return packet. Free wax does not create player walls, refunds, or upgrade charges. A successful return deals 14% maximum boss HP and grants three seconds of normal paper-ball/direct damage. Otherwise shielding reduces ordinary damage to 8%. The coloured shield remains visible and is not removed by erasing.

Limits: twelve routes (decoys last six seconds), three growing pools, six raised helpers, eight flying minions and bounded live wax strokes. Cut stubs and refreshed extensions last up to twelve seconds. Successful return consumes the stub. Erasing seekers or pools gives no ink refund.

Control immunity prevents freeze, stun, slow, launch and sticky-note interruptions. Boss body contact does not damage Stevie. Pauses freeze the full sequence; wave/run reset and boss defeat clear all owned hazards and helpers. Reduced-motion mode keeps colour and growth cues while suppressing body shaking and wobble. Drawing reads state without changing combat or consuming randomness.

Until later health phases are implemented, defeating this sequence completes wave 15 normally.

## Later phase proposals

- Forked Tongue: branching routes with an erasable shared junction.
- Crayon Train: creatures ride tracks and skid off erased sections.
- Patch Patrol: a helper repairs interrupted routes, including redirected ones.
- Living Portrait: erase drawn body sections to remove abilities.
- Emergency Touch-Up: ghost outlines warn which erased section will return.

These are proposals, not shipped abilities.

## Acting and melting

Count Crayon uses his existing artwork as separate hat, torso and boot sections. Walking alternates boot steps and sways the robe and hat; painting sweeps a coloured crayon; raising helpers makes an upward pulling gesture. Travelling melt progressively collapses the body through full wizard, slumped torso and head-and-hat stages, with coloured wax beneath. A matching return restores his body with a short inflated wobble. The shield and combat radius stay fixed. Animation follows paused combat clocks, never changes combat state or uses RNG, and reduced motion keeps the readable body stages without wobbling.

Raised and flying minions share `assets/art/crayon-minions.png`, a custom transparent 4×5 sheet. Its five colour rows are red, blue, green, purple and yellow. Columns provide two walking poses, a flying pose and a raised-arms emergence pose. Walking frames follow the existing movement animation clock, freeze with control effects, and stay static under reduced motion. Flight and rising use their hazard clocks. Core artwork readiness includes the sheet.

`assets/art/crayon-crawl.png` contains four crawl poses in each of five colour rows. Poses follow the hatch clock, without render RNG or combat interruptions.
