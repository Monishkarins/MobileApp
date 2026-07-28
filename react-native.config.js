/**
 * React Native asset + platform linking config.
 * Firebase is enabled on both platforms now that GoogleService-Info.plist exists.
 * Run `npx react-native-asset` after adding files under assets/fonts.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts/'],
};
