const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .wasm files as assets (required for expo-sqlite web support)
config.resolver.assetExts.push('wasm');

module.exports = config;
