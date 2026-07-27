/**
 * Ticket inbox — mobile equivalent of web's Tickets/index.tsx list view.
 * RBAC scoping happens entirely server-side (ticketAccessMW.js's
 * canViewTickets + ticketRbacScope.js's row-level filter) — this screen
 * just renders whatever GET /tickets returns for the signed-in user.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  LiquidBackground, GlassCard, EmptyState, ScreenHeader, SkeletonCard,
} from '../../../components';
import { StatusPill } from '../../../components/common/StatusPill';
import { Colors, FontSize, Spacing } from '../../../theme';
import { fmtDateTime } from '../../../utils/format';
import { useAppDispatch, useAppSelector } from '../../../store';
import { fetchTicketList } from '../../../store/slices/ticketsSlice';
import type { TicketRecord } from '../../../services/api/ticketsApi';
import type { MoreStackParamList } from '../../../navigation/types';
import { ticketPriorityLabel, ticketPriorityVariant, ticketStatusLabel, ticketStatusVariant } from '../utils/ticketUiHelpers';
import { CAN_RAISE_TICKET_ROLES } from '../../../rbac/ticketCapabilities';

type TicketListNav = NativeStackNavigationProp<MoreStackParamList, 'TicketList'>;

// CAN_RAISE_TICKET_ROLES now comes from src/rbac/ticketCapabilities.ts —
// see that file's header comment. This is the exact constant whose earlier,
// hand-typed-here version drifted from the backend and caused the
// CUSTOMER_GROUP_ADMIN 403 bug.

function getCustomerDisplayName(ticket: TicketRecord): string {
  return ticket.customer?.user?.name || ticket.whatsappGroup?.groupName || 'Unknown customer';
}

export default function TicketListScreen() {
  const nav = useNavigation<TicketListNav>();
  const dispatch = useAppDispatch();
  const roleKey = useAppSelector((s) => s.auth.user?.roleKey);
  const { list, listLoading, listError } = useAppSelector((s) => s.tickets);
  const [refreshing, setRefreshing] = useState(false);

  const canRaiseTicket = CAN_RAISE_TICKET_ROLES.includes(roleKey || '');

  const load = useCallback(() => {
    dispatch(fetchTicketList({ pageSize: 50 }));
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  // Interim "real-time" mechanism — 15s polling while the inbox is focused,
  // matching the backend design doc's documented polling approach (no
  // websockets yet; see TICKETING_ARCHITECTURE.md Sharp Edge #9).
  useFocusEffect(
    useCallback(() => {
      const intervalId = setInterval(load, 15000);
      return () => clearInterval(intervalId);
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchTicketList({ pageSize: 50 })).finally(() => setRefreshing(false));
  }, [dispatch]);

  const renderItem = ({ item }: { item: TicketRecord }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => nav.navigate('TicketChat', { ticketId: item.id })}
    >
      <GlassCard style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.ticketNumber} numberOfLines={1}>{item.ticketNumber}</Text>
          <StatusPill
            label={ticketStatusLabel(item.status)}
            variant={ticketStatusVariant(item.status)}
            small
          />
        </View>
        <Text style={styles.customerName} numberOfLines={1}>{getCustomerDisplayName(item)}</Text>
        {item.subject ? (
          <Text style={styles.subject} numberOfLines={2}>{item.subject}</Text>
        ) : null}
        <View style={styles.bottomRow}>
          <StatusPill
            label={ticketPriorityLabel(item.priority)}
            variant={ticketPriorityVariant(item.priority)}
            small
          />
          <Text style={styles.time}>{fmtDateTime(item.createdAt)}</Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <LiquidBackground>
      <ScreenHeader
        title="Tickets"
        showBack
        rightElement={canRaiseTicket ? (
          <TouchableOpacity
            style={styles.raiseBtn}
            onPress={() => nav.navigate('RaiseTicket')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Raise a new ticket"
          >
            <Text style={styles.raiseBtnText}>+ Raise Ticket</Text>
          </TouchableOpacity>
        ) : undefined}
      />

      {listLoading && list.length === 0 ? (
        <View style={styles.skeletonWrap}>
          <SkeletonCard style={styles.skeleton} />
          <SkeletonCard style={styles.skeleton} />
          <SkeletonCard style={styles.skeleton} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.blue} />
          )}
          ListEmptyComponent={(
            <EmptyState
              title={listError ? 'Failed to load tickets' : 'No tickets yet'}
              subtitle={listError || 'Support tickets raised over WhatsApp will show up here.'}
              icon="💬"
              actionLabel={listError ? 'Retry' : undefined}
              onAction={listError ? load : undefined}
            />
          )}
        />
      )}
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
  skeletonWrap: { paddingHorizontal: Spacing[4], gap: Spacing[3] },
  skeleton: { height: 92, marginBottom: 0 },
  card: { padding: Spacing[4] },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketNumber: { color: Colors.infoLight, fontSize: FontSize.base, fontWeight: '700', flex: 1, marginRight: Spacing[2] },
  customerName: { color: Colors.text.primary, fontSize: FontSize.base, fontWeight: '600', marginBottom: 2 },
  subject: { color: Colors.text.secondary, fontSize: FontSize.sm, marginBottom: Spacing[2] },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing[1],
  },
  time: { color: Colors.text.muted, fontSize: FontSize.xs },
  raiseBtn: {
    backgroundColor: Colors.blue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  raiseBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
});
