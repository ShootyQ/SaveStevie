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
