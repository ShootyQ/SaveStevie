# Save Stevie upgrade reference — Alpha 0.1.24

[Download the Excel workbook](SaveStevie-Upgrade-Reference.xlsx)

Catalog descriptions and requirements are exported from game code; mechanics and review notes are maintained alongside them. Suggestions are proposals, not shipped changes.

Fresh Pencil was retired; legacy paid ranks receive a one-time scrap refund. Every Drawing Tool rank adds +8 base wall HP. Quick Sketch was retired and replaced by Doodle Stitch following player feedback. Double Stroke, Triple Stroke and their parallel-wall synergies were retired to reduce clutter; one stroke creates one wall. Other review candidates are hypotheses, not pick-rate data.

About one in three campaigns reserves at most one Legendary offer after waves 1–19. Runs ending early may never see their offer; this is not a guarantee every third run.

One-time upgrades award one unlock regardless of rarity; stackable upgrades generally award 1/2/3/4 levels, subject to caps.

Regenerate: node scripts/build-upgrade-reference.cjs && python3 scripts/build-upgrade-workbook.py (requires openpyxl).

## All run upgrades

| Upgrade | Category | Current effect | Stacking / limits |
| --- | --- | --- | --- |
| Bigger Ink Tank | Drawing / ink economy | +35 max ink. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Quick Refill | Drawing / ink economy | Adds ink regeneration: +2 ink/s first pick, smaller bonuses on repeats. | Repeatable; caps/diminishing returns may apply; Repeat level n adds 2 / (1 + 0.4 × (n−1)) ink/s. |
| Thick Ink | Walls / shapes | +20 base wall durability. Long strokes multiply this further. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| First Aid | Stevie / rocks / survival | +18 max HP and heal 18. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Fine Tip | Drawing / ink economy | Lines cost 12% less ink. | Repeatable; caps/diminishing returns may apply; Each level multiplies ink cost by 0.88; a paid stroke still costs at least 6 ink. |
| Fat Marker | Walls / shapes | +2 line width and +15 wall HP. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Lucky Scribble | Rewards / recovery | +8 Luck: improves rarity odds for future upgrades and rerolls. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Clean Erasing | Rewards / recovery | Recover 10 percentage points more paid ink from healthy erased walls per level, up to 60%. Damaged walls return less; free lines and copies return nothing. | Repeatable; caps/diminishing returns may apply; Erased paid-ink recovery capped at 60%; damaged sections return less; no free/copy refunds. |
| Recycling | Rewards / recovery | Kills refund 5 ink, sharing an 8 ink/s refill budget. | Repeatable; caps/diminishing returns may apply; Shared kill-ink recovery budget: 8 ink/s. |
| Closed Loop | Walls / shapes | Closed shapes gain +40% durability. First loop-utility level: 15% paid ink back, repair nearby walls by 15% of missing HP, and +10% damage inside. Later levels have diminishing gains; repair is capped by ink spent. | Repeatable; caps/diminishing returns may apply; Shares diminishing loop utility with Fortress Geometry; refunds/repair depend on paid ink; utility overlaps do not stack. |
| Architect | Walls / shapes | Each wall intersection adds 15% durability. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Patchwork | Walls / shapes | Drawing across an old wall repairs 18 HP. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Doodle Stitch | Drawing / ink economy | Snap new strokes to open wall endpoints. Connectors add 75%, 50%, then 25% of normal new-length HP; later extensions add none. Pay normal ink; old damage, oldest lifetime and extension history are preserved. | One-time unlock; Endpoint snap reach 16px. New-length HP: 75%, 50%, 25%, then zero. Existing damage, oldest lifetime and summed group histories are preserved; erasing retains history. |
| Patch Job | Walls / shapes | Every kill repairs walls by up to 3 HP each, sharing a 12 wall HP/s budget. | Repeatable; caps/diminishing returns may apply; Shared repair-on-kill budget: 12 wall HP/s across all walls. |
| Freehand | Drawing / ink economy | Spend 80 real ink to charge a limited free-ink bank. Stacking increases the free bank. | Repeatable; caps/diminishing returns may apply; Charges from real paid ink, not free strokes/copies; threshold 80; initial bank 40, +20 per extra level. |
| Living Fountain Pen | Drawing / ink economy | 35% faster ink regeneration on the first pick; smaller multipliers on repeats. | Repeatable; caps/diminishing returns may apply; Repeat level n multiplies regeneration by 1 + 0.35 / (1 + 0.5 × (n−1)). |
| Bottomless Pen | Drawing / ink economy | Per level: +40 max ink and +2 ink/s at first, with smaller regeneration bonuses on repeats. | Repeatable; caps/diminishing returns may apply; Each level adds 40 max ink; regeneration repeats use 2 / (1 + 0.4 × (n−1)). |
| Fortress Geometry | Walls / shapes | Per level: +50% closed-shape durability. Shares Closed Loop’s diminishing ink refund, completion repair and enclosed-enemy damage bonus (15% / 15% / 10% at the first utility level). | Repeatable; caps/diminishing returns may apply; Shares diminishing loop utility with Closed Loop; free strokes/copies do not earn ink refunds. |
| Bandages | Stevie / rocks / survival | Heal 8 extra HP between waves. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Helmet | Stevie / rocks / survival | Stevie takes 10% less contact damage. | Repeatable; caps/diminishing returns may apply; Damage reduction capped at 55%; awarded levels respect remaining cap. |
| Pocket Rocks | Stevie / rocks / survival | Unlock rock throwing: +4 first-level damage, later gains grow to +9. Throws every 1.6s; preserves faster throws. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Better Rocks | Stevie / rocks / survival | +6 first-level rock damage, later gains grow to +12. Each level shortens throws by 0.08s, down to 0.65s. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Emergency Medicine | Stevie / rocks / survival | Heal 2 HP per kill, sharing the 6 HP/s combat healing budget. | Repeatable; caps/diminishing returns may apply; Shared combat-healing budget: 6 HP/s. |
| Really Good Rocks | Stevie / rocks / survival | +12 first-level rock damage, later gains grow to +24. Each level shortens throws by 0.08s, down to 0.55s. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Stevie Has Had Enough | Stevie / rocks / survival | +8 first-level rock damage, later gains grow to +15. Each level shortens throws by 0.14s, down to 0.45s. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Loaded Deck | Rewards / recovery | Future normal rewards cannot roll below Uncommon. | One-time unlock; One-time unlock; ordinary rewards only, no extra Legendary chances. |
| Reroll Coupon | Rewards / recovery | +2 rerolls immediately. | Repeatable; caps/diminishing returns may apply; Stored rerolls capped at 5; awarded levels respect remaining cap. |
| Collector | Rewards / recovery | Slightly favors upgrades you have not taken yet. | One-time unlock; One-time unlock; unowned card weights multiplied by 1.8. |
| Greedy Goblin | Rewards / recovery | Normal rewards show a fourth choice. | One-time unlock; One-time unlock; disabled if a fourth reward choice already exists. |
| Fire Ink | Ink effects | Wall contact ignites enemies for damage over time. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Frost Ink | Ink effects | Slows on contact from level one. Sustained contact builds a guaranteed freeze; bosses freeze for half as long. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Poison Ink | Ink effects | Enemies build stacking poison while touching walls. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Repulsion Ink | Ink effects | Timed contact pulses deal impact damage, shove enemies safely away from Stevie and briefly stagger them. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Electric Ink | Ink effects | Wall contact sparks a fading chain with brief shock. Shared recovery prevents overlapping zaps; every three levels add a jump, with capped reach and targets. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Blast Ink | Ink effects | Destroyed walls explode and damage nearby enemies. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Vampire Ink | Ink effects | Deals life-drain damage on contact and heals for 25% of damage dealt, sharing the 6 HP/s healing budget. | Repeatable; caps/diminishing returns may apply; Shared combat-healing budget: 6 HP/s; no healing at full health. |
| Gravity Ink | Ink effects | Tugs nearby enemies toward wall segments without slowing movement or wall bites. Tight reach; King Doodle resists the pull, but his returnable shots bend slightly toward nearby walls. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Void Ink | Ink effects | Deals steady Void damage on contact and executes weakened ordinary enemies; bosses cannot be executed. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Chaos Ink | Ink effects | Sustained contact guarantees timed random ink rolls. Every roll has a working effect and extra impact damage. | Repeatable; caps/diminishing returns may apply; See effect description and game code for per-level combat tuning. |
| Death Ink | Ink effects | Per level: +5 base wall damage per second. Physical hits deal bonus damage against enemies at half health or lower. | Repeatable; caps/diminishing returns may apply; Uses an effect slot even though its per-level gain changes base wall DPS. |

