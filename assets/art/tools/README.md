# Ranked drawing tools

`tool-ranks.png` is original OpenAI-generated colored-pencil artwork, based on
Save Stevie's existing tool style. It is a transparent 1536 × 1024 atlas with
three columns and four rows of 512 × 256 cells. Eleven occupied cells represent
ranks 0–10; the last cell is empty.

Ranks 0–2: yellow, orange, and red wooden pencils.
Ranks 3–5: turquoise, green, and purple mechanical pencils.
Ranks 6–9: blue and magenta ballpoints, jade and constellation fountain pens.
Rank 10: a decorated plum/gold Scented Sharpie.

`toolArt` in `js/upgrades.js` specifies each crop and socket positions. Real
owned effect icons appear in cream socket overlays; Notebook previews display
empty sockets. Current/next art appears beside the permanent upgrade, and the
same rank art appears in reward and Tool/Build screens. Resources are versioned
by the normal site/Android packaging. No remote asset service is used at runtime.

Each paid rank grants +8 base wall HP; effect slots remain two through rank 5,
three at ranks 6–9, and four at rank 10. Legacy Fresh Pencil purchases are refunded
once through Notebook save-version migration. Previous `tool-tiers.png`, SVG
icons and `slot-pencil.png` remain available for historical references.
