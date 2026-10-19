# Bootstomp — animation art package

This package is an animation study, not an active boss encounter. It does not
replace Wobblechomp, change wave spawning, add boss damage, or load additional
artwork into the game. No release/version increment is needed for this
unexposed preparation. The existing eraser input fix remains Alpha 0.1.111.

## Inspecting the art

Serve the repository and open `docs/bootstomp-preview.html`. Select a connected
sequence or an individual clip, pause, scrub, or slow playback. Reduced motion
starts paused. The page works with a mouse or touch and uses no dependencies.
A short connected example is also saved as `docs/bootstomp-knockdown.gif`.

The preview draws complete frames from the atlases; it does not animate faces,
eyes, mouths or limbs as separate puppet pieces.

Six transparent source sheets contain 96 drawn poses. `animations.json`
catalogues 28 clips, five independent erase-state references, event cues and
whole-character registration. Source rectangles follow inspected transparent
gutters; generated sheets are not assumed to divide into perfect quarters.

| Sheet | Actions |
| --- | --- |
| `arrival.png` | Entrance steps, toe tap/knuckle challenge, idle, walking |
| `stomp.png` | Separate screen-left/right windups and successful impacts |
| `fall.png` | Bad footing, faceplant, roll into visible sprawl, struggling, getting up |
| `special.png` | Shoe scrape, tantrum steps, lace throw, lace rebound |
| `reaction.png` | Fallen rub flinch, completed-patch reaction, eight-pose defeat |
| `erasure.png` | Intact sprawl plus three progressively erased states for each of five parts |

Two source cells are deliberately unused: stomp frame 6 swaps the raised foot;
special frame 3 clips an extended fist at the sheet's outer edge. The left
windup instead uses its three consistent poses. The scrape returns through its
three intact poses. Left knockdowns mirror the **whole** drawn stumble, fall,
sprawl and recovery sequence together, preserving their direction.

## Continuity and timing

- Left/right names mean screen space. Footprint placement during a windup must
  use the corresponding **impact pose** and committed world position, not the
  raised foot's current position.
- Windup examples last three seconds on either side. This leaves time for the
  existing 0.4-second hold delay plus 80% of the 2.5-second dent growth. These
  are preview timings; the fight simulation must own the actual charge clock.
- Countering the stomp goes from its windup to the matching stumble, then the
  faceplant, roll and readable front-facing sprawl. He does not tear a hole.
- Only open the erase window after the roll has exposed all five targets.
  An example holds the fallen loop for 2.8 seconds, then plays a full get-up.
- A successful stomp has a distinct impact cell. Spawn its travelling paper
  ridge and sound once at that event, not at every repeated animation sample.
- The lace has no passenger baked into its artwork. Attach the real selected
  monster to the loop. The successful throw releases at the last flick frame;
  the counter sequence branches before that frame and never launches it.
- The defeat sequence finishes in an exhausted heap with one boot twitch. It
  never loops back into standing. Individual clip playback holds its ending;
  the authoring preview may restart a sequence for inspection.
- Toe taps, knuckle crack, footsteps, windup, slip, faceplant, scrape, lace
  twang/rebound, erasing hits, patch completion and defeat have named cue
  positions. Actual sound files are intentionally not invented or wired here.

The environmental preview reuses the existing paper-press visual language:
pinched crease lines, a prepared footprint, a travelling folded ridge and
graphite scuffs. These are separate from the character frames. Generated
environment sheets with cloudy halos were rejected and are not shipped.

## Five erase targets

Both fists, both boot toe/sole areas, and the yellow chest star have separate
three-pass reference strips. The fists and footwear develop irregular rubbed
edges; the star fades back into blue pencil underneath. Leaving the face and
belt readable helps the character remain recognizable as parts disappear.

These are **independent illustrated part states**, not all 32 combinations of
five removed parts. They are also not attackable areas in the game yet. During
fight integration, retain each part's wear independently and register its
erasure mask to every full-character pose. Switching animations or standing up
must never restore a completed part or reset its progress. Do not swap the
entire actor to a one-part reference and accidentally resurrect the others.
Generous touch hit regions should follow those visible parts, without drawing
five distracting UI targets over the artwork.

## Rebuilding and checking

`python3 scripts/catalogue-bootstomp.py` rebuilds the JSON catalogue from the
existing source PNGs using Pillow as an authoring-only dependency. It reads the
drawn images and calculates rectangles/pivots; it does not repaint them.

`node tests/browser-bootstomp-study.cjs` checks desktop and phone rendering,
every clip's first/last pose, left-fall direction, the pre-release lace branch,
defeat ending, controls and reduced motion. No desktop installer is rebuilt.
