# BETA Scraps — follow the skill paths

Alpha 0.1.58 replaces the busy illustrated collage and separate lists with a
quiet crumpled sheet, Stevie, and four connected purchase paths. The original
shop remains available with its existing wiring and prices. Both views share
one saved scrap bank and perk ranks; bonuses are not counted twice.

Claim **Fresh Pencil for 0 scraps** to open the first skill of each path. This
saves `betaPencilClaimed` in the existing Notebook record and backups. It opens
the beta view without adding duplicate pencil stats. Stevie's held artwork
shows the purchased tool rank.

Buying **one rank** opens the next connected scrap; maxing the previous skill
is not required. Dotted paths become solid as skills open. Locked scraps name
the preceding skill. There is no separate global pencil-rank tier gate.

| Path | First skill | Leads to | Next-rank costs / caps |
| --- | --- | --- | --- |
| Crumpled Paper | Better Scrunch (Paper Ball Practice) | Doodle Notes (Doodle Scraps) | Scrunch: 5, 12, 24 / 3 ranks. Notes: 25 / once. |
| Ink Lab | Bigger Ink Well (Bigger Starting Tank) | Refill Practice | Tank: 5, 12, 24, 40, 60 / 5 ranks. Refill: 5, 12, 24 / 3 ranks. |
| Fort Building | Pencil Case (Drawing Tool) | Further ranks of the same tool | 5, 8, 12, 16, 20, 24, 30, 36, 44, 55 / 10 ranks. Each adds 8 base wall HP; current effect-slot milestones remain. |
| Survival Kit | Lunchbox Band-Aids | Starter Eraser | Health: 5, 12, 24, 40 / 4 ranks. Eraser: 0 / once, after first earned scrap. |

Old purchases remain owned and functional, including perks bought before the
new prerequisite paths. Already purchased partial ranks may continue upgrading
without repurchasing an ancestor. This does not grant missing parent ranks or
stats. Unpurchased follow-up skills need their named parent rank.

Weird Ink Club and Shape Studies are two small **later** scraps at the bottom.
They cannot spend scraps. Other speculative nodes were removed from this view.
Existing ink rewards, synergies and legendary discoveries keep their current
access; they are not gated by the later scraps.

## Viewing and input

The tree fills the viewport, with torn, taped skill scraps and no external
control tray or side panel. Tap a skill to unfold its details and deliberate
handwritten purchase action. Purchases remain blocked during a live run.

- Drag paper or a scrap to move; mouse wheel or two-finger pinch zooms.
- Back and see whole page are taped notes at the map edges, respecting phone
  safe areas. Whole page fits the tree and folds open details.
- Panning/pinching, Fold this back, an empty-paper tap or Escape folds details.
  Escape with no details follows normal dialog back behavior.
- Arrow keys pan the focused viewport, plus/minus zoom and Home fits the page.
  Tab reaches skills; keyboard focus brings off-screen scraps into view.
- Touch/pen taps allow 10 screen pixels of movement; mouse uses 5. Capture
  transfer from a child to the map does not terminate the drag. Cancellation
  still ends it. Accepted touch taps activate once on release with a native
  compatibility-click guard. Pinch can continue as a one-finger drag.
- Resizing preserves zoom/location; detail notes scroll naturally on touch.

The calmer background reuses `assets/art/ui/recess-sheet.svg`; Stevie uses his
existing gameplay art. DOM/SVG paths reflect the actual prerequisite catalog,
with no combat RNG or state changes during rendering. Existing paper/tape art
supplies the nodes, and `beta-unfolded-note.svg` supplies unfolded details.
The older `beta-scrap-tree.png` artwork is retained for reference but is no
longer loaded by this view.
