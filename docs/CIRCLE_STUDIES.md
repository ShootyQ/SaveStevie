# Circle Studies — Alpha 0.1.70

Shapes opens after defeating Wobblechomp in a normal wave-10 fight. Existing saves with best wave 11 or higher qualify. Circle Studies costs 25 scraps once and uses the shared Notebook wallet; it also appears in the original shop. Purchases apply to every later run. Test fights do not unlock the branch.

Draw a roughly round, almost closed loop 30–140 pixels across. Quick circles with at least five distinct points, lopsided ovals and angular freehand loops are accepted. Short overlapping ends and closing gaps up to 32 pixels (scaled down for small loops) are tolerated. Recognition smooths pointer jitter without changing your actual wall; oversized round loops show a smaller-circle hint. Squares, long ellipses, open arcs and oversized circles remain ordinary walls. Enemies on the paper inside at release immediately trigger Enclose. While inside an intact ring they receive 1.5× normal wall contact, including the existing ink interactions and their normal immunities. Contact does not stack with touching the perimeter or overlapping enclosures. Breaking or erasing the ring stops the area contact.

Turrets work during the timed ordinary portion of every wave, including every fifth wave. They are unavailable once the boss warning, entrance or fight begins. Empty circles stay ordinary walls, with no offer or automatic conversion. Boss entrances and direct boss spawns clear active turrets and pending offers. Enemy-filled circles can still Enclose, respecting normal boss immunities.

Recognized circles count as closed before wall HP is calculated, so Closed Loop and Fortress Geometry durability, paid-ink refunds and completion repair apply before the turret offer. A valid empty circle too near Stevie’s fort stays a wall and shows a two-second “Turret too close” paper bubble. The placement check repeats on confirmation.

An empty circle outside Stevie’s fort offers Turret? with confirm and cancel. Three seconds of active gameplay without a choice (one second with Quick Origami at max rank) defaults to confirm; pauses and menus stop the timer. Cancel retains the paid ordinary wall. If a monster enters before confirmation, the circle becomes an enclosure. One turret may be active by default; Cannon Club increases this to three. Confirming another empty circle crumbles the oldest turret when capacity is full and replaces it with a fresh cannon using its purchased lifetime; the three-second default also replaces it. Canceling or turning the new circle into an enclosure preserves the old turret. Replacement costs only the ink paid to draw the new circle and does not refund the old one.

Without permanent turret upgrades, the turret fires for ten seconds with a 210-pixel acquisition range, 290-pixel/second paper-ball speed and 1.25-second interval. Each cannon captures its purchased range, duration and firing interval when built. It copies Stevie’s current physical damage with a 50% bonus, with a base 3-damage shot before Stevie has unlocked throwing. Shots copy paper elements, status effects and paper-note behaviours; range and Rapid Scribble notes are excluded, including from descendants. Second Draft uses its own meter. Underline launches keep the cannon’s purchased targeting range. Already-fired balls finish their normal lifecycles.

The original circle’s HP/max HP and base wall damage are retained, but its ink effects are removed. Monsters detour around the turret and ordinary erasing/attacks do not target it. The barrel folds in, recoils and fades with a circular lifetime indicator. Wave transitions clear turrets and pending choices. Future specialist enemies can use the retained wall durability to destroy them.

## Turret scrap branch

Buy Circle Studies first, then choose any of its three branches. One rank opens the connected next scrap; all branches can be purchased. Both scrap pages use the same wallet and saved ranks, and the original shop enforces these prerequisites too. Existing saves and older backups default the new ranks to zero.

| Upgrade | Requires | Ranks | Prices by rank | Effect |
| --- | --- | ---: | --- | --- |
| Long Paper Barrel | Circle Studies | 3 | 10 / 20 / 35 | +30 range each; 210 → 300 |
| Stubborn Folds | Circle Studies | 3 | 10 / 20 / 35 | +3 seconds each; 10 → 19 |
| Cannon Club | Circle Studies | 2 | 30 / 60 | +1 active cannon each; 1 → 3 |
| Busy Barrels | Long Paper Barrel | 3 | 10 / 20 / 35 | −0.1 seconds between shots each; 1.25 → 0.95 |
| Quick Origami | Stubborn Folds | 2 | 15 / 30 | −1 second auto-build wait each; 3 → 1 |

Capacity replaces the oldest only when full. Each cannon has its own firing cooldown and Second Draft meter; expiration removes only that cannon. Boss entry and wave changes clear all cannons. Monsters avoid all their circles, and overlapping turret perimeter contacts do not multiply wall damage. Doodle Note range and fire-rate bonuses still do not affect cannons; paper-ball descendants inherit the purchased turret range.
