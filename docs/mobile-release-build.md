# Android release build (Expo SDK 54 / RN 0.81)

How to produce a standalone, sideloadable release APK for `@kairos/mobile` on
Windows. The app is built with New Architecture enabled and Hermes bytecode,
with no Metro/dev-server required at runtime.

> Verified working recipe. The following sections exist because the default
> Expo/Gradle flow fails on Windows monorepos — each one addresses a specific
> failure mode documented in [Troubleshooting](#troubleshooting).

## Prerequisites

- Node 20+, pnpm workspace (repo root `apps/mobile` is the mobile app)
- JDK 17+ (builds here use JDK 21)
- Android SDK: `ANDROID_HOME` (e.g. `D:\Android\Sdk`) with platform/`build-tools`
- CMake `3.30.5` available (check `cmake --version`; the native builds pin it)
- Docker for the MySQL/Redis dev containers (`@kairos/api`)

## 1. Node modules + junctions

The native Android sources (`react-native-screens`, `react-native-worklets`,
`expo-modules-core`) live inside pnpm's `.pnpm` store, whose real paths exceed
Windows' 260-char limit and break C++ builds inside Gradle's module directory.

Fix: create directory junctions from `D:\k\modules\<module>` back to the real
`.pnpm` paths (short, flat paths), then map them in `settings.gradle`:

```
settings.gradle (apps/mobile/android)
  project(":react-native-screens").projectDir = new File(rootDir, "../../../modules/react-native-screens")
  /* same for react-native-worklets, expo-modules-core, ... as needed */
```

Recreate junctions whenever `pnpm install` changes the `.pnpm` versions and
delete `android/build/generated/autolinking` so RNGP re-scans:
`npx @react-native/gradle-plugin` + remove autolinking cache before building.

## 2. CMake pin

Pinning the exact toolchain avoids `ninja ... still dirty` / winsdk failures:

- Set env `CMAKE_VERSION=3.30.5` (the wrapper below does this).
- Also pin the same version inside `expo-modules-core` and (as needed)
  `react-native-screens`/`react-native-worklets` build.gradle `cmake` blocks.

## 3. Bundle (Metro) root fix

`expo export:embed` (called by Gradle) computes the Metro project root via
`@expo/config` `getMetroServerRoot()`, which resolves the **workspace root**
of a pnpm monorepo — in this repo that is `D:\k` instead of `apps/mobile`,
making `expo-router/entry.js` unresolvable.

Fix: set `EXPO_NO_METRO_WORKSPACE_ROOT=1` for the Gradle build. Optionally
pass the config explicitly from `app/build.gradle`:

```
react {
  bundleCommand = "export:embed"
  extraPackagerArgs = ["--config", new File(projectRoot, "metro.config.js").absolutePath]
}
```

## 4. Assemble (release wrapper)

Use a wrapper so the env vars are applied to every Gradle daemon spawn:

```
set "ANDROID_HOME=D:\Android\Sdk"
set "ANDROID_SDK_ROOT=D:\Android\Sdk"
set "CMAKE_VERSION=3.30.5"
set "EXPO_NO_METRO_WORKSPACE_ROOT=1"
set "JAVA_HOME=<jdk21>"
cd /d D:\k\apps\mobile\android
call gradlew.bat :app:assembleRelease --no-daemon --stacktrace
```

APK output:
`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

Force re-bundle after changing `.env`/API URL: Gradle does not track `.env` as
an input. Delete these dirs so `createBundleReleaseJsAndAssets` re-runs:

```
apps/mobile/android/app/build/generated/assets/createBundleReleaseJsAndAssets
apps/mobile/android/app/build/generated/res/createBundleReleaseJsAndAssets
apps/mobile/android/app/build/generated/sourcemaps/createBundleReleaseJsAndAssets
```

## 5. Runtime configuration

- Release APKs block cleartext HTTP; the app talks to a plain-http LAN API, so
  `AndroidManifest.xml` sets `android:usesCleartextTraffic="true"`.
- The API base URL is baked from `apps/mobile/.env`:
  `EXPO_PUBLIC_API_URL=http://<pc-lan-ip>:4000` (a compile-time constant).
- The PC's first-party API must be reachable on that LAN IP:
  `start-api.cmd` (or `node --env-file=D:\k\.env apps/api/... tsx src/index.ts`).
- Dev services: docker containers `kairos-mysql` (host `:3307`) and
  `kairos-redis` (host `:6380`) must be healthy.

## Sideload

Serve the APK over the LAN (any static file server works) and download it on
the phone: `http://<pc-ip>:8080/app-release.apk`. Both devices must be on the
same Wi-Fi. The phone does **not** need Metro, a dev server, or USB.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Could not find react-native-screens` project | absent/outdated junction + autolinking cache; recreate junctions, delete `android/build/generated/autolinking` |
| `ninja: error ... 'build.ninja' still dirty after 100 tries` | C++ toolchain mismatch; pin CMake 3.30.5, destress RAM, reduce Gradle workers (`workers.max=2`) |
| AAPT2/daemon crashes under RAM pressure | Android heap too large; free RAM and lower Gradle `-Xmx`/`org.gradle.jvmargs`, `--no-daemon` |
| `Unable to resolve ... entry.js from <workspace-root>/` | Metro rooted at monorepo root; set `EXPO_NO_METRO_WORKSPACE_ROOT=1` |
| Bundle `UP-TO-DATE` after `.env` change | Gradle doesn't track `.env`; delete generated bundle dirs (see above) |
| App crashes instantly; no network calls | debug via beacon logging from `app/_layout.tsx` (boot/js-error) before stripping; see README status |