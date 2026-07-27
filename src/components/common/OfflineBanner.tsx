import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { Colors, FontSize, Spacing } from '../../theme';

/**
 * Thin full-width banner shown only while the device is offline.
 * Renders null when connected so it occupies no layout space.
 */
export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.banner}>
        <Text style={styles.text} numberOfLines={1}>
          No internet connection — showing cached data
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: Colors.danger,
  },
  banner: {
    width: '100%',
    backgroundColor: Colors.danger,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
