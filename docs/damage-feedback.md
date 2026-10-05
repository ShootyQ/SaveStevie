# Damage feedback design

## Goal

Make hits feel weighty while letting players read their build in motion,
including continuous elemental damage and crowded phone-sized fights.
Keep the existing doodle/paper style and combat mechanics.

## Visual sequence

1. First damage opens a compact paper popup above the target. A bold total
   counts up toward actual damage, with a colored stripe and damage-type rows.
2. A damped squash/pop settles in about 0.28 seconds. Larger amounts increase
   type size and punch; hits totaling at least 12 add five short impact rays.
3. During a 0.7-second collection window, subsequent types join the same burst.
   Each type retains its own subtotal. Pulses are debounced to 0.18 seconds
   and tiny ticks do not restart the animation.
4. The burst rises slowly and stays legible, fading over its final 0.55 seconds
   before expiring at 2.2 seconds. Lethal hits add a gold FINISH stamp.

## Readability and limits

Slate = physical; orange = fire; green = poison; blue = electric; gold = blast;
purple = void; cyan = thermal shock. Text labels supplement color.
Totals retain one decimal where useful and show <0.1 for tiny amounts.
The total briefly interpolates during count-up; breakdowns show recorded
actual damage. Finish never implies a critical-hit mechanic.

Placement reserves room for the maximum pop scale, clamps inside the playfield,
avoids the top HUD and bottom badges, and tries nearby unoccupied slots.
Newest bursts receive placement priority; older ones yield when crowded.
Keep at most 32 active damage bursts without evicting other game messages.
Browser reduced-motion preference disables pop, rotation, rays, and count-up.

## Implementation boundaries and validation

Use simulation time, so pause freezes animations. Never consume Math.random,
change damage formulas, or add animation state to enemy objects. WeakMap
ownership prevents burst references from leaking into new runs. Rendering
must not mutate game state. Preserve existing overkill and kill timing.

Validate combat/state/HUD parity against the original fixture, exact typed
aggregation and lethal damage, tween convergence, pulse debounce, lifetime,
reset isolation, bounded crowding, finite geometry, and render purity.
Inspect impact, settle, finish, and crowded scenes in real Chromium at desktop
and phone viewports. These checks do not substitute for physical Pixel testing.