## Synergies

| Synergy | Requires | Effect |
| --- | --- | --- |
| Plaguefire | Fire Ink + Poison Ink | Defeated burning, poisoned enemies leave growing ten-second Plaguefire pools that scorch holes in the paper. |
| Cryoshock | Frost Ink + Electric Ink | Frozen enemies conduct boosted chain lightning. |
| Singularity Ink | Gravity Ink + Blast Ink | Broken walls pull enemies inward before exploding. |
| Black Ice | Repulsion Ink + Frost Ink | Frozen enemies are shoved harder and stay slowed. |
| Leech Ink | Vampire Ink + Poison Ink | Poison damage slowly heals Stevie. |
| Thermal Shock | Fire Ink + Frost Ink | Burning frozen enemies crack for burst damage and stun. |
| Tesla Well | Electric Ink + Gravity Ink | Gravity-packed enemies amplify electric chaining. |
| Event Horizon | Void Ink + Gravity Ink | Enemies near gravity walls have much higher Void proc chance. |
| Cannon Ink | Blast Ink + Repulsion Ink | Explosions send ordinary monsters flying, with safe landings, fall damage and a 1.2s stun. Bosses resist launches. |
| Napalm Scribbles | Fire Ink + Blast Ink | Destroyed Fire + Blast walls leave four-second burning scribbles; overlapping patches do not stack damage. |
| Venom Ice | Poison Ink + Frost Ink | Poison decays much more slowly while enemies are chilled. |
| Rail Ink | Electric Ink + Repulsion Ink | Repelled enemies become charged and zap nearby targets. |
| Gravity Trap | Gravity Ink + Closed Loop | Closed loops pull nearby enemies toward their perimeter. |
| Ring of Fire | Fire Ink + Closed Loop | Closed loops radiate heat and ignite enemies nearby. |
| Circuit Board | Electric Ink + Architect | Wall intersections become electrical nodes. |
| Demolition Grid | Blast Ink + Architect | Intersections make wall explosions larger and stronger. |
| Blood Patch | Vampire Ink + Patchwork | Repairing walls also heals Stevie. |
| Needlepoint | Poison Ink + Fine Tip | Cheap thin lines stack poison much faster. |
| Heavy Artillery | Blast Ink + Fat Marker | Thicker walls create larger explosions. |
| Hot Rocks | Fire Ink + Pocket Rocks | Stevie's rocks ignite enemies. |
| Snowball Fight | Frost Ink + Pocket Rocks | Stevie's rocks chill and sometimes freeze enemies. |
| Thunderstones | Electric Ink + Pocket Rocks | Stevie's rocks chain lightning and burst sparks from Electric Ink walls. |
| Stevie the Unreasonable | Vampire Ink + Stevie Has Had Enough | Stevie heals from his own attacks. |
| Human Pinball | Repulsion Ink + Helmet | Contact explosions knock nearby enemies away from Stevie. |
| THE STORM | Electric Ink + Frost Ink + Gravity Ink | Gravity clusters, frost holds, lightning shreds the whole pack. |
| INFERNO | Fire Ink + Blast Ink + Repulsion Ink | Burning explosions hurl ordinary monsters farther, with harder landings and a 1.6s stun; leave stronger four-second fire patches. Bosses resist launches. |
| THE BLACK HOLE | Gravity Ink + Void Ink + Closed Loop | Closed loops become miniature event horizons. |
| NECROTIC ENGINE | Poison Ink + Vampire Ink + Gravity Ink | Pinned poisoned enemies continuously feed Stevie health. |
| TESLA CAGE | Electric Ink + Architect + Closed Loop | Closed intersecting geometry becomes a powered electric circuit. |

