# Save Stevie development guidance

For every future player-facing feature, fix, or balance change, update the
in-game changelog in `index.html` (`#changelogEntries`) in the same change.
Prepend a short, plain-language entry with a descriptive heading, newest first;
retain older entries and describe behavior that actually ships. Avoid duplicate
changelog sources or claiming an update is deployed before it is merged.
Update an existing entry when refining an unmerged change. Internal-only
maintenance does not need a player-facing entry.

Run `node tests/validate.cjs` for gameplay/UI changes. For layout or interaction
changes, check relevant screens at desktop and phone-sized browser viewports.
Keep the static site dependency-free and preserve existing best-wave records.

For experimental gameplay changes, prefer a quick playable pass for the user's
own playtesting. Run required checks and targeted verification of the changed
mechanic; avoid expanding into additional browser matrices or repeated suites
without a failure or new change that warrants them. Use player feedback for
fun, pacing and balance before investing in a broader polish pass. Save,
purchase and blocking tutorial changes still need careful verification.

Start each new change on a fresh descriptive feature branch from current `main`.
Push that branch and create a pull request into `main`, providing its direct link
for the user to review and merge. Continue on an existing feature branch when
updating its open PR. Do not merge or deploy automatically.

For every new player-facing update, increment the patch version in `package.json`
and the root package versions in `package-lock.json`, and update the main-menu
`#appVersion` label in `index.html` to `Alpha X.Y.Z`. Use that version in the
newest changelog heading. Refine the same version when updating an unmerged PR.
Keep the Alpha label until the user requests a different release stage. Android
versionName reads this package version automatically; preserve its increasing
versionCode and any explicit release overrides.
