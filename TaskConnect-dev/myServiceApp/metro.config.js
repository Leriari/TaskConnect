const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const defaultConfig = getDefaultConfig(__dirname);

// This line is the crucial part for resolving the Firebase Auth issue
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;