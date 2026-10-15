# Desktop Alpha testing

Save Stevie's Electron client bundles the full game, art and audio for offline play. It uses desktop mouse/keyboard controls, a resizable window, F11 fullscreen and standard zoom controls. The browser and Android versions remain unchanged.

## Download from GitHub

1. Open [Build desktop test clients](https://github.com/ShootyQ/SaveStevie/actions/workflows/desktop-test.yml).
2. Select a successful build for the version/branch you want. Pull-request and `feat/desktop-*` branch builds are available before merging; main builds run after each merge. You can also use **Run workflow** after the workflow exists on main.
3. Under **Artifacts**, choose **Save-Stevie-Alpha-Windows-x64** (or the matching Mac/Linux artifact). GitHub requires you to be signed in to download artifacts.
4. Extract the downloaded artifact ZIP. Inside is the versioned client ZIP plus a SHA-256 checksum; extract the client ZIP too.
5. Windows: open **Save Stevie.exe** inside the extracted folder. Keep the entire folder together. Do not run it inside the ZIP.

These are unsigned Alpha test builds, not installers or auto-updating releases. Windows may show an unknown-publisher prompt. macOS test builds are not notarized; use the normal system option to open a trusted test app rather than disabling Gatekeeper. macOS has separate Apple Silicon and Intel artifacts. Linux: extract the ZIP (preserving executable permissions) and run `./'Save Stevie'`. Linux's Electron runtime needs a desktop session and usual Chromium system libraries. Keep its sandbox enabled for normal play.

Artifact downloads expire after 30 days. Each new build generates its own versioned ZIP. No automatic installation or release publishing occurs.

## Desktop controls and notebook pages

Mouse/keyboard play fills the available window. The touch Erase, Screen and Pause strip is hidden: left-drag draws, right-drag erases, Esc opens/closes Pause, and the desktop client uses F11 for fullscreen. WASD aiming remains available. Phone touch controls remain unchanged.

My Notebook uses one full-width grid with every destination visible. Settings has direct keyboard-accessible categories: Sound & music, Controls, native Display, Notebook, Saves & support and Test a fight. Test setup separates Encounter and Starting build, keeping Start available. Phone layouts retain their existing touch preferences. Long desktop lists pack multiple entries and complete grid rows onto each Previous/Next page; headings stay with their content. Live buttons keep their normal behavior. Stevie’s scrap tutorial automatically reveals the page containing the free Starter Eraser purchase; the visual spotlight lets clicks reach that real button.

## Display options

In the desktop app, open Settings → Display. Choose windowed/fullscreen mode, window resolution (800×600 through 2560×1440), UI scale (85–130%), render quality (50/75/100%) and frame limit (30/60/120 or display refresh rate). Click Apply display settings. Preferences persist between launches. F11 also changes and saves fullscreen mode.

Fullscreen uses the display’s native resolution. Window resolution presets fit the available screen instead of creating a window off its edges. Lower quality reduces canvas pixel count without changing wall/enemy coordinates; a frame limit reduces drawing frequency without changing simulation speed. The browser and Android do not show these native controls. Reset display defaults returns to windowed 1280×720, 100% UI/detail and 60 FPS. Resizing manually remains available.

## Progress and backup

Desktop saves are separate from web/Android saves. In the original game, use **Settings → Backup & restore** to export a backup; import it in the desktop client's same screen. The app's secure local origin and `SaveStevie` user-data folder remain stable between Alpha versions, so replacing the client folder retains desktop progress.

Download/export actions use the native save dialog. Problem reports open GitHub in the system browser. Internet is not needed to play the bundled game. Existing best-wave keys and purchase formats are unchanged.

## Local builds

Install Node 24 and run `npm ci` in the repository. Electron downloads its runtime during installation for `npm run desktop:start`.

- `npm run desktop:start`: stage the current game and launch a development client.
- `npm run desktop:windows`: package a Windows x64 ZIP (cross-building from Linux/macOS is supported).
- `npm run desktop:linux`: package Linux x64.
- `npm run desktop:mac`: package Apple Silicon macOS on a Mac.
- `node scripts/build-desktop.cjs darwin x64`: Intel Mac build on a Mac.
- `npm run test:desktop`: verify local asset routing and staged contents.

Downloads are written to `_desktop/clients/`. Only the generated static site and small desktop shell are packaged; repository sources, Android files, tests, developer dependencies and Git history are excluded. Electron's own runtime licenses remain bundled. Packaging produces SHA-256 files next to each ZIP.

For packaging-only CI, `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci` avoids downloading the development Electron binary; the packager fetches the pinned runtime it needs separately. Native Windows/macOS behavior still needs a test on those systems. In a proxy-based cloud workspace using Node 24, set `NODE_USE_ENV_PROXY=1` for runtime downloads; keep checksum verification enabled.

## Reward picks, HUD and run results (Alpha 0.1.94)

Desktop rewards show every offered card alongside a fixed detail panel. Click or press 1–4 to inspect; Enter confirms. Reroll clears the old selection, held keys cannot buy repeatedly, and full effect slots still require a separate replacement choice. Tab stays inside the reward screen. Phone rewards retain tap-to-inspect and confirm.

The desktop playfield hides upgrade badges and ink tags; Build in the HUD, or B during play, opens the complete paused reference, including a dedicated Doodle Scraps collection. Ink, HP, wave/time, score and the Freehand meter remain available.

Death and victory show the existing score ledger, final hit where known, build highlights, synergies and new-record/practice status. Legendary walls and equipped effects take priority in highlights. Results never award points or progress. Main-menu/restart actions stay outside the scrollable summary; victory retains Endless continuation, and test runs retain same-build restart.

Alpha 0.1.95 adds Settings → Notebook → Discoveries (the Discoveries button is in the Scrap projects section on phones). Confirm a normal-run reward reveals its reference, while inspecting, rejecting, skipping and dev/test builds do not. Acquired Doodle Scraps, activated synergies and the three legendary wall transformations have separate entries; purchased Notebook projects are included from saved ranks. Check category/search filtering, page controls, and returning through Settings/Pause without resuming combat early. The collection persists between runs/reloads and is included in backup/recovery transactions; importing an older backup without a collection preserves existing discoveries. Historical run choices cannot be reconstructed.

Targeted checks: `node tests/browser-discoveries.cjs`; discovery persistence and backup checks also run in `node tests/validate.cjs`.

## PC interaction polish (Alpha 0.1.96)

Monster Notes uses a searchable list on the left and one full illustrated reference on the right. Clicking or using Up/Down/Home/End changes the selection. Unknown monsters remain hidden; phone notes retain the card layout.

Settings → Controls remaps Draw and Erase to left/middle/right mouse buttons, aiming to letters/arrows/Space, and Pause to a letter/arrows/Space/Esc. Mouse conflicts swap Draw and Erase; duplicate or reserved keys are rejected. B, reward digits, Enter, Tab and F11 retain their menu actions. Escape always backs out of menus. Controls save locally; Reset controls restores left/right, WASD and Esc. Touch drawing/erasing is independent of PC remaps. Tutorial mouse gestures and current control prompts follow saved bindings.

The playfield uses a pencil cursor with its point at the draw location and an eraser cursor with the existing actual-radius ring. Insufficient ink changes the idle cursor; trying to draw displays a brief nearby note and highlights the ink bar. Free/discounted route starts use the actual stroke eligibility check. Menus use the ordinary pointer with visible hover, press and keyboard-focus states.

Desktop blur or a hidden tab freezes gameplay behind a click-to-resume note. Focus returning and key presses cannot resume it. Click Resume restores the prior pause/menu state; a partial stroke is cancelled and input is cleared. Browser/OS modifier shortcuts remain available. Phone background behavior is unchanged.

Checks: `node tests/validate.cjs` and `node tests/browser-desktop-polish.cjs`.