## Permanent Notebook perks

| Perk | Current effect | Ranks | Costs per rank |
| --- | --- | --- | --- |
| Starter Eraser | Stevie’s free first purchase. Adds 5 percentage points to ink recovery when erasing; applies to every new run. | 1 | 0 |
| Doodle Scraps | Unlock mysterious paper drops in future runs, from any wave. Draw through one and choose a stacking trick for Stevie’s paper balls. Discover elemental throws, wall rides, decoys and Connect the Dots. Finds last only for that run. | 1 | 25 |
| Your Drawing Tool | Grow from Pencil to Mechanical Pencil (rank 3), Simple Pen (rank 6), and Scented Sharpie (rank 10). Every rank has its own artwork and adds +8 base wall HP. Pens unlock a third effect slot; Sharpies unlock a fourth. | 10 | 5, 8, 12, 16, 20, 24, 30, 36, 44, 55 |
| Bigger Starting Tank | +20 starting/max ink per rank. | 5 | 5, 12, 24, 40, 60 |
| Refill Practice | +1 starting ink regeneration per second per rank. Stacks with run upgrades. | 3 | 5, 12, 24 |
| Extra Credit | Start every run with four reward choices instead of three. Boss rewards already have four. | 1 | 25 |
| Lunchbox Band-Aids | +8 starting/max Stevie HP per rank. | 4 | 5, 12, 24, 40 |
| Paper Ball Practice | Start throwing crumpled paper: 3 damage per rank. Higher ranks throw a little faster. | 3 | 5, 12, 24 |
| Lunch Money | +1 starting reroll per rank. Each cleared wave still supplies a free reroll. | 2 | 5, 12 |
| Lucky Eraser | +2 starting Luck per rank, improving upgrade rarity odds. | 4 | 5, 12, 24, 40 |

