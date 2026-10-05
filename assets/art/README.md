# Math-class doodle assets

Original artwork generated for Save Stevie on 2026-10-05, then cleaned with
image generation to isolate the approved designs without surrounding glow.
The transparent atlas was exported as individually cropped, trimmed PNGs
with a four-pixel transparent border. Colored-pencil texture and imperfect pen
outlines are intentional.

Stevie is exported at up to 384px, the sniper at 256px, other characters/pencil
at 192px, and wall elements/arrows at 128px (before borders). The initial nine PNGs together are
roughly 620 KiB. Status-tinted sprite combinations use a bounded 32-entry cache. No source atlas is downloaded during play.

- stevie.png: player and splash
- grunt.png, sniper.png, splitter.png, tank.png: corresponding enemies
- pencil.png: splash and pencil upgrade icons
- fire.png, frost.png, poison.png: wall decorations and ink upgrade icons

The renderer uses fixed display sizes independent of image loading or status
tints. These assets do not change collisions, damage, spawning, or random draws.
New artwork for the remaining enemy roster and separate animation-frame sheets
can be added later.

A second six-asset sheet adds arrow.png, bouncer.png, flanker.png, wardling.png,
sprinter.png, and brood.png. It uses the same approved colored-pencil texture
and pen strokes. The five new monsters are exported at 192px and the arrow at
128px, before borders. Arrow drawing is 30 CSS pixels wide, rotated to its
velocity with its tip aligned to the collision point. Remaining enemy types
continue to use their current art until another dedicated asset is added.

Stevie animations use one 512×272 transparent atlas (stevie-animations.png),
with four 128×136 idle cells on top and four throwing cells below. Fixed cell
anchors keep his feet planted. The simulation advances a presentation-only
clock; actual rock launches trigger a target-facing throw, shortened for faster
rock upgrades. Pause freezes the frames, wave starts reset them, and reduced
motion uses the neutral pose. Missing atlas loads fall back to stevie.png and
then the original vector drawing. The atlas costs about 173 KiB, loads once,
and requires just one sprite draw per frame.

A third six-enemy batch adds bulwark.png, medic.png, sapper.png, gnawer.png,
boss.png, and eraser.png. These are isolated transparent cutouts from a custom
scribbled sheet, exported at up to 192px (256px for bosses) with four-pixel
borders. Bulwark has a dented shield, Medic a cap and bag, Sapper tools, Gnawer
oversized teeth, Boss a wonky crown, and The Eraser a pink rubber body.
All use the existing bounded status-tint cache and opaque-body renderer and separate health bars.
The Eraser keeps its wobble; the Medic keeps its healing pulse. Missing images
retain the previous vector drawings. No combat rules or collision sizes change.

The final enemy batch adds fast.png (orange runner with sneakers), brute.png
(moss-green heavy arms), elite.png (magenta spikes), and mini.png (baby Splitter).
The transparent 2×2 sheet was separated into isolated sprites, removing stray
fragments of neighboring cells during export. Fast and Elite are exported at
192px, Brute at 256px, and Mini at 128px, plus four-pixel borders. All 19 enemy
types now have custom artwork. These four use the same health/status renderer,
fixed collision sizes, and missing-image vector fallback as other enemies.

The final elemental batch adds electric.png, blast.png, vampire.png, gravity.png,
repulsion.png, void.png, and chaos.png: bolt, explosion, fanged droplet, inward
spiral, outward arrows, dark portal, and multicolored die. Each is exported at
up to 128px with four-pixel transparent borders; the seven total about 172 KiB
on disk. All ten elemental inks now have matching card icons and wall glyphs.
The existing bounded phase cache draws pulsing Electric/Void, spinning Gravity,
and tumbling Chaos without per-glyph image allocations. Missing wall images
retain procedural effects; failed card images remove themselves. Card URLs
include the packaged build hash to refresh cached assets after deployment.

Enemy movement, hit reactions, and split animations reuse these PNGs; no extra
images or animation sheets are downloaded. Weak per-enemy presentation records
track travel-driven hops/lean and short hit squishes without modifying combat
state or using random numbers. Heavy types lumber; Fast and Mini hop higher.
Damage-over-time reactions are throttled to one every 180ms. Split parents
leave at most 20 fading, clipped echoes for 280ms while children spring visually;
children still spawn immediately at their original combat coordinates. Wave
starts clear presentation records, pauses freeze them, and reduced motion
removes them (including the custom Eraser wobble). Resize keeps echoes aligned
with the arena. The system allocates no new sprites or tint combinations.

Special-action frames add sniper-ready/fire, sapper-ready/strike, medic-ready/heal,
and Stevie flinch/cheer-a/cheer-b PNGs (about 328 KiB total on disk). Each pair
uses a common scale and fixed transparent canvas with aligned feet, exported
from a custom nine-pose sheet. The Sniper retains its pencil launcher.
Readiness requires a clear, close shot; firing follows actual projectile
creation. Sappers prepare while touching walls, then strike on actual wall
hits. Medics animate only after healing an injured nearby ally, and their
custom range pulse stops when inactive, frozen, or stunned. Alternate poses
share the existing 32-entry status-tint cache and fixed combat bounds.

Stevie's flinch follows actual damage and takes priority over rock throwing.
A short cheer appears in the arena and a dedicated transparent wave-clear
portrait; the presentation clock advances during the wave break while combat
stays stopped. Manual pause and upgrade/specialization screens freeze it.
After 1.2 seconds Stevie settles into a happy pose until the next wave resets
his presentation state. Reduced motion uses neutral art. Missing pose images
fall back to the existing base drawings/idle atlas. No damage, healing,
projectile timing, scoring, random draws, or collision coordinates change.

Damaged monsters retain their full body artwork and opacity. Health now changes
only the separate bar; status colors tint the entire body. This applies to all
base sprites, action poses, bosses, and vector fallbacks. Transient split echoes
still fade as they expire; living monsters do not fade with damage.
