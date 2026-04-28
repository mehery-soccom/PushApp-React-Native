const path = require('path');
const { getDefaultConfig } = require('@react-native/metro-config');
const { getConfig } = require('react-native-builder-bob/metro-config');
const pkg = require('../package.json');

const root = path.resolve(__dirname, '..');
const rootNodeModules = path.join(root, 'node_modules');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = getConfig(getDefaultConfig(__dirname), {
  root,
  pkg,
  project: __dirname,
});

// Ensure Metro can resolve hoisted workspace dependencies (e.g. react-native).
config.watchFolders = [...new Set([...(config.watchFolders || []), root])];
config.resolver = {
  ...(config.resolver || {}),
  nodeModulesPaths: [
    ...new Set([...(config.resolver?.nodeModulesPaths || []), rootNodeModules]),
  ],
};

module.exports = config;