## Doodle Scraps — stack for this run

| Note | Rarity | Effect |
| --- | --- | --- |
| Hot Off the Page | Common | Ignite enemies. More copies strengthen the burn. |
| Static Scribble | Common | Spark enemies and charge crossed walls. |
| Questionable Lunch | Common | Add stacking poison. Stevie insists it is still good. |
| Cold Shoulder | Common | Briefly chill enemies. Repeat copies improve the chill, with a control cap. |
| Correction Notice | Common | Add eraser damage. Each hit wipes one chunk off Ruff. |
| Long Distance Learning | Common | Reach farther enemies. Repeat copies extend range with diminishing returns. |
| Second Draft | Uncommon | Every few throws, send a second ball at a different enemy. Copies make this happen more often. |
| Follow the Underline | Uncommon | Paper balls ride your lines, then launch from the far end with extra range. |
| Static Cling | Rare | Repeated electric hits make nearby monsters cling to each other in slow, sparking clumps. Includes basic electricity. |
| Ash Impostor | Rare | Hit a burning enemy to shed a smoky decoy that distracts nearby monsters. Includes basic fire if needed. |
| Bubble Trouble | Rare | Repeated poison hits inflate a wandering bubble. Erase it to pop and stagger the monster. Includes basic poison if needed. |
| Cross Out | Rare | Erasing hostile pencils or spikes turns their remains into friendly paper throws. |
| Connect the Dots | Epic | Paper hits mark monsters with bright dots. Draw through two dots to snap a colorful tether between them! |
| Bad Influence | Epic | Ash decoys carry your paper elements. Monsters biting one receive those effects. Includes Ash Impostor if needed. |
| Split Decision | Uncommon | On its first hit, a ball splits toward two different nearby enemies. Each copy adds one generation. Children carry your notes and retain 50% damage, improving slightly with copies. |
| Rapid Scribble | Uncommon | Throw paper balls 5% faster per copy. Additive speed bonuses have no rank cap. |
| Round Trip | Legendary | Paper balls orbit struck monsters and repeatedly deal their paper damage until that monster dies. Split children can orbit too; laps never split again. |
| Extra Credit | Legendary | Every hit hops to another enemy within 90px and adds +1 physical damage per copy. No hop limit. If nobody is nearby, the ball waits for its next short hop. |
| Wallflowers | Legendary | Finished throws perch on nearby walls, then launch again when monsters approach. The balls keep your notes and can be reused while their wall survives. |
| Carbon Copy | Legendary | Cross any wall to fire two straight paper duplicates out its sides. They deal double physical damage and carry your notes. Each ball copies once per wall; duplicates cannot make more carbon copies. |
| Extra Ink | Legendary | Black paper balls splash ink on impact: fully heal nearby walls, extend both ends of open walls, and refill 5 ink per copy on hit. Free growth does not create paid ink to reclaim. |

## Mechanics and specializations

