import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  LiquidBackground, GlassCard, EmptyState, ScreenHeader,
} from '../../../components';
import { AlertDot } from '../../../components/icons';
import { Colors, FontSize, Spacing, Radius } from '../../../theme';
import { fmtDateTime } from '../../../utils/format';
import type { FleetNotification } from '../../../services/notifications/notificationTypes';
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../services/notifications/notificationCenter';
import { notificationEvents } from '../../../services/notifications/notificationEvents';
import {
  dashboardHeader,
  dashboardBody,
  DASHBOARD_LIGHT_WHITE,
} from '../../dashboard/dashboardTypography';
import type { MainTabParamList, MoreStackParamList } from '../../../navigation/types';

// More-stack screens can also jump to sibling tabs (Claims) for claim alerts.
type NotificationsNav = CompositeNavigationProp<
  NativeStackNavigationProp<MoreStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

/** Deep-link targets for actionable inbox rows (dashboard-derived + push). */
type NotificationAction =
  | { label: string; kind: 'more'; screen: 'RCList' | 'DLList' }
  | { label: string; kind: 'more'; screen: 'ChallanList'; params: MoreStackParamList['ChallanList'] }
  | {
    label: string;
    kind: 'tab';
    tab: 'Claims';
    screen: 'ClaimsList';
    params: { initialFilter: 'APPROVED' };
  };

interface ComplianceBodyRow {
  label: string;
  expired: string;
  expiring: string;
}

/**
 * RC expiry notifications store multi-line doc counts in `detail` (tray expand /
 * inbox card). Parse that text back into structured rows to color risky counts.
 */
function parseComplianceBody(body: string): ComplianceBodyRow[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawLabel, rawCounts = ''] = line.split(':');
      const [expired = '0', expiring = '0'] = rawCounts.split('/').map((part) => part.trim());
      return {
        label: rawLabel?.trim() || '—',
        expired,
        expiring,
      };
    });
}

function resolveNotificationAction(item: FleetNotification): NotificationAction | null {
  if (item.category === 'rc_expiry' || item.data?.screen === 'RCList') {
    return { label: 'View RC', kind: 'more', screen: 'RCList' };
  }

  if (item.category === 'echallan' || item.data?.screen === 'ChallanList') {
    // Pending challans are the reason this alert exists — open that filter directly.
    return {
      label: 'View Challan',
      kind: 'more',
      screen: 'ChallanList',
      params: { initialStatus: 'Pending' },
    };
  }

  if (item.category === 'dl_expiry' || item.data?.screen === 'DLList') {
    return { label: 'View DL', kind: 'more', screen: 'DLList' };
  }

  if (item.category === 'claim_update' || item.data?.screen === 'ClaimsList') {
    // Dashboard claim alert is built from approved FY claims — land on that chip.
    return {
      label: 'View Claims',
      kind: 'tab',
      tab: 'Claims',
      screen: 'ClaimsList',
      params: { initialFilter: 'APPROVED' },
    };
  }

  return null;
}

