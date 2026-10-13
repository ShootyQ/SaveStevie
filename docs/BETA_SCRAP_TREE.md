# BETA Scraps — follow the skill paths

Alpha 0.1.61 uses a 2400 × 2000 crumpled sheet with Stevie at the center and
six directions for connected purchase paths and future experiments. The original
shop remains available with its existing wiring and prices. Both views share
one saved scrap bank and perk ranks; bonuses are not counted twice.

Claim **Fresh Pencil for 0 scraps** to open the first skill of each path. This
saves `betaPencilClaimed` in the existing Notebook record and backups. It opens
the beta view without adding duplicate pencil stats. Stevie's held artwork
shows the purchased tool rank.

Buying **one rank** opens all directly connected next scraps; maxing the
previous skill is not required. Forks are not mutually exclusive: both sides
can eventually be purchased. Dotted paths become solid as skills open. Locked scraps name
the preceding skill. There is no separate global pencil-rank tier gate.

| Path | First skill | Leads to | Next-rank costs / caps |
| --- | --- | --- | --- |
| Crumpled Paper · left | Better Scrunch (Paper Ball Practice) | Doodle Notes **and** Lunch Money | Scrunch: 5, 12, 24 / 3 ranks. Notes: 25 / once. Rerolls: 5, 12 / 2 ranks. |
| Ink Lab · upper left | Bigger Ink Well (Bigger Starting Tank) | Refill Practice **and** Extra Credit | Tank: 5, 12, 24, 40, 60 / 5 ranks. Refill: 5, 12, 24 / 3 ranks. Choice: 25 / once. |
| Fort Building · upper right | Pencil Case (Drawing Tool) | Further ranks of the same tool | 5, 8, 12, 16, 20, 24, 30, 36, 44, 55 / 10 ranks. Each adds 8 base wall HP; current effect-slot milestones remain. |
| Survival Kit · right | Lunchbox Band-Aids | Starter Eraser **and** Lucky Eraser | Health: 5, 12, 24, 40 / 4 ranks. Eraser: 0 / once, after first earned scrap. Luck: 5, 12, 24, 40 / 4 ranks. |

Old purchases remain owned and functional, including perks bought before the
new prerequisite paths. Already purchased partial ranks may continue upgrading
without repurchasing an ancestor. This does not grant missing parent ranks or
stats. Unpurchased follow-up skills need their named parent rank.

Weird Ink Club remains a future direction below Stevie. Shape Studies opens after a normal wave-10 Wobblechomp victory (or an existing best wave beyond 10). Claim the free root, then buy Circle Studies once for **25 scraps**. The saved `wobbleDefeated` flag travels with backups; test runs do not unlock it.
Weird Ink Club cannot be purchased yet. Other speculative nodes were removed from this view.
Existing ink rewards, synergies and legendary discoveries keep their current
access; they are not gated by the later scraps.

## Viewing and input

The tree fills the viewport, with torn, taped skill scraps and no external
control tray or side panel. Tap a skill to unfold its details and deliberate
handwritten purchase action. Purchases remain blocked during a live run.

- Drag paper or a scrap to move; mouse wheel or two-finger pinch zooms.
- Handwritten directions near Stevie jump to a branch when tapped. Keyboard
  focus brings those labels into view; Enter opens the branch. Phone entry
  centers Stevie, and whole page reveals the entire radial map.
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

## Radial layout checks

All ten existing Notebook perks appear once in the beta tree, with the same
prices and caps. Three parent nodes each open two independent children. Later
branches stay unpurchasable. Curved directional paths leave the central group
or parent scrap and enter at child-paper edges; arrows do not pass through
labels inside the skill scraps. Node geometry stays inside the expanded page
with at least 20 pixels of separation (the actual layout leaves much more).
Tests verify fork prerequisites, both-side availability, exact costs and the
next-run reroll, choice, Luck, health and ink bonuses.

Alpha 0.1.68 expands Shape Studies below Circle Studies: Long Paper Barrel → Busy Barrels, Stubborn Folds → Quick Origami, and Cannon Club. The page grows to 2400 × 2600 to keep these taped scraps apart; the existing zoom, pan and branch jumps remain. Prices and effects are listed in `CIRCLE_STUDIES.md`.
