# Wobblechomp: hungry duel, ricochet showdown, optional friend

Alpha 0.1.74 replaces the six-cut checklist and harmless rail puzzle. The
modular art and attack animations are reused, with a rolling entrance, bounce,
full-body splat, unfold and roar. The roar clears old cover without ink procs.

## Hungry duel

Normal paper damage and direct elemental damage advance the fight. Outside
conditions cannot stun, freeze, slow, burn, poison or reposition him. Elemental
paper-note ranks add a small immediate hit instead of applying their conditions.
Ordinary boss damage budgets still prevent instant phase skipping. At 45% HP,
remaining appendages fly off and the showdown starts; cutting is optional.

Attacks are randomly selected from remaining usable weapons, teeth, rolling
and (when there is cover) gulping, without immediately repeating the previous
attack. A missing arm removes punches; a missing foot removes spike volleys;
a missing eye removes the attached laser. Existing tooth warnings and caps
remain. His body shreds touched walls and takes one impact hit per 0.7 seconds,
without triggering wall explosions, kill refunds or healing.

Blocking a punch or foot spike, or drawing across the firing eye beam, earns
three seconds of his own stun and a large 32px cut ring. A single paid released
stroke through the exposed seam detaches it and deals 7% maximum HP damage,
clamped at the handoff. Paused, unpaid, old and duplicate strokes cannot cut.
The attack counter itself also damages him. You can use the opening for paper
hits rather than severing the weapon.

Gulp warns a targeted wall for 1.25 seconds. Erase his snack to deny the burp
and earn an opening. Let him swallow an inked wall to inflict immediate snack
damage, at the price of a blockable three-shot burp. Either outcome exposes one
remaining limb. Both eye lasers erase walls their visible beam actually crosses.

## Ricochet showdown

The transition clears old cover, owned teeth and shots, but retains the player's
build and ink effects. A quarter of healthy cover's remaining paid ink returns
to the tank, giving the new course a clean page without an automatic refill. Three dropped targets have distinct silhouettes, colored rings
and labels:

- **Spiked foot:** every body collision deals one quarter of the showdown meter.
  Four hits win. Each launches him in a spinning, arcing flight to a distant side,
  followed by a squashy splat and recovery. No hidden 'recent rail' flag is needed.
- **Ink well:** one collision unlocks infinite ink for the rest of this fight.
  Until then, drawing spends ink normally. Finite stored stats and saved builds
  stay intact; the HUD shows infinity only after the unlock.
- **Fallen eye:** periodically warns a sweeping beam, then erases touched walls.
  One body collision shuts it off permanently. It causes no invisible damage
  to Stevie. Switch it off to protect a carefully prepared course.

A new charge starts at a distant staging position and warns its fixed direction
for 2.7 seconds. Portrait staging alternates top/bottom; desktop staging uses the
perimeter. Charges move at 245px/s on narrow pages and 310px/s elsewhere. A miss
can hit Stevie for 16 damage before armor, then sends Wobble away to recover.

The angle of a touched wall determines the physical reflection. The wall
crumbles immediately; multiple walls can form a course. Draft strokes do not
catch him until released. A live green preview uses the same collision and
reflection math. Boundaries produce a splat/recovery, not endless harmless
bouncing. Turret barriers are ignored. Existing turret disabling during actual
boss fights remains. Steering strokes are single plain walls; paper throws
continue, while phase-two body damage comes only from spike collisions.

## Victory

The fourth hit completes its flying splat before awarding one kill, score,
scraps and boss progress. The player may continue immediately or draw **one**
silly waving arm. Drawing anywhere beside the puppet produces a silhouette
rooted automatically to his shoulder, outlined in black, filled yellow and
spotted orange. A preset, redraw and skip remain available. His leg and eye
return automatically; the attached arm bends as he walks away.

## Checks

`node tests/validate.cjs` includes `tests/wobblechomp-overhaul.cjs`: actual counters
and paid cuts, damage handoff without cutting, weapon removal, wall-angle
reflections, finite/free ink, grounded laser collision/shutdown, charge damage,
four spike impacts, flight/recovery, single rewards and optional drawing, status
immunity, multiple aspect ratios, rendering purity, pause, resize and reset.
`tests/browser-wobble-overhaul.cjs` uses real canvas drawing on desktop and an
Android-sized portrait browser, including a full angled-wall charge into spikes
and a freely drawn, colored, attached arm. Device playtesting should tune pacing.
