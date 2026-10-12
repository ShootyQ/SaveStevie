# BETA Scraps — first playable tree

Alpha 0.1.57 presents a separate menu and Settings entry alongside the original
scrap shop. This is a prototype view of the **existing** economy: one saved
scrap bank, the same purchased ranks, costs, caps and next-run bonuses. It does
not replace the original shop, change its tutorial or double any stats.

Claim Fresh Pencil for **0 scraps** to open the beta tree. This saves a one-time
`betaPencilClaimed` flag in the existing Notebook save, including backups and
reset. The claim opens this view; it does not add a second pencil stat bonus.
Stevie holds the artwork for the player's actual purchased tool rank.

## Wired nodes

| Branch | Node | Maximum | Next-rank costs | Beta tier |
| --- | --- | --- | --- | --- |
| Middle | Pencil Case | 10 | 5, 8, 12, 16, 20, 24, 30, 36, 44, 55 | 1 |
| Crumpled Paper | Better Scrunch / Paper Ball Practice | 3 | 5, 12, 24 | 1 |
| Crumpled Paper | Doodle Notes / Doodle Scraps | 1 | 25 | 2 |
| Ink Lab | Bigger Ink Well / Bigger Starting Tank | 5 | 5, 12, 24, 40, 60 | 1 |
| Ink Lab | Refill Practice | 3 | 5, 12, 24 | 2 |
| Survival Kit | Lunchbox Band-Aids | 4 | 5, 12, 24, 40 | 1 |
| Survival Kit | Starter Eraser | 1 | 0, after first earned scrap | 1 |
| Fort Building | Reinforced Lines | Linked view | Included with Pencil Case, +8 wall HP per rank | 1 |

Tier 1 requires the free beta pencil. Tier 2 requires tool rank 3. The catalog
also reserves tool rank 6 for tier 3 and rank 10 for tier 4. Already owned ranks
remain visible; the original shop keeps its existing access rules. This is an
intentional first-pass gate, not a migration to the earlier proposed new costs.

Fort Repairs, Forgotten Instructions, Second Chance, Weird Ink Club projects,
and Shape Studies are inspectable placeholders. They cannot spend scraps or
change combat. Existing elemental rewards, synergies and legendary Doodle
Scraps retain their current access; the placeholder nodes do not gate them.

## Viewing

The tree fills the whole viewport. There is no toolbar, shortcut strip, square
upgrade box or side panel. Individual nodes are torn, lined paper scraps with
school tape; their live text remains accessible and readable. A scrap opens a
paper note on the map with its explanation and a deliberate handwritten
purchase action. The original shop and transaction wiring are unchanged.

- Drag the paper or a node to move; a drag selects/purchases nothing.
- Mouse wheel or two-finger pinch zooms around the cursor/pinch midpoint.
- Camera movement stays within the page when zoomed in.
- Taped Back and see whole page notes remain at the map edges, including safe
  areas on phones. The scrap bank and brief instructions are handwritten on
  the page. There are no separate interface trays.
- Tap a branch heading to move to that area. Tap an individual scrap to unfold
  its details. Phone entry starts near Stevie at readable scale; see whole page
  fits the full tree and folds the open note.
- The details note shows rank, actual price, effects and prerequisites. Tap its
  handwritten purchase action to buy; it remains blocked during a live run.
- Panning or pinching folds the note. Fold this back, tapping empty paper or
  Escape also folds it. Escape with no open note follows the dialog's normal
  back behavior.
- Keyboard: Tab reaches map scraps and notes; arrow keys pan the focused
  viewport, plus/minus zoom and Home fits the page. Focused off-screen scraps
  are brought into view.

Artwork: `assets/art/ui/beta-scrap-tree.png`. Live text, selection states and
Stevie's held tool are separate DOM elements over that image. Existing torn
paper and tape assets supply the nodes. `assets/art/ui/beta-unfolded-note.svg`
supplies a ragged, lined-paper detail note that scrolls naturally on touch.

## Touch refinement (0.1.57)

Dragging from a scrap retains tracking when its implicit browser pointer
capture transfers to the map. Bubbled capture loss from a child is ignored;
loss of the viewport's own capture still cancels that pointer. Touch/pen taps
allow 10 screen pixels of movement before starting a drag; mouse uses 5 pixels.
Pointer focus does not recenter the map. Phone entry starts closer, with room
for vertical panning and 52px node targets before zoom. Resizing preserves zoom
and the viewed center instead of fitting the entire tree again.
Accepted touch taps activate the original scrap once on pointer release, even
when native click synthesis would discard a small finger wobble. A short guard
suppresses only the following trusted pointer click; keyboard and programmatic
activation remain usable. New pointer gestures reset the guard.
