# Eraser paper trampoline — first playable pass

Hold the eraser still on intact paper, let its depression grow, then release to bounce ordinary monsters. This is a general mechanic, with no new boss or permanent unlock.

## Input and commitment

- Right mouse / configured erase binding on PC; existing erase toggle or two-finger hold on touch.
- Start after 0.4 seconds within 10 screen pixels of the anchor. Deliberate rubbing resets the stationary timer and erases normally.
- Activation cancels queued paper wear. Once pressing, small drift does not erase walls, monsters or paper beneath the cursor.
- One canvas gesture at a time: drawing and active erasing resume after releasing or deliberately moving out of the dent.
- Actual release springs the paper. Cancel, lost capture, blur, pause, menus, run/wave transitions and resize cancel without launching anything.
- Begin on blank, intact paper, away from walls, the fort and directly erasable monster targets. Ordinary monsters standing above intact paper do not block a press. Existing erase targets keep their immediate response. Coated White Brothers tools and tutorials retain their existing interaction.

## Initial tuning

- Delay: 0.4 seconds. Radius: 28 to 90 pixels over 2.5 additional seconds, also bounded to one quarter of the shorter arena dimension.
- Depth: 5–22 pixels. Pull: 55–100 pixels/second, lower for exposed Chonks. No ink cost or duration limit.
- Only grounded, exposed ordinary enemies with a clear wall-free route into the dent are captured. Captured enemies remain damageable; freeze holds their position. Bosses, shielded enemies/allies, underground enemies, existing flights/hurdles and carried passengers are excluded.
- Release scatters captured enemies radially, with deterministic varied directions at the center. Flight travels approximately 35–58 pixels, rises 20–34 pixels and lasts 0.48 seconds. Landing deals 2 physical damage and causes a 0.25-second stumble. This is independent of paper-ball DPS.
- Flight stops at intervening walls and the fort, including newly drawn walls. There is no contact damage multiplier and no monster-on-monster impact damage.
- Existing wall damage and status effects remain effective. The player trades drawing/erasing time for crowd control.

## Animation work

1. **Press:** a paper-colored radial shadow deepens; bowed blue ruling lines and eight irregular-looking creases converge into the depression. Geometry follows actual radius/depth rather than a fixed circular hole sprite.
2. **Sink:** existing full monster artwork shifts down into the depression. Simulation pulls their actual positions; cosmetic depth does not change hitboxes.
3. **Release:** paper springs flat with a short fading elliptical ripple; existing monster sprites tumble through short arcs, then use their landing reaction. A single BOING caption and reused Boingus bounce sound play when enemies launch.
4. **Reduced motion:** retain the readable dent and essential displacement; omit flight height/tumbling and expanding ripple motion.

No new monster puppet parts or image sheets are required for the first pass. Environment geometry makes variable-size paper deformation possible while preserving existing character artwork. No visual RNG or combat particles are generated during rendering.

## Verification

Check real mouse and both touch eraser modes, stationary delay, drift/rub cancellation, bounded growth, wall-safe pull/launch, low landing damage, boss/shield/tunnel exclusions, pause/blur/capture/transition cancellation, flight resizing, reduced motion, render purity and normal erase behavior. Use desktop and phone browsers. Run the repository validation suite; let player testing guide strength and feel before expanding the mechanic.
