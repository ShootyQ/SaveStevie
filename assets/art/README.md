# Math-class doodle assets

Original artwork generated for Save Stevie on 2026-10-05, then cleaned with
image generation to isolate the approved designs without surrounding glow.
The transparent atlas was exported as nine individually cropped, trimmed PNGs
with a four-pixel transparent border. Colored-pencil texture and imperfect pen
outlines are intentional.

Stevie is exported at up to 384px, the sniper at 256px, other characters/pencil
at 192px, and wall elements at 128px (before borders). The PNGs together are
roughly 620 KiB. Status-tinted sprite combinations use a bounded 32-entry cache. No source atlas is downloaded during play.

- stevie.png: player and splash
- grunt.png, sniper.png, splitter.png, tank.png: corresponding enemies
- pencil.png: splash and pencil upgrade icons
- fire.png, frost.png, poison.png: wall decorations and ink upgrade icons

The renderer uses fixed display sizes independent of image loading or status
tints. These assets do not change collisions, damage, spawning, or random draws.
New artwork for the remaining enemy roster and separate animation-frame sheets
can be added later.
