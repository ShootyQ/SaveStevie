# White Brothers character models

Wite-Out and Mr. Glue are monster characters, not ordinary animated bottles. Both use rough crayon/graphite torso artwork, jagged or dripping silhouettes, animated asymmetric eyes and fang jaws, jointed clawed limbs and independent props.

- Wite-Out: shorter, bristly dried-correction-fluid beast with torn blue belt, crooked cap and a brush. Mr. Glue's orange cap is stuck on his head.
- Mr. Glue: taller, lopsided sticky ogre with purple glue streaks, torn orange belt and a nozzle horn.

The two-column transparent torso atlas is `assets/art/white-brothers-torsos.png`. Animated faces and limbs are intentionally separate, not missing from the art. `js/white-brothers-rig.js` provides deterministic `create`, `act`, `update`, `pose` and `draw` methods with independent state per monster. Rendering never changes the models or consumes combat RNG. Reduced motion holds a representative action pose and suppresses breathing, bobbing and spinning effects.

Each model has nine actions: idle, walk, entrance, attack, throw, hit, dizzy, tantrum and defeat. Wite-Out winds and sweeps his brush; Mr. Glue squeezes his body and squirts a stream. Throw arcs, recoil, spiral eyes/stars, alternating stomps and flattened defeat are presentation only. Walk uses opposing feet and arm swing. The rig is ready for a later encounter system to drive these actions; this change does not replace or rebalance the final boss.

Preview on PC: Settings → Test a fight → Extras → White Brothers. On phone: Settings → Test a wave / boss → White Brothers. Select both or one brother, choose an action, toggle looping/showcase, pause, reset, choose half/normal/double speed or low motion. Browser reduced-motion preferences are always respected. Closing cancels the studio animation frame and returns through the existing Settings/pause stack. Blur/background pauses the studio.

Checks: `node tests/validate.cjs` includes rig finiteness, distinct actions, pure RNG-free drawing, timestep bounds and reduced motion. `node tests/browser-white-brothers.cjs` checks real artwork loading and all action buttons, individual selection, pause, low motion, unchanged combat state, reachable desktop/phone controls and close-to-Settings behavior.
