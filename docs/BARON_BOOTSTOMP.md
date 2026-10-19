# Baron Bootstomp — wave 10 boss concept

Status: character concept only. Wobblechomp and his assets remain intact; this boss is not wired into encounters yet.

Artwork: `assets/art/concepts/baron-bootstomp.png`. Blue crayon monster, enormous yellow boots, tiny crown; use whole-character drawn animation frames when implemented.

## Agreed fight direction

- Use the existing eraser-held paper dent under his telegraphed landing foot. At least 80% preparation makes him stumble and fall, without tearing through the sheet.
- A successful stomp sends a fast paper ripple toward Stevie. The first player wall halves its damage once; further walls cannot reduce it again.
- On a fall, expose five drawing patches. Each takes three deliberate erasing passes, with persistent progress. Target one completed patch per fall, with time toward another for quick players.
- Start with twice King Doodle-Doom’s current add spawn count. Do not buff Doodle-Doom as part of this change.
- Shoe scrape removes sections of cover along a telegraphed strip.
- Tantrum shuffle moves the boss and shoves enemies between stomp attempts.
- Royal lace flick launches a nearby monster. Draw across the stretched lace to snag it before launch; otherwise block the passenger in flight. Do not scrape away a prepared footprint during the same committed stomp.

## Input prerequisite shipped separately

Ordinary gameplay erasing requires six pixels of brush travel before applying an erasing segment. Slow pointer samples accumulate from an anchor. Clicking or tapping without travel does not count as rubbing. This does not implement the boss’s future three-pass patch rules.
