# BETA Scraps — first playable tree

Alpha 0.1.55 adds a separate menu and Settings entry alongside the original
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

- Drag empty paper or a node to move; a drag selects/purchases nothing.
- Mouse wheel or two-finger pinch zooms around the cursor/pinch midpoint.
- Zoom buttons and Whole tree are available on both platforms.
- Branch buttons jump to a readable view; Stevie jumps to Pencil Case.
- Keyboard: Tab selects controls, arrow keys pan the focused viewport,
  plus/minus zoom and Home fits the page. Focused off-screen nodes are brought
  into view. Escape follows the existing dialog back behavior.
- The details panel shows rank, actual price, effects and prerequisites.
  Purchases use a separate deliberate button and are blocked during a run.

Artwork: `assets/art/ui/beta-scrap-tree.png`, generated for this tree. Live text,
selection states and the held tool are separate DOM elements over that image.
