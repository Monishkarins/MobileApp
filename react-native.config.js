/**
 * React Native asset + platform linking config.
 * Firebase is Android-only for now — disabled on iOS so CocoaPods does not pull RNFB.
 * Run `npx react-native-asset` after adding files under assets/fonts.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts/'],
  dependencies: {
    // No GoogleService-Info.plist / iOS push setup yet — keep RNFB off the iOS target
    '@react-native-firebase/app': {
      platforms: {
        ios: null,
      },
    },
    '@react-native-firebase/messaging': {
      platforms: {
        ios: null,
      },
    },
  },
};
