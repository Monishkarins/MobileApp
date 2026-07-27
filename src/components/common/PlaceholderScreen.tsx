import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { LiquidBackground } from './LiquidBackground';
import { ScreenHeader } from './ScreenHeader';
import { EmptyState } from './EmptyState';

/**
 * Lightweight placeholder for modules that are routable from the role-aware
 * menu but whose full screen is not yet built (see CLAUDE.md "What Needs To Be
 * Built"). Reads its title from the route params so a single component can back
 * several stub routes.
 */
export function PlaceholderScreen() {
  const route = useRoute<any>();
  const title: string = route.params?.title ?? 'Coming Soon';
  return (
    <LiquidBackground>
      <ScreenHeader title={title} showBack />
      <View style={styles.body}>
        <EmptyState
          icon="🚧"
          title={`${title} is on the way`}
          subtitle="This module is being built for the mobile app. It's available on the web portal in the meantime."
        />
      </View>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
});
