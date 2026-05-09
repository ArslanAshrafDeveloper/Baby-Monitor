module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: { '@': './src' },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    ],
    // Re-add 'react-native-reanimated/plugin' here if you start using
    // react-native-reanimated. It must be the LAST plugin in the list.
  ],
};