export default function NotificationsScreen() {
  const navigation = useNavigation<NotificationsNav>();
  const [items, setItems] = useState<FleetNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(() => {
    setItems(loadNotifications());
  }, []);

  useEffect(() => {
    return notificationEvents.subscribe(reload);
  }, [reload]);

  // Frozen tab stacks skip React updates — always reload from MMKV on focus.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const markRead = useCallback((id: string) => {
    setItems(markNotificationRead(id));
  }, []);

  const markAllRead = useCallback(() => {
    setItems(markAllNotificationsRead());
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  const handleOpenAction = useCallback((item: FleetNotification) => {
    const action = resolveNotificationAction(item);
    if (!action) return;

    markNotificationRead(item.id);

    if (action.kind === 'tab') {
      navigation.navigate(action.tab, {
        screen: action.screen,
        params: action.params,
      });
      return;
    }

    if (action.screen === 'ChallanList') {
      navigation.navigate('ChallanList', action.params);
      return;
    }

    navigation.navigate(action.screen);
  }, [navigation]);

  const hasUnread = items.some((item) => !item.read);

  const renderItem = ({ item }: { item: FleetNotification }) => {
    const action = resolveNotificationAction(item);
    // Prefer multi-line detail for inbox cards; body alone is the collapsed tray summary.
    const displayText = item.detail?.trim() || item.body;
    const complianceRows = item.category === 'rc_expiry' ? parseComplianceBody(displayText) : [];

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => markRead(item.id)}>
        <GlassCard variant={item.read ? 'default' : 'info'} style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.read && styles.titleUnread]}>
              {item.title}
            </Text>
            {!item.read ? (
              <View style={styles.dotWrap}>
                <AlertDot size={9} color={Colors.info} />
              </View>
            ) : null}
          </View>
          {complianceRows.length > 0 ? (
            <View style={styles.complianceBody}>
              {complianceRows.map((row) => (
                <View key={row.label} style={styles.complianceRow}>
                  <Text style={styles.complianceLabel}>{row.label}</Text>
                  <View style={styles.complianceCounts}>
                    <Text style={styles.complianceExpired}>{row.expired}</Text>
                    <Text style={styles.complianceSeparator}>/</Text>
                    <Text style={styles.complianceExpiring}>{row.expiring}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            // No numberOfLines — let long alert copy wrap onto the next line fully.
            <Text style={styles.body}>{displayText}</Text>
          )}
          <View style={styles.footerRow}>
            <Text style={styles.time}>{fmtDateTime(item.createdAt)}</Text>
            {action ? (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleOpenAction(item)}
                activeOpacity={0.85}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.actionBtnText}>{action.label}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </GlassCard>
      </TouchableOpacity>
    );
  };

  return (
    <LiquidBackground>
      <ScreenHeader
        title="Notifications"
        showBack
        rightElement={(
          <TouchableOpacity
            onPress={markAllRead}
            disabled={!hasUnread}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.markAll, !hasUnread && styles.markAllDisabled]}>
              Mark all as read
            </Text>
          </TouchableOpacity>
        )}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />
        )}
        ListEmptyComponent={(
          <EmptyState
            title="No notifications yet"
            subtitle="Alerts for wallet, tolls, claims, and compliance will show up here."
            icon=""
          />
        )}
      />
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[8],
    gap: Spacing[2],
  },
  card: {
    padding: Spacing[4],
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing[2],
    marginBottom: Spacing[1],
  },
  dotWrap: {
    width: 9,
    height: 9,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    ...dashboardHeader,
    fontWeight: '600',
    flex: 1,
  },
  titleUnread: {
    fontWeight: '700',
  },
  body: {
    ...dashboardBody,
    lineHeight: 18,
    marginBottom: Spacing[2],
  },
  complianceBody: {
    gap: 6,
    marginBottom: Spacing[2],
  },
  // Keep the six RC docs scan-friendly: label left, risk counts right.
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  complianceLabel: {
    ...dashboardBody,
    flex: 1,
    fontWeight: '600',
  },
  complianceCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  complianceExpired: {
    ...dashboardBody,
    color: Colors.dangerLight,
    fontWeight: '700',
  },
  complianceSeparator: {
    ...dashboardBody,
    color: DASHBOARD_LIGHT_WHITE,
    fontWeight: '600',
  },
  complianceExpiring: {
    ...dashboardBody,
    color: Colors.warningLight,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing[2],
  },
  time: {
    fontSize: FontSize.xs,
    color: DASHBOARD_LIGHT_WHITE,
    flexShrink: 1,
  },
  actionBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    flexShrink: 0,
  },
  actionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.white,
  },
  markAll: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.white,
  },
  markAllDisabled: {
    color: DASHBOARD_LIGHT_WHITE,
    opacity: 0.5,
  },
});
