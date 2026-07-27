/**
 * Karins Solutions product grid — catalogue tiles with navigation or enquiry.
 */

import React, { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { GlassCard } from '../../../components';
import { Colors, Spacing, Radius } from '../../../theme';
import {
  KARINS_SERVICES,
  withGpsServiceStatus,
  type KarinsService,
  type KarinsServiceStatus,
} from '../constants/karinsServices';
import ServiceEnquiryModal from './ServiceEnquiryModal';
import { dashboardHeader, dashboardContentFont, DASHBOARD_LIGHT_WHITE } from '../dashboardTypography';

const STATUS_STYLE: Record<KarinsServiceStatus, { label: string; fg: string; bg: string; border: string }> = {
  ACTIVE: { label: 'Active', fg: Colors.successLight, bg: Colors.successBg, border: Colors.successBorder },
  INACTIVE: { label: 'Inactive', fg: Colors.text.subtle, bg: Colors.glass.bg, border: Colors.glass.border },
  AVAILABLE: { label: 'Available', fg: Colors.infoLight, bg: Colors.infoBg, border: Colors.infoBorder },
  COMING_SOON: { label: 'Soon', fg: Colors.text.subtle, bg: Colors.glass.bg, border: Colors.glass.border },
  ACTION_REQUIRED: { label: 'Action', fg: Colors.dangerLight, bg: Colors.dangerBg, border: Colors.dangerBorder },
};

type RouteTarget = { tab: string; screen: string };

interface KarinsSolutionsCardProps {
  fleetSize?: number;
  isGpsActive?: boolean;
  onNavigate?: (target: RouteTarget) => void;
}

function resolveRouteTarget(service: KarinsService): RouteTarget | null {
  switch (service.routeKey) {
    case 'toll':
      return { tab: 'Toll', screen: 'TollList' };
    case 'challan':
      return { tab: 'More', screen: 'ChallanList' };
    case 'rc':
      return { tab: 'More', screen: 'RCList' };
    case 'dl':
      return { tab: 'More', screen: 'DLList' };
    default:
      return null;
  }
}

function isServiceClickable(service: KarinsService): boolean {
  return !!service.enquiryOption || !!resolveRouteTarget(service);
}

function KarinsSolutionsCard({
  fleetSize,
  isGpsActive = false,
  onNavigate,
}: KarinsSolutionsCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [enquiryService, setEnquiryService] = useState<string | undefined>();

  const services = useMemo(
    () => withGpsServiceStatus(KARINS_SERVICES, isGpsActive),
    [isGpsActive],
  );

  const openEnquiry = (serviceName?: string) => {
    setEnquiryService(serviceName);
    setModalOpen(true);
  };

  const handleTilePress = (service: KarinsService) => {
    if (service.enquiryOption) {
      openEnquiry(service.enquiryOption);
      return;
    }

    const target = resolveRouteTarget(service);
    if (target && onNavigate) {
      onNavigate(target);
    }
  };

  return (
    <>
      <GlassCard style={styles.card} noPadding>
        <View style={styles.head}>
          <View style={styles.headLeft}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>🔗</Text>
            </View>
            <Text style={styles.title}>Karins Solutions</Text>
          </View>
          <TouchableOpacity style={styles.requestBtn} onPress={() => openEnquiry()}>
            <Text style={styles.requestText}>+ Request</Text>
          </TouchableOpacity>
        </View>

        {/* Catalogue is laid out as a single horizontal row of fixed-width tiles
            (same pattern as the vehicle status cards) so the dashboard stays
            compact; the user swipes sideways to browse the rest. */}
        <ScrollView
          horizontal
          contentContainerStyle={styles.grid}
          nestedScrollEnabled
          showsHorizontalScrollIndicator={Platform.OS === 'ios'}
        >
          {services.map((service) => {
            const st = STATUS_STYLE[service.status];
            const clickable = isServiceClickable(service);

            return (
              <TouchableOpacity
                key={service.key}
                style={[styles.tile, clickable && styles.tileClickable]}
                activeOpacity={clickable ? 0.75 : 1}
                onPress={clickable ? () => handleTilePress(service) : undefined}
              >
                <View style={styles.tileTop}>
                  <View style={[styles.tileIcon, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <Text style={styles.tileEmoji}>{service.icon}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <View style={[styles.badgeDot, { backgroundColor: st.fg }]} />
                    <Text style={[styles.badgeText, { color: st.fg }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={styles.tileName} numberOfLines={1}>{service.name}</Text>
                <Text style={styles.tileDesc} numberOfLines={2}>{service.description}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </GlassCard>

      <ServiceEnquiryModal
        visible={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEnquiryService(undefined);
        }}
        fleetSize={fleetSize}
        initialService={enquiryService}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing[3] },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[3],
    paddingBottom: Spacing[2],
  },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.glass.bgDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 16 },
  title: {
    ...dashboardHeader,
  },
  requestBtn: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  requestText: {
    fontSize: dashboardContentFont.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  grid: {
    paddingHorizontal: Spacing[3],
    paddingBottom: Spacing[3],
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    // Fixed-width tiles in a single horizontal line, matching the vehicle cards.
    width: 180,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.glass.border,
    backgroundColor: Colors.glass.bgDark,
  },
  tileClickable: {
    borderColor: Colors.glass.borderStrong,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileEmoji: { fontSize: 16 },
  tileName: {
    fontSize: dashboardContentFont.sm,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 3,
  },
  tileDesc: {
    fontSize: dashboardContentFont.xs,
    color: DASHBOARD_LIGHT_WHITE,
    lineHeight: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: dashboardContentFont.tiny,
    fontWeight: '700',
  },
});

export default React.memo(KarinsSolutionsCard);
