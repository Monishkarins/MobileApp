/**
 * Debounced fleet-wide vehicle search — web /fleet-dashboard/vehicle-search parity.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { dashboardApi } from '../../../services/api/dashboardApi';
import type { VehicleSearchRecord } from '../../../types/vehicleSearch';

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

type VehicleSearchChallan = VehicleSearchRecord['challans'][number] & {
  challanStatus?: string;
};

type RawVehicleSearchRecord = Omit<VehicleSearchRecord, 'challans'> & {
  challans?: VehicleSearchChallan[];
};

function normalizeVehicleSearchRecord(raw: RawVehicleSearchRecord): VehicleSearchRecord {
  return {
    ...raw,
    challans: (raw.challans ?? []).map((challan) => ({
      no: challan.no,
      date: challan.date,
      amount: challan.amount,
      status: challan.status ?? challan.challanStatus,
    })),
  };
}

interface UseVehicle360Search {
  query: string;
  setQuery: (value: string) => void;
  results: VehicleSearchRecord[];
  isSearching: boolean;
}

export function useVehicle360Search(): UseVehicle360Search {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VehicleSearchRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleRef = useRef(false);

  const runSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < MIN_QUERY) {
      setResults([]);
      return;
    }

    staleRef.current = false;
    setIsSearching(true);

    try {
      const { data } = await dashboardApi.searchVehicles(searchQuery.trim());
      if (!staleRef.current) {
        setResults((data.vehicles ?? []).map(normalizeVehicleSearchRecord));
      }
    } catch {
      if (!staleRef.current) setResults([]);
    } finally {
      if (!staleRef.current) setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    staleRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.trim().length < MIN_QUERY) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    timerRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => {
      staleRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, runSearch]);

  return { query, setQuery, results, isSearching };
}
