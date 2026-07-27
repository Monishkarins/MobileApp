import React, { useState } from 'react';
import {
  LayoutAnimation,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import {
  LiquidBackground,
  GlassCard,
  ScreenHeader,
} from '../../../components';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Faq = {
  q: string;
  a: string;
};

const FAQS: Faq[] = [
  {
    q: 'What is FASTag double debit and how do I claim it?',
    a: 'A double debit happens when the same toll plaza charges your FASTag more than once for a single crossing. Open the Toll Transactions report, locate the duplicate entry and raise a Claim (DA). Karins verifies the transaction with the toll authority and the disputed amount is credited back to your wallet once approved — usually within a few working days.',
  },
  {
    q: 'How do recharge and wallet balance work?',
    a: 'Your fleet wallet funds all FASTag toll debits. Recharge from the Wallet screen via UPI, net banking or card; the balance updates instantly. Toll charges are deducted automatically as vehicles cross plazas. If the balance runs low you will receive a low-balance alert so you can top up before a vehicle is blocked at a plaza.',
  },
  {
    q: 'Why is my toll rate wrong and how is it verified?',
    a: 'Toll rates are set by NHAI / the concessionaire based on vehicle class, axle count and plaza. If a charge looks wrong it is usually a vehicle-class mismatch. Karins cross-checks each debit against the published plaza rate card and your registered vehicle class. If a discrepancy is confirmed, raise a claim and the difference is refunded after verification.',
  },
  {
    q: 'How do I track e-Challans?',
    a: 'The e-Challan report lists traffic violation challans detected against your registered vehicles, with the plaza/location, offence and amount. Challans are synced from the official sources periodically. Tap a challan to view details and settle it through the linked government payment portal.',
  },
  {
    q: 'What do RC/DL compliance alerts mean?',
    a: 'Compliance alerts flag vehicles whose Registration Certificate (RC) or a driver whose Driving Licence (DL) is expiring or has expired. The Compliance (RC/DL) report shows each document, its expiry date and status so you can renew before a vehicle or driver becomes non-compliant and risks penalties.',
  },
  {
    q: 'How is PIN login secured?',
    a: 'You can set a 4-digit PIN from Profile after signing in with your password. The PIN is stored as a secure hash on Karins servers — never in plain text on your device. Enable Quick PIN Login on a device to sign in faster; you can still use mobile number and password at any time.',
  },
  {
    q: 'Which roles can recharge?',
    a: 'Wallet recharge is restricted to Admin and Finance roles. Operations and Viewer roles can see balances, transactions and reports but cannot add funds. If you need recharge access, ask your fleet administrator to update your role.',
  },
  {
    q: 'How do I contact support?',
    a: 'Use the Contact Support options below to call, email or message us on WhatsApp. Our team is available during business hours and can help with claims, recharges, compliance and account questions. Please keep your vehicle number or transaction reference handy for faster resolution.',
  },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <View style={styles.chevronBox}>
      <View
        style={[
          styles.chevron,
          { transform: [{ rotate: open ? '-135deg' : '45deg' }] },
        ]}
      />
    </View>
  );
}

export default function FAQScreen() {
  const [open, setOpen] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(prev => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  return (
    <LiquidBackground>
      <ScreenHeader title="Help & FAQ" showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {FAQS.map((f, i) => {
          const isOpen = open.has(i);
          return (
            <GlassCard key={i} style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggle(i)}
                style={styles.qRow}>
                <Text style={styles.q}>{f.q}</Text>
                <Chevron open={isOpen} />
              </TouchableOpacity>
              {isOpen && (
                <View style={styles.aWrap}>
                  <Text style={styles.a}>{f.a}</Text>
                </View>
              )}
            </GlassCard>
          );
        })}

        <GlassCard variant="info" style={styles.support}>
          <Text style={styles.supportTitle}>Contact Support</Text>
          <Text style={styles.supportSub}>
            We are here to help with claims, recharges and compliance.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.action}
              activeOpacity={0.8}
              onPress={() => Linking.openURL('tel:+919000000000')}>
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.action}
              activeOpacity={0.8}
              onPress={() => Linking.openURL('mailto:support@karins.in')}>
              <Text style={styles.actionText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.action}
              activeOpacity={0.8}
              onPress={() => Linking.openURL('https://wa.me/919000000000')}>
              <Text style={styles.actionText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </ScrollView>
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[6],
    gap: Spacing[3],
  },
  card: {},
  qRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  q: {
    flex: 1,
    paddingRight: Spacing[3],
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  chevronBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 9,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.text.subtle,
  },
  aWrap: {
    marginTop: Spacing[3],
    paddingTop: Spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  a: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 21,
  },
  support: {
    marginTop: Spacing[2],
  },
  supportTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing[2],
  },
  supportSub: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Spacing[4],
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  action: {
    flex: 1,
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    alignItems: 'center',
    backgroundColor: Colors.glass.bgMedium,
    borderWidth: 1,
    borderColor: Colors.glass.border,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.blue,
  },
});
