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
const fs = require('fs');
const base = require('./app.json');

/**
 * A googleServicesFile that exists, or undefined. Both Firebase config files
 * (google-services.json, GoogleService-Info.plist) are gitignored, so a fresh
 * clone — and any machine that hasn't downloaded them — does not have them.
 * Pointing app.json at a MISSING file makes `expo config` fail to parse, which
 * takes Metro down entirely ("Cannot read properties of undefined (reading
 * 'exists')"). Resolve to the path only when the file is actually present; on
 * EAS the *_FILE env secret provides it instead (see below).
 */
function fileIfExists(relPath) {
  if (!relPath) return undefined;
  try {
    return fs.existsSync(relPath) ? relPath : undefined;
  } catch {
    return undefined;
  }
}

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
const ANDROID_VERSION_CODE = 90;

/** android.config without its googleMaps entry. */
function withoutGoogleMaps(config) {
  if (!config) return {};
  const { googleMaps, ...rest } = config;
  return rest;
}

module.exports = () => {
  const expo = base.expo;

  // Android Firebase config: EAS secret path, else the local file if present,
  // else omit — never a dangling path (that crashes Metro).
  const androidGoogleServices =
    process.env.GOOGLE_SERVICES_JSON ?? fileIfExists(expo.android?.googleServicesFile);
  // iOS Firebase config, same rule. GoogleService-Info.plist is gitignored, so
  // it is typically absent on dev machines and only present on an EAS iOS build
  // via the GOOGLE_SERVICES_INFO_PLIST file secret.
  const iosGoogleServices =
    process.env.GOOGLE_SERVICES_INFO_PLIST ?? fileIfExists(expo.ios?.googleServicesFile);

  const ios = { ...expo.ios };
  if (iosGoogleServices) ios.googleServicesFile = iosGoogleServices;
  else delete ios.googleServicesFile;

  const android = { ...expo.android };
  delete android.googleServicesFile; // re-added below only if it resolves

  return {
    ...expo,
    ios,
    android: {
      ...android,
      versionCode: ANDROID_VERSION_CODE,
      ...(androidGoogleServices ? { googleServicesFile: androidGoogleServices } : {}),
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
