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

module.exports = () => {
  const expo = base.expo;
  return {
    ...expo,
    android: {
      ...expo.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? expo.android?.googleServicesFile,
    },
  };
};
