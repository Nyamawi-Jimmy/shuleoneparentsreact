// Dynamic config layered over app.json.
//
// Why this exists: android.googleServicesFile points at google-services.json,
// which .gitignore deliberately excludes ("environment config … do not commit").
// EAS builds from the git archive, so on the build server that file simply does
// not exist and prebuild fails within seconds.
//
// The fix is EAS's file-type secret: `GOOGLE_SERVICES_JSON` is uploaded once and
// arrives on the builder as an absolute PATH, which we use in place of the local
// relative path. Locally the env var is unset and the checked-out file is used,
// so `expo run:android` and `expo prebuild` behave exactly as before.
//
//   npx eas-cli env:create --scope project --name GOOGLE_SERVICES_JSON \
//     --type file --value ./google-services.json --visibility secret
//
// app.config.js takes precedence over app.json, and we spread app.json's `expo`
// block so this file stays a thin override rather than a second source of truth.
const base = require('./app.json');

// The Maps key has the same problem for a different reason: app.json is STATIC
// JSON and does not interpolate "${EXPO_PUBLIC_ANDROID_MAPS_API_KEY}". That
// literal string was written into AndroidManifest.xml as a manifest
// placeholder, and the merger then failed with
//   "requires a placeholder substitution but no value for
//    <EXPO_PUBLIC_ANDROID_MAPS_API_KEY> is provided"
// — which is what killed the release build. Resolving it here is the whole
// reason a dynamic config is needed.
const MAPS_KEY = process.env.EXPO_PUBLIC_ANDROID_MAPS_API_KEY ?? '';

// Android versionCode. MUST stay above whatever is live on Play, or the upload
// is rejected as a downgrade.
//
// The live release is 88. EAS was previously on appVersionSource "remote" with
// its own counter, which had no idea about Play and was issuing 4, 5, 6 — every
// one of those would have been rejected. Keeping the number here means it is
// reviewable in git instead of hidden in EAS state.
//
// Bump this for every Play upload.
const ANDROID_VERSION_CODE = 89;

/** android.config without its googleMaps entry. */
function withoutGoogleMaps(config) {
  if (!config) return {};
  const { googleMaps, ...rest } = config;
  return rest;
}

module.exports = () => {
  const expo = base.expo;
  return {
    ...expo,
    android: {
      ...expo.android,
      versionCode: ANDROID_VERSION_CODE,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? expo.android?.googleServicesFile,
      config: {
        // Drop app.json's googleMaps outright — keeping it would spread the
        // literal "${EXPO_PUBLIC_ANDROID_MAPS_API_KEY}" straight back in
        // whenever the env var is missing, reproducing the exact failure.
        ...withoutGoogleMaps(expo.android?.config),
        // Omit the block entirely when unset rather than emitting an empty
        // key: an empty <meta-data> still fails validation on some AGP
        // versions, whereas absent simply means "no Google Maps".
        ...(MAPS_KEY ? { googleMaps: { apiKey: MAPS_KEY } } : {}),
      },
    },
  };
};
