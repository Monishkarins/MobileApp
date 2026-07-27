import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LiquidBackground, GlassCard } from '../../../components';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../../theme';
import { useAppSelector } from '../../../store';

// Feature Products / Home — the landing page for VEHICLE_GROUP_ADMIN.
// Mirrors the web portal's /home (HOME_PATH) route used in
// vehicleGroupAdminMenuItems[0] of SideNav.tsx, instead of the Fleet Dashboard.

interface Product {
  key: string;
  icon: string;
  title: string;
  blurb: string;
}

const PRODUCTS: Product[] = [
  { key: 'fastag',     icon: '🏷', title: 'FASTag Fleet Management', blurb: 'Centralised FASTag wallet, recharge and live toll tracking for your entire fleet.' },
  { key: 'toll',       icon: '🛣', title: 'Toll Analytics & Audit', blurb: 'Plaza-wise toll spend insights, wrong-debit detection and double-debit recovery.' },
  { key: 'compliance', icon: '🛡', title: 'VAHAN & SARATHI Compliance', blurb: 'RC, insurance, fitness, permit, PUCC and driving-licence expiry monitoring.' },
  { key: 'challan',    icon: '⚠️', title: 'e-Challan Tracking', blurb: 'Automated challan discovery, state-wise alerts and payment history.' },
  { key: 'claims',     icon: '📋', title: 'DA Claims Recovery', blurb: 'End-to-end claim filing for wrong, double and suspicious toll deductions.' },
  { key: 'reports',    icon: '📊', title: 'Reports & Reconciliation', blurb: 'M2P and Karins reconciliation, transaction reports and data archival.' },
];

export default function ProductsHomeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const customerName = useAppSelector((s) => s.auth.user?.customerName);

  return (
    <LiquidBackground>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.wordmark}>Karins</Text>
            <Text style={styles.tagline}>FLEET INTELLIGENCE PLATFORM</Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => nav.navigate('More', { screen: 'Profile' })}
            accessibilityLabel="Profile"
          >
            <Text style={styles.avatarText}>{customerName?.charAt(0) ?? 'U'}</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <GlassCard variant="dark" style={styles.hero}>
          <Text style={styles.heroEyebrow}>WELCOME{customerName ? `, ${customerName.toUpperCase()}` : ''}</Text>
          <Text style={styles.heroTitle}>Karins Fleet Solutions</Text>
          <Text style={styles.heroBody}>
            Explore the products and services available to your vehicle group. Use the tabs
            below to manage vehicles, toll transactions, claims and compliance.
          </Text>
        </GlassCard>

        {/* Products */}
        <Text style={styles.sectionLabel}>FEATURE PRODUCTS</Text>
        {PRODUCTS.map((p) => (
          <GlassCard key={p.key} style={styles.productCard}>
            <View style={styles.productRow}>
              <View style={styles.productIconWrap}>
                <Text style={styles.productIcon}>{p.icon}</Text>
              </View>
              <View style={styles.productText}>
                <Text style={styles.productTitle}>{p.title}</Text>
                <Text style={styles.productBlurb}>{p.blurb}</Text>
              </View>
            </View>
          </GlassCard>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  scroll:        { paddingHorizontal: Spacing[4], paddingBottom: 32 },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[4] },
  wordmark:      { fontSize: 28, color: Colors.white, letterSpacing: 1.5, fontFamily: FontFamily.logo },
  tagline:       { fontSize: FontSize.xs, color: 'rgba(255, 255, 255, 0.96)', letterSpacing: 1.6, marginTop: 4, fontWeight: '600' },
  avatar:        { width: 38, height: 38, backgroundColor: Colors.blue, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.glass.borderStrong },
  avatarText:    { fontSize: FontSize.base, fontWeight: '700', color: Colors.white },
  hero:          { marginBottom: Spacing[4] },
  heroEyebrow:   { fontSize: FontSize.xs, color: Colors.text.label, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  heroTitle:     { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.white, marginBottom: 8 },
  heroBody:      { fontSize: FontSize.base, color: Colors.text.secondary, lineHeight: 21 },
  sectionLabel:  { fontSize: FontSize.xs, fontWeight: '700', color: Colors.text.label, letterSpacing: 1.2, marginBottom: Spacing[2] },
  productCard:   { marginBottom: 10 },
  productRow:    { flexDirection: 'row', gap: 12, alignItems: 'center' },
  productIconWrap: { width: 46, height: 46, borderRadius: Radius.md, backgroundColor: Colors.infoBg, borderWidth: 1, borderColor: Colors.infoBorder, alignItems: 'center', justifyContent: 'center' },
  productIcon:   { fontSize: 24 },
  productText:   { flex: 1 },
  productTitle:  { fontSize: FontSize.base, fontWeight: '700', color: Colors.white, marginBottom: 3 },
  productBlurb:  { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 18 },
});
