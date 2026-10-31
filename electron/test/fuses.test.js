// Electron fuses: afterPack hook config (không build, không chạy Electron)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const pkg = require('../package.json');
const hook = require('../scripts/afterPack');
const fuses = require('@electron/fuses');

test('package.json runs the fuse afterPack hook and @electron/fuses is a devDependency', () => {
  assert.equal(pkg.build.afterPack, 'scripts/afterPack.js');
  assert.ok(fs.existsSync(path.join(__dirname, '..', pkg.build.afterPack)));
  assert.ok(pkg.devDependencies['@electron/fuses']);
  assert.equal(typeof hook, 'function');
  assert.equal(typeof hook.default, 'function');
  // electron-builder's own electronFuses must not also run with different values
  assert.equal(pkg.build.electronFuses, undefined);
  assert.equal(pkg.build.asar, true, 'OnlyLoadAppFromAsar needs an asar build');
});

test('fuse settings disable Node entry points and enable asar integrity + cookie encryption', () => {
  assert.deepEqual({ ...hook.FUSE_SETTINGS }, {
    RunAsNode: false,
    EnableNodeOptionsEnvironmentVariable: false,
    EnableNodeCliInspectArguments: false,
    EnableEmbeddedAsarIntegrityValidation: true,
    OnlyLoadAppFromAsar: true,
    EnableCookieEncryption: true
  });
  assert.ok(Object.isFrozen(hook.FUSE_SETTINGS));
});

test('buildFuseConfig maps every setting onto the real @electron/fuses enum', () => {
  const config = hook.buildFuseConfig(fuses);
  const { FuseV1Options, FuseVersion } = fuses;
  assert.equal(config.version, FuseVersion.V1);
  assert.equal(config[FuseV1Options.RunAsNode], false);
  assert.equal(config[FuseV1Options.EnableNodeOptionsEnvironmentVariable], false);
  assert.equal(config[FuseV1Options.EnableNodeCliInspectArguments], false);
  assert.equal(config[FuseV1Options.EnableEmbeddedAsarIntegrityValidation], true);
  assert.equal(config[FuseV1Options.OnlyLoadAppFromAsar], true);
  assert.equal(config[FuseV1Options.EnableCookieEncryption], true);
  assert.equal(Object.keys(config).length, 7);
  assert.throws(() => hook.buildFuseConfig({ FuseVersion, FuseV1Options: {} }), /does not know fuse/);
});

test('afterPack targets the packaged Windows executable', () => {
  const context = {
    appOutDir: path.join('dist-installer', 'win-unpacked'),
    electronPlatformName: 'win32',
    packager: { appInfo: { productFilename: 'BangKeoVinhThinh' } }
  };
  assert.equal(hook.executablePath(context), path.join('dist-installer', 'win-unpacked', 'BangKeoVinhThinh.exe'));
});

test('afterPack calls flipFuses with the config (stubbed)', async () => {
  const fusesPath = require.resolve('@electron/fuses');
  const original = require.cache[fusesPath].exports;
  const calls = [];
  require.cache[fusesPath].exports = { ...original, flipFuses: async (...args) => { calls.push(args); } };
  const log = console.log;
  console.log = () => {};
  try {
    await hook({
      appOutDir: 'out',
      electronPlatformName: 'win32',
      packager: { appInfo: { productFilename: 'App' } }
    });
  } finally {
    console.log = log;
    require.cache[fusesPath].exports = original;
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], path.join('out', 'App.exe'));
  assert.deepEqual(calls[0][1], hook.buildFuseConfig(original));
});
