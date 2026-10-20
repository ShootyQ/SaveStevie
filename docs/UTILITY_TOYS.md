# Drawing utilities — Alpha 0.1.118

Five one-time run unlocks. They use no effect slots and are available in developer reward selection and the test lab. Normal rewards never down-rank them; Legendary toys join the existing reserved Legendary offer pool, without adding offers.

| Utility | Rarity | Control | Limits |
| --- | --- | --- | --- |
| Margin of Error | Rare | Rub an endpoint of a completed paid open wall. The other end becomes a hinge; a monster triggers its swing. | 55–260px strokes, four ready gates, one hinge per wall. Both the swing and its push stay clear of Stevie. Converting consumes the wall's remaining erase-refund value. Continued rubbing in the same gesture does not immediately cut the new gate. Lift, then erase again to remove it normally. |
| Stevie's Terrible Idea | Legendary | Finish drawing, hold the tip still for one active second, then release when the cue says ready. | Paid open 55–260px stroke, 12 extra ink, eight-second cooldown. Rolls in the stroke direction. Crumpling, rolling and unfolding are animated; no collision with Stevie or the paper edge. Ordinary enemies take one contact hit per roll with current ink effects; Blast gets one small impact burst. Bosses and underground monsters are excluded. Unfolds at half remaining HP, without an erase refund; cannot be crumpled again. |
| Spitball Express | Rare | Draw from one active turret to another. The first sends shots along the line; the far turret fires them with 75% extra damage. | Requires permanent paper-ball throwing and Circle Studies in normal runs. Grants at least two turret slots for this run. Paid connections up to 500px; one outgoing route per turret, bounded packets in flight. The source replaces its ordinary shot with a delivery; the destination can still fire normally. Losing either turret or breaking the original wall cancels deliveries. |
| Red Pen Corrections | Legendary | Rub the red mark that appears over an ordinary monster. | Mark lasts eight seconds. Genuine eraser movement recruits it for eight seconds; one friend at a time, twelve seconds between recruit opportunities. The friend throws paper balls, then flees. It leaves the hostile roster immediately, gives no kill reward, and cannot hold up wave completion. Bosses, shielded targets, underground monsters, passengers and specialist monsters cannot be marked. |

| Under the Desk | Legendary | Draw a paid closed outline 64–160px across, then erase an X inside with two separate diagonal strokes. Complete the second slash within three active seconds of the first. | 35 extra ink; 24-second cooldown; one creature; up to three captures over 12 seconds. Requires clearance from Stevie and the page edges. An erased X consumes the outline without a refund. Bosses, shielded enemies, passengers, underground monsters and brood/split specialists cannot be swallowed. A miss, cancellation or insufficient ink never spends the summon cost. |

PC uses normal drawing and right-drag erasing. Touch uses normal drawing and the existing hold-Erase/toggle-Erase controls. No additional combat buttons.

All clocks stop for pause, reward screens, tutorials and cinematic interruptions. Wave transitions, loss and return to menu clear the toys. Boss entry clears their transient state. Resizing shifts all stored geometry with the arena. Rendering uses no combat RNG; reduced motion removes decorative rolling/bobbing while keeping the mechanics and cues.

`assets/art/upgrades/utility-toys.png` contains the four new pencil/crayon reward illustrations in a 2×2 atlas. Runtime animations draw hinges and safe swing guides, crumpling/rolling/unfolding paper with ink accents and a ground shadow, moving charged rail deliveries, red correction marks and friendly check badges. Existing monster artwork is reused for recruits.

The wave-clear screen reuses notebook paper and torn scraps, a crooked PASSED stamp, a handwritten Stevie note, a prominent Next page action and a smaller test restart.

Under the Desk uses a dedicated six-pose, 3×2 transparent atlas at `assets/art/under-desk.png`: punching through wood, opening, searching, reaching, chewing and empty scar. Animated arms extend to a real enemy; the victim wriggles, shrinks and sinks with a ground shadow. Captured enemies cannot move, attack, enter a tunnel, be launched or be recruited while held. Swallowing follows normal defeat/reward handling once; a swallowed last enemy receives a GULP finale instead of reappearing for the ordinary sprite pop. Chewing continues during that presentation without starting further grabs.

Scars are cosmetic and capped at six per chapter. Active creatures stop at wave/boss transitions, releasing any interrupted live victim safely; scars survive ordinary wave changes and clear on a fresh chapter, new run or return to menu. Cooldown carries between waves of the same chapter and pauses with combat. A box avoids Circle Studies recognition. Starting an X inside a pending turret circle cancels that offer and retains the paid outline for the summon.

The combined branch also includes the main-branch Scrap Tree migration/onboarding; it does not restore the retired flat shop.

Validation: `node tests/validate.cjs`, plus `NODE_PATH=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules node tests/browser-utility-toys.cjs` for real mouse and touch input, delivery/recruit behavior and desktop/phone layout. `tests/browser-under-desk.cjs` checks the actual box/X gesture, capture artwork, three-kill limit, chapter scars and Circle Studies interaction.
