# Wobblechomp: rip, roll, repair

Wave 10 clears old cover during Wobblechomp's entrance roar, then starts his
own soundtrack. Pause and app backgrounding stop the entrance and combat.
Scratch Page boss tests skip directly to combat and preserve the selected build.

## Phase one: counter and detach

His body shreds every wall it touches, including swept movement through several
walls. Removal creates paper scraps without Blast explosions, refunds, healing
or status effects. Refuge clearance still keeps him away from Stevie. Walls
continue to block projectiles and punches.

- Block his warned fist: cover takes 22 damage, opening the arm.
- Block a foot spike: cover takes 4 damage, opening the foot.
- Draw across the live sweeping laser: it stops erasing walls and opens the eye.
- Teeth scatter to warned landings away from the fort; block or kill them.
- His tuck-and-roll follows a warned route, shredding cover and firing hazards.

Each counter holds him for three seconds and presents an enlarged appendage
with a 27-pixel green cut ring and a longer visible stitch seam. A paid slash of
at least 12 pixels through that ring cuts once. An appendage requires two
separate countered attacks; copies, old walls and repeated crossings cannot
supply extra cuts. A successful rip briefly holds him for a reaction, and the
second cut sends the enlarged part flying to its own location on the page.

The body renders at 64 pixels wide. The modular limbs grow during attacks and
counter openings. Phone movement keeps top/bottom attack positions and side
transit lanes. The body never deals unavoidable contact damage to Stevie.
Ordinary damage cannot skip the six-cut requirement.

## Phase two: doodle pinball

The detached ink-filled foot fills an unlimited ink pot. Six cuts clear all
remaining cover, helper teeth, shots, paper throws and lingering ink fields.
After a tuck and launch warning he rolls at 175 pixels/second (145 on narrow
pages). Stored ink remains a finite max-ink number while the bar displays ∞.

Draw a curve into his rolling path. The longer remaining side determines his
travel direction, independent of drawing order; a preview shows the path and
exit direction. He enters at normal movement speed rather than snapping
sideways, follows the curve and consumes ink behind him. On exit, erasing,
expiry or an arena-edge/fort interruption he releases the rail. The body
harmlessly rebounds around the arena after a miss.

All three fallen parts are enlarged, glowing targets. Each needs one guided
bonk; used parts dim and cannot score again. Each successful bonk gives a brief
reaction pause and rebound. Three distinct hits win the battle once.

During this puzzle, steering strokes are single plain rails. Double/Triple
Line, stitching, paper throws and elemental control effects cannot interfere
with steering. The build is retained for subsequent waves. Rails last at most
ten seconds and at most forty remain active. Unreleased strokes are previews;
they become catchable on release. No additional tooth packs spawn in this phase.

## Friendly finale

Victory and its music are earned before the repair scene. Wobble asks for an
arm, leg and eye stalk. The drawing canvas contains the same puppet, at the same
scale and handedness as the attached result. First strokes begin at the actual
current joint; a faint optional guide suggests a shape. Input appears directly
on the body, automatically outlined in black and colored yellow. Closed shapes
receive orange spots; an eye appears at the stalk tip.

Custom strokes remain rooted to the moving puppet joints through attachment
reactions and the final happy walk. The player can redraw, use Stevie's preset,
or skip the celebration. Sixteen strokes of four hundred points per part bound
input. Pause, hidden tabs and backgrounding hold the scene. Menu/reset clears
it; the earned kill and saved progression are never duplicated.

## Verification

`node tests/validate.cjs` exercises paid cuts, counter exclusivity, phase handoff,
rail directions/bends/consumption, distinct target victory, pause/resize and
reward progression. `node tests/wobblechomp-animation.cjs` covers every missing
part combination and the modular animation rig. Browser fight checks use actual
mouse/touch input at desktop, two portrait phone sizes and landscape sizes.
Android device testing remains useful for reaction timing and balance.
