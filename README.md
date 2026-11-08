# otw-config

The signed config the **Out of this World** app reads at start, published on GitHub Pages
([ADR-0013](https://github.com/kub-x/out-of-this-world-native-app/blob/main/docs/adr/0013-minimum-version-gate.md)).
It can stop a broken build: a build below `minimumBuild`, or listed in `blockedBuilds`, shows "Update required" with
`message` and a button to `updateUrl`, and its games can't be opened.

- **Published:** https://kub-x.github.io/otw-config/app-config.json and `app-config.json.sig`.
- **Signed:** on every push to `main`, `scripts/publish.mjs` adds `issued` (the commit's time) and signs the file with
  ECDSA P-256 / SHA-256, using the repository secret `OTW_CONFIG_SIGNING_KEY`. The apps hold the public key and ignore a
  file whose signature fails, or whose `issued` is older than the last one they accepted.
- **Fail open:** an app that can't fetch or verify the file keeps the last valid one it saved, or plays on.

## Change it

A PR that edits `config.json`; CI validates it. Merging it publishes it within a minute or two; apps pick it up the
next time they start or come back to the front.

| Field | Meaning |
|---|---|
| `ios.minimumBuild`, `android.minimumBuild` | Builds below this number are blocked. `0`: none. The build number is the same on both apps (CFBundleVersion, versionCode). |
| `ios.blockedBuilds`, `android.blockedBuilds` | Build numbers blocked one by one. |
| `ios.updateUrl`, `android.updateUrl` | Where "Update" goes: TestFlight for iOS; `null` hides the button. |
| `message` | The text testers see. |

The process (hotfix, rollback, when to block) is in the app's
[docs/RELEASING.md](https://github.com/kub-x/out-of-this-world-native-app/blob/main/docs/RELEASING.md#hotfix-and-rollback).

## The key

Only in the secret `OTW_CONFIG_SIGNING_KEY`. To replace it: make a new P-256 key, set the secret, and ship app builds
with the new public key **before** publishing with it: builds with the old key ignore files signed with the new one
(they fail open).
