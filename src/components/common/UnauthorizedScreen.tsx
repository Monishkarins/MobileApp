import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LiquidBackground } from './LiquidBackground';
import { GlassCard } from '../glass/GlassCard';
import { Colors, FontSize, Spacing, Radius } from '../../theme';

interface UnauthorizedScreenProps {
  /** Optional override message for the blocked feature. */
  message?: string;
}

/**
 * Shown when a role attempts to open a screen it isn't permitted to access
 * (e.g. a deep link, or a cross-tab button that bypasses the role-aware menu).
 * Mirrors the web portal's UnauthorizedScreen behaviour.
 */
export function UnauthorizedScreen({ message }: UnauthorizedScreenProps) {
  const nav = useNavigation<any>();

  return (
    <LiquidBackground>
      <View style={styles.container}>
        <GlassCard variant="danger" style={styles.card}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>Access Restricted</Text>
          <Text style={styles.message}>
            {message ?? 'Your role does not have access to this feature.'}
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => (nav.canGoBack() ? nav.goBack() : nav.navigate('MoreMenu'))}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Go Back</Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing[5] },
  card:      { alignItems: 'center', paddingVertical: Spacing[8], paddingHorizontal: Spacing[5] },
  icon:      { fontSize: 44, marginBottom: Spacing[4] },
  title:     { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white, marginBottom: Spacing[2] },
  message:   { fontSize: FontSize.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing[5] },
  btn:       { backgroundColor: Colors.yellow, borderRadius: Radius.lg, paddingHorizontal: Spacing[6], paddingVertical: Spacing[3] },
  btnText:   { fontSize: FontSize.base, fontWeight: '800', color: Colors.navy },
});
