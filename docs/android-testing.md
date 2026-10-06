# Save Stevie: Android testing

The game is bundled into a Capacitor Android app, including artwork, fonts, music
and sounds. It plays offline; ordinary web hosting still works without npm.
This setup includes no ads or payment SDKs and does not publish automatically.

## Start here

1. Install [Android Studio](https://developer.android.com/studio) and Node.js 24 LTS
   on your computer. In Android Studio's SDK Manager, install Android SDK 36,
   Build Tools 36.0.0 and Platform Tools. Use JDK 21 for Gradle.
2. In a terminal in this repository, run:

   ```sh
   npm ci
   npm run android:sync
   npm run android:open
   ```

3. Connect your Android phone by USB. Enable Developer options and USB debugging
   on the phone, accept its computer authorization prompt, select it in Android
   Studio and press Run. Android 7.0 or newer is supported.
4. Try drawing, music, effects, rotation, the Android Back button and switching
   to another app during combat. Combat should pause until you resume.

The package ID is **com.shootyq.savestevie**. Confirm this before the first Play
upload: Google Play keeps that ID permanently. To change it before uploading,
update capacitor.config.json, the Gradle namespace/applicationId, the Java package
and its folder, and strings.xml's package/custom URL scheme together.

## A downloadable APK without Android Studio

Once this branch is pushed, its pull request runs **Build Android test app** in
GitHub Actions. Download the **Save-Stevie-debug-APK** artifact from the successful
run, unzip it and install app-debug.apk on your phone. Android may ask you to allow
installation from the browser or file manager. This APK is for direct testing;
Google Play needs the signed release bundle below.

Locally, `npm run android:debug` creates
`android/app/build/outputs/apk/debug/app-debug.apk` once the SDK is installed.

## First Google Play internal test

1. In Play Console, create **Save Stevie**, choose Game and Free, and complete
   the required declarations honestly. Internal testing does not make it a
   public production release. Follow any setup requirements shown in your account.
2. Run `npm run android:sync`, open Android Studio, and choose
   **Build → Generate Signed App Bundle / APK → Android App Bundle**.
3. Create an **upload keystore** in a private folder outside this repository.
   Keep a secure backup of it, its alias and passwords. Select the release build.
   Do not send the key or passwords in chat or commit them to Git.
4. Enable **Play App Signing** when prompted. Google holds the app signing key;
   your upload key signs bundles you send to Play.
5. Open **Testing → Internal testing**, create a release and upload the signed
   `.aab` produced by Android Studio. Add brief test notes and complete the steps
   Play Console requires to roll it out to internal testers.
6. Add your own and your testers' Google-account email addresses to the tester
   list, then copy the **opt-in link**. Each tester opens it using an approved
   account, joins the test and installs through Google Play. This is a separate
   link from the existing GitHub Pages web game.

Before switching from a debug install to the Play install, note that their signing
certificates differ. You generally must uninstall the debug app first; uninstalling
can clear its locally saved scraps and records. Android saves are separate from
browser saves. Updates of the same signed installation preserve local game data.
No browser-to-app save transfer is included.

## Repeat builds from GitHub

For signed bundles without building on your computer, add these repository
**Settings → Secrets and variables → Actions → New repository secret** values:

| Secret | Value |
| --- | --- |
| ANDROID_KEYSTORE_BASE64 | Your upload keystore encoded as base64 |
| ANDROID_KEYSTORE_PASSWORD | Keystore password |
| ANDROID_KEY_ALIAS | Upload key alias |
| ANDROID_KEY_PASSWORD | Key password |

Encode the file locally and copy the result directly into the secret field:

```sh
# macOS/Linux: replace the example path with your own private keystore
base64 < /private/path/upload-key.jks | tr -d '\n'
```

```powershell
# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\private\upload-key.jks')) | Set-Clipboard
```

Base64 is encoding, not encryption. Store the output only as a secret. The workflow
uses signing secrets only when you manually request a signed build, never for a
pull request build. It deletes the temporary key afterward.

After the workflow reaches the repository's default branch, open GitHub
**Actions → Build Android test app → Run workflow**, choose your branch and enable
**signed_bundle**. Download **Save-Stevie-signed-internal-testing-AAB**, unzip it and
upload the AAB to a new Play internal-testing release. Testers get an app update.
There is no automatic Play upload or production rollout.

The workflow assigns an increasing versionCode from its run number. Every Play
upload must have a code higher than the last uploaded version. For local builds,
set `ANDROID_VERSION_CODE` and optionally `ANDROID_VERSION_NAME` in your shell
before syncing/building, or edit the defaults in `android/app/build.gradle`.
If a local code exceeds the workflow run number, adjust the workflow code formula
before the next upload. Do not upload a bundle with a reused code.

A local signed command-line build uses `npm run android:bundle` with all four
signing environment variables: `ANDROID_KEYSTORE_PATH` (absolute path),
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
It refuses to create a Play bundle without those settings. Android Studio's signing
wizard remains an alternative and handles its own signing configuration.

## Before sharing a test build

Check a real phone: offline launch, all sound controls, drawing near screen edges,
rotation, Back/menu behavior, notifications/background pause, sustained play and
saved scraps after restarting. Browser tests do not verify native device behavior.
The Android Back button closes open information/settings panels and opens pause
during combat; on the main menu it exits. Reward-selection screens stay in place.

For each game update, sync again before building so the bundle contains the latest
web assets. A first build downloads the toolchain and takes longer; later builds
reuse it. Play processing time is separate from build time.
