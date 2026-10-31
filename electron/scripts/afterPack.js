// electron-builder afterPack hook: flip Electron fuses on the packaged executable.
// Runs after the app is copied into win-unpacked and before signing / NSIS packaging,
// so the installer and the auto-update payload always ship a hardened binary.
'use strict';

const path = require('path');

// Fuse values (true = on). Kept as plain names so the test can check them without loading @electron/fuses.
const FUSE_SETTINGS = Object.freeze({
  // ELECTRON_RUN_AS_NODE=1 must not turn the signed exe into a generic Node.js interpreter
  RunAsNode: false,
  // NODE_OPTIONS (e.g. --require evil.js) must not inject code into the main process
  EnableNodeOptionsEnvironmentVariable: false,
  // --inspect / --inspect-brk must not open a debugger on the main process
  EnableNodeCliInspectArguments: false,
  // app.asar header hash is checked against the hash embedded in the exe (electron-builder writes it)
  EnableEmbeddedAsarIntegrityValidation: true,
  // never load the app from a loose resources/app folder next to the asar
  OnlyLoadAppFromAsar: true,
  // cookies are encrypted at rest with an OS-protected key
  EnableCookieEncryption: true
});

function buildFuseConfig(fusesModule) {
  const { FuseVersion, FuseV1Options } = fusesModule;
  const config = { version: FuseVersion.V1 };
  for (const [name, value] of Object.entries(FUSE_SETTINGS)) {
    const option = FuseV1Options[name];
    if (option === undefined) throw new Error(`@electron/fuses does not know fuse ${name}`);
    config[option] = value;
  }
  return config;
}

function executablePath(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  const name = packager.appInfo.productFilename;
  if (electronPlatformName === 'win32') return path.join(appOutDir, `${name}.exe`);
  if (electronPlatformName === 'darwin' || electronPlatformName === 'mas') return path.join(appOutDir, `${name}.app`);
  return path.join(appOutDir, packager.executableName || name);
}

async function afterPack(context) {
  const fuses = require('@electron/fuses');
  const target = executablePath(context);
  // eslint-disable-next-line no-console
  console.log(`  • flipping Electron fuses on ${target}`);
  await fuses.flipFuses(target, buildFuseConfig(fuses));
}

module.exports = afterPack;
module.exports.default = afterPack;
module.exports.FUSE_SETTINGS = FUSE_SETTINGS;
module.exports.buildFuseConfig = buildFuseConfig;
module.exports.executablePath = executablePath;
