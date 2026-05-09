const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
    assetExts: ['png', 'jpg', 'jpeg', 'gif', 'tflite', 'bin', 'json', 'mp3', 'wav'],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