| Mechanic | Current behavior |
| --- | --- |
| Drawing | A valid segment becomes a working wall while dragging. Paid strokes cost at least 6 ink; default cost is 0.31 ink/pixel. HP = base wall HP × length/180, with loop/intersection bonuses. Growth preserves existing damage and lifetime. |
| Erasing | PC: right-drag. Touch: hold Erase with one thumb while the other finger rubs; Settings supports tap-to-toggle and left-side controls. Healthy paid wall sections recover 25% ink, or 30% with Starter Eraser; damage reduces recovery. Only Rubble Ruff can be erased as an enemy. |
| Paper wear and tunnels | About 2 seconds of local active eraser rubbing tears a hole. Each wave starts with fresh paper; wear and holes reset, stay clear of the fort and form shortcuts only to exits at least 45px closer to Stevie. One 30% entry decision per hole encounter, with no approach-alignment requirement. Bosses never enter. Underground monsters ignore surface effects and damage; rocks still hit. Rub near the moving bump for 2 seconds to force a warned emergence and 1.2-second daze. Bosses and airborne boss helpers stay above the page. |
| Erase combat | Erase small hostile pencils/spikes, sacrificing return damage. Erasing paid electric ink between surviving wall ends discharges up to 12 + 2 × Electric Ink level damage, limited to 0.8 × removed paid ink, with a 0.8-second wall cooldown retained by fragments. Erase Chonks’s recovery support or Boingus’s fresh rebound support to stun for 1.4 seconds; each monster has a 6-second stumble cooldown. Trip Line: erase a wall within 0.45 seconds of Crash Dash or a moving Chonks reaching it to earn a safe skid and 1.4-second stumble. Bosses and airborne enemies are excluded. Firebreak: erase strips through existing Napalm/Plaguefire patches; cleared ground remains excluded from that patch’s visuals and damage, including later growth. New patches can reignite it. |
| Closed shapes | A stroke with more than six points and endpoints less than 22 pixels apart is a closed loop. Closed Loop/Fortress Geometry add durability and paid completion utility; related synergies add effects. |
| Stevie throws paper balls | Unlocked through throwing upgrades, Paper Ball Practice or a Doodle Scrap discovery. Automatically targets a nearby enemy within 210 pixels before range notes. Desktop WASD steers throws while held; releasing restores auto-aim. Touch keeps auto-aim. Damage and rate grow with investment; Pocket Rocks also unlocks rock/ink synergies. |
| Doodle Scraps | Permanent Notebook unlock costs 25 saved scraps. Wave budgets: 25% zero, 40% one, 25% two, 10% three; eligible normal kills reveal the budget, with 10 combat seconds between discoveries. One pickup at a time, lasts 45 seconds. Draw through it to pause and choose one of two distinct notes of the same rarity. Tier odds: Common 55%, Uncommon 28%, Rare 13%, Epic 3.7%, Legendary 0.3% per discovery. Five Legendary paper-ball behaviors are available. All notes and duplicate copies stack for the run, with bounded control/procs and diminishing range. New notes do not change throws already in flight. No wave-reward slots used; development tests and boss/helpers excluded. |
| Specialization: Fortress | Defense-category upgrade weights ×3. Does not directly add wall HP. |
| Specialization: Ink Alchemist | Ink-category upgrade weights ×3. Does not directly add ink levels. |
| Specialization: Chaos | Adds +12 normal-reward rarity bonus; enemy HP scale ×1.08. No additional Legendary chances. |

## Retuning candidates — proposals only

| Upgrade | Evidence | Priority | Idea |
| --- | --- | --- | --- |
| Clean Erasing | Hypothesis | Medium | Compare recovered ink in real mobile runs with refill upgrades; verify that recovery is visible and the cap is understood. |
| Architect | Hypothesis | Medium | Check if intersection bonuses and Circuit Board/Demolition Grid are noticeable; consider clearer intersection markers before changing numbers. |
| Patchwork | Hypothesis | Medium | Check whether deliberately redrawing across old walls feels worth the ink; consider clearer repair feedback or a stronger skill-based repair trigger. |
| Doodle Stitch | Implemented replacement | Monitor | Replaces Quick Sketch. Playtest endpoint reach, the three diminishing HP additions, damaged-wall rescue and fourth-plus extensions without new HP. |
| Freehand | Hypothesis | Medium | Check whether the charge threshold and bank are understood; strengthen the ready-state cue before changing the economy. |
| Bandages | Hypothesis | Medium | Compare between-wave healing with instant healing and kill healing; consider a useful full-health benefit if it is consistently passed over. |
| Collector | Hypothesis | Medium | Check whether 1.8× weighting toward unowned cards helps or disrupts a focused build; consider a more visible reward-selection benefit. |
| Gravity Ink | Hypothesis | Medium | Measure whether enemies are held on dangerous wall segments; check readability and synergy payoff before buffing reach. |
