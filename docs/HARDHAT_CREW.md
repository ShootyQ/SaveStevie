# The hard-hat doodle crew — Alpha 0.1.24

Yank Doodle enters the pool at wave 11; Rip-Raff at wave 14. Each type is capped at one living enemy. Both use ordinary paper-ball and ink damage and pause with the game. They have distinct transparent pencil-style artwork, directional facing, walking motion and job poses. Their jobs replace running straight into Stevie.

## Yank Doodle

Finds a nearby wall, shows an erasable rope during a 1.1-second hook warning, then pulls the wall away from Stevie over 1.2 seconds, up to 72 pixels. Walls retain HP, paid ink, effects and lifetime; movement replaces geometry so collision/render caches follow it. Pulls are bounded at page edges; already off-page loops can still be pulled, with the hooked point kept visible. Wobblechomp steering rails are excluded.

Erase the rope during the warning or pull to release the wall and stun the worker for one second. Erasing the target wall also releases it. Freeze or stun cancels the job. Surviving workers wait four seconds after a completed pull.

## Rip-Raff

Works about 195 pixels from Stevie. Shows a tear mark for 1.3 seconds before making an outer entrance hole, then marks a closer bomb landing for 1.2 seconds. The paper fire bomb travels visibly for 0.9 seconds before opening the exit. It creates a hole rather than direct damage to Stevie.

Erase the tear mark or landing mark during windup to cancel the job and stun him. Erase the flying bomb to remove its fuse. Existing bombs remain airborne when their thrower dies, but disappear on the next wave. There are at most three bombs and six newly created crew holes per wave.

Hole positions use the existing safe-page/spacing limits; bomb exits also stay clear of the fort. Monsters use ordinary closer-exit checks, 30% entry decisions and warned emergence. Bosses never tunnel. Workers stay on the surface to keep their job tells visible. Erasing ahead of underground monsters still forces them out through the existing mechanic.

## Checks

`node tests/validate.cjs` covers spawn caps, actual displacement, rope/stale-target counters, warnings, pause, mark/fuse erasing, safe holes, ordinary tunnel eligibility, boss exclusion, caps and pure rendering.

`tests/browser-hardhat-crew.cjs` checks desktop and phone artwork, real mouse/touch eraser input, rope cancellation and actual hole creation. `node scripts/build-site.cjs` verifies packaged asset coverage.
