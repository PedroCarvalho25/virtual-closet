const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const config = getDefaultConfig(__dirname);
// Local npm cache/test exports are not app source. Avoid scanning them on startup.
config.resolver.blockList = [
  /[/\\]\.npm-cache[/\\]/,
  /[/\\]\.tools[/\\]/,
  /[/\\]test-results[/\\]/,
];
module.exports = withNativeWind(config, { input: './global.css' });
