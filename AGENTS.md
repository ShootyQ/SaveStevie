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

Use the `dev` branch for ongoing development and pushes unless the user specifies
another branch. Do not merge or deploy automatically.
