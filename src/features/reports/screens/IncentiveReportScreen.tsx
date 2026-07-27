/**
 * Incentive Report — web /transaction/incentive-report (CommissionReport) parity.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl,
} from 'react-native';
import { reportApi, type IncentiveReportRow } from '../../../services/api/reportApi';
import { apiClient } from '../../../services/api/client';
import { useAppSelector } from '../../../store';
import {
  LiquidBackground, GlassCard, SkeletonCard, EmptyState, ScreenHeader, StatusPill,
} from '../../../components';
import { Colors, FontSize, Spacing } from '../../../theme';
import { requiresAdminContextPicker } from '../../../types/auth';
import IncentiveReportFilterPanel from '../components/IncentiveReportFilterPanel';
import {
  ReportExportDropdown,
  ReportFilterButton,
  ReportHeaderActions,
} from '../components/ReportExportMenu';
import { runReportExport, stripReportPagination } from '../utils/reportExportUtils';
import {
  EMPTY_INCENTIVE_FILTERS,
  buildIncentiveQueryParams,
  formatIncentiveAmount,
  hasActiveIncentiveFilters,
  incentiveStatusVariant,
  type IncentiveReportFilters,
} from '../constants/incentiveReportFilters';

const PAGE_SIZE = 25;

function displayIncentiveAmount(value?: string | number | null): string {
  return `₹${formatIncentiveAmount(value)}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default function IncentiveReportScreen() {
  const { user } = useAppSelector((s) => s.auth);

  const [draftFilters, setDraftFilters] = useState<IncentiveReportFilters>(EMPTY_INCENTIVE_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<IncentiveReportFilters>(EMPTY_INCENTIVE_FILTERS);
  const [customers, setCustomers] = useState<Array<{ yapEntityId: string; firstName: string }>>([]);
  const [rows, setRows] = useState<IncentiveReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const showCustomerColumns = requiresAdminContextPicker(user?.roleKey);
  const showCommissionPct = user?.roleKey === 'ADMIN';

  const filtersActive = useMemo(
    () => hasActiveIncentiveFilters(appliedFilters),
    [appliedFilters],
  );

  useEffect(() => {
    if (!requiresAdminContextPicker(user?.roleKey)) return;
    (async () => {
      try {
        const { data } = await apiClient.get<any>('/user/fastag-users');
        const mapped = (data?.data ?? []).map((item: any) => ({
          yapEntityId: String(item.yapEntityId ?? ''),
          firstName: item.firstName ?? '',
        }));
        setCustomers(mapped);
      } catch { /* optional filter source */ }
    })();
  }, [user?.roleKey]);

  const fetchData = useCallback(async (filters: IncentiveReportFilters, isRefresh = false) => {
    isRefresh ? setRefresh(true) : setLoading(true);
    try {
      const { data } = await reportApi.getIncentiveReport(
        buildIncentiveQueryParams(filters, 1, PAGE_SIZE),
      );
      setRows(data.result ?? []);
      setTotal(data.count ?? 0);
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { fetchData(appliedFilters); }, [fetchData, appliedFilters]);

  const handleSearch = () => {
    setAppliedFilters({ ...draftFilters });
    setShowFilters(false);
  };

  const handleReset = () => {
    setDraftFilters(EMPTY_INCENTIVE_FILTERS);
    setAppliedFilters(EMPTY_INCENTIVE_FILTERS);
  };

  const exportParams = useMemo(
    () => stripReportPagination(buildIncentiveQueryParams(appliedFilters, 1, PAGE_SIZE)),
    [appliedFilters],
  );

  const handleExportExcel = async () => {
    setShowExportMenu(false);
    setExporting('excel');

    await runReportExport(
      'excel',
      () => reportApi.exportIncentiveReportExcel(exportParams),
      'Incentive_Report.xlsx',
    );

    setExporting(null);
  };

  const renderItem = ({ item }: { item: IncentiveReportRow }) => (
    <GlassCard style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          {showCustomerColumns ? (
            <>
              <Text style={styles.title}>{item.customerName ?? '—'}</Text>
              <Text style={styles.subtitle}>{item.customerId ?? '—'}</Text>
            </>
          ) : (
            <Text style={styles.title}>{item.month ?? '—'} · {item.year ?? '—'}</Text>
          )}
        </View>
        {item.transactionStatus ? (
          <StatusPill label={item.transactionStatus} variant={incentiveStatusVariant(item.transactionStatus)} small />
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{item.bankName ?? '—'}</Text>
        {showCustomerColumns ? (
          <Text style={styles.meta}>{item.month ?? '—'} · {item.year ?? '—'}</Text>
        ) : null}
      </View>

      <View style={styles.metricsRow}>
        <Metric label="Debit" value={displayIncentiveAmount(item.debit)} />
        <Metric label="Credit" value={displayIncentiveAmount(item.credit)} />
        <Metric label="Base Amt" value={displayIncentiveAmount(item.baseAmount)} />
      </View>

      <View style={styles.metricsRow}>
        {showCommissionPct ? (
          <Metric label="Inc(%)" value={`${formatIncentiveAmount(item.commissionPercentage)}%`} />
        ) : null}
        <Metric label="Inc Amt" value={displayIncentiveAmount(item.overallAmount)} />
        <Metric label="Adj Amt" value={displayIncentiveAmount(item.adjustmentAmount)} />
        <Metric label="Total Amt" value={displayIncentiveAmount(item.totalAmount)} />
      </View>

      {showCustomerColumns && item.comment ? (
        <Text style={styles.comment} numberOfLines={2}>Comment: {item.comment}</Text>
      ) : null}
    </GlassCard>
  );

  return (
    <LiquidBackground>
      <ScreenHeader
        title="Incentive Report"
        subtitle={total ? `${total} records` : undefined}
        showBack
        rightElement={(
          <ReportHeaderActions
            showMenu={showExportMenu}
            exporting={exporting}
            excelOnly
            onToggleMenu={() => setShowExportMenu((open) => !open)}
            onExportExcel={handleExportExcel}
            filterButton={(
              <ReportFilterButton
                active={showFilters || filtersActive}
                onPress={() => setShowFilters((open) => !open)}
              />
            )}
          />
        )}
      />

      <ReportExportDropdown
        showMenu={showExportMenu}
        excelOnly
        onExportExcel={handleExportExcel}
      />

      {showFilters ? (
        <IncentiveReportFilterPanel
          roleKey={user?.roleKey}
          draft={draftFilters}
          customers={customers}
          onChange={setDraftFilters}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      ) : null}

      {loading ? (
        <View style={{ padding: Spacing[4], gap: 8 }}>
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => String(row.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(appliedFilters, true)} tintColor={Colors.blue} />
          }
          ListEmptyComponent={
            <EmptyState title="No incentive records" icon="💰" subtitle="No incentive report matches your filters." />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </LiquidBackground>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing[4], paddingTop: Spacing[2], gap: 8, paddingBottom: 32 },
  card: { padding: 13, gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: FontSize.base, fontWeight: '700', color: Colors.white },
  subtitle: { fontSize: FontSize.xs, color: Colors.text.subtle, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  meta: { fontSize: FontSize.xs, color: Colors.text.secondary },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { minWidth: '28%', gap: 2 },
  metricLabel: { fontSize: FontSize.xs, color: Colors.text.label, fontWeight: '600' },
  metricValue: { fontSize: FontSize.sm, color: Colors.white, fontWeight: '700' },
  comment: { fontSize: FontSize.xs, color: Colors.text.subtle, marginTop: 2 },
});
