/**
 * Vehicle groups list — placeholder until the full group management screen ships.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LiquidBackground, ScreenHeader, EmptyState } from '../../../components';
import { Spacing } from '../../../theme';

export default function VehicleGroupListScreen() {
  return (
    <LiquidBackground>
      <ScreenHeader title="Vehicle Groups" showBack />
      <View style={styles.body}>
        <EmptyState
          icon="🗂"
          title="Vehicle Groups"
          subtitle="Group management is available on the web portal. Mobile support is coming soon."
        />
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', padding: Spacing[4] },
});
