# Count Crayon — wave 15, Alpha 0.1.45

Phase one is implemented as the repeating attack sequence below. Heat-seeking crayons are the next attack in that sequence, rather than a separate health-gated phase. Later health phases remain proposals.

## Paint, melt, move, raise, hunt

1. **Paint:** a short wind-up precedes a coloured route drawn toward the fort in 0.32 seconds. This thin initial line is harmless. Each new route rotates orange, blue, purple.
2. **Melt:** after 0.5 seconds, thick melted wax follows the route at 190px/s. Only the melt reaching Stevie causes the 10-damage hit. Erasing anywhere along the painted connection stops that melt and leaves a coloured stub; erased wax gives no ink refund and briefly protects the paper below from rubbing.
3. **Quarter-turn:** after painting, Count Crayon moves roughly 90 degrees around the page over 1.6 seconds. Very short pages keep this movement on a safe flank. His body continues erasing contacted walls without explosions, healing or refunds.
4. **Raise crayons:** he parks for 5.3 seconds and lifts a crayon. Growing pools appear after a 0.7-second chant, then crawl upward into crayon minions after 3.3 seconds. Erase a pool before it finishes rising, or fight the emerged helpers normally. Each helper has 26 HP and 7 contact damage; at most six are alive.
5. **Hunt:** a 0.8-second side-entry warning precedes up to four erasable heat-seeking crayons. They choose different flank waypoints, then approach Stevie while planning body-clear routes around live walls. They never phase through or damage cover; closed barriers keep them out until a gap opens. They travel at about 115px/s, deal 7 damage on fort contact and expire after eight seconds. The boss resumes moving during this attack, then starts the next coloured route.

## Return the matching colour

Cut the route first, then draw a real pencil stroke from its surviving coloured wax to a matching shield wedge. Each of three colours has two opposite wedges, with circle/triangle/square marks shared by the stub and shield for additional recognition. Curved strokes can approach a chosen wedge; the first shield contact counts, so drawing through a wrong wedge to a matching far side does not bypass the puzzle.

Wrong-colour attempts display a hint without consuming the stub. Each valid stub can return only once, including a zero-paid Freehand stroke. Wax follows the captured stroke and tracks the selected matching wedge if the boss moves before it arrives. A successful return deals 14% maximum boss HP and grants three seconds of normal paper-ball/direct damage. Otherwise shielding reduces ordinary damage to 8%. The coloured shield remains visible and is not removed by erasing.

Limits: two routes, three growing pools, six helpers, four side seekers and four returning packets. Cut stubs last up to nine seconds. Successful return consumes the stub. Erasing seekers or pools gives no ink refund.

Control immunity prevents freeze, stun, slow, launch and sticky-note interruptions. Boss body contact does not damage Stevie. Pauses freeze the full sequence; wave/run reset and boss defeat clear all owned hazards and helpers. Reduced-motion mode keeps colour and growth cues while suppressing body shaking and wobble. Drawing reads state without changing combat or consuming randomness.

Until later health phases are implemented, defeating this sequence completes wave 15 normally.

## Later phase proposals

- Forked Tongue: branching routes with an erasable shared junction.
- Crayon Train: creatures ride tracks and skid off erased sections.
- Patch Patrol: a helper repairs interrupted routes, including redirected ones.
- Living Portrait: erase drawn body sections to remove abilities.
- Emergency Touch-Up: ghost outlines warn which erased section will return.

These are proposals, not shipped abilities.
