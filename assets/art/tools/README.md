# Socketed drawing tools

`tool-tiers.png` is original generated artwork for Save Stevie, produced with
OpenAI image generation. It contains four isolated transparent drawing tools:
Pencil (two sockets), Mechanical Pencil (two), Simple Pen (three), and Scented
Sharpie (four). The hand-drawn outlines and colored-pencil texture match the
notebook interface. The image is 1536 × 1024; no remote asset service is needed.

`toolArt` in `js/upgrades.js` records the crop and socket centers for each tier.
The renderer displays the atlas through CSS cropping and places the actual
owned effect icons and level badges inside its drawn sockets. The same artwork
appears in rewards, Tool/Build and the Notebook tool purchase card. Deployment
packaging versions the asset URL along with the rest of the site.

Ranks 0–2 share Pencil artwork, 3–5 Mechanical Pencil, 6–9 Simple Pen and rank
10 Scented Sharpie. Existing SVG icons and `slot-pencil.png` remain available
for historical references.
