/**
 * Fleet slice — holds vehicles and drivers for the app's core screens.
 *
 * PRODUCTION SAFETY: mock data is seeded ONLY in dev builds (ENABLE_MOCK_DATA
 * is derived from __DEV__, so it is always false in a release build). In
 * production the slice starts empty and is hydrated by `loadFleet` once the
 * backend list endpoints are wired. Mock data can never ship.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Vehicle, Driver } from '../../types/fleet';
import { ENABLE_MOCK_DATA } from '../../config/env';

interface FleetState {
  vehicles: Vehicle[];
  drivers: Driver[];
  loading: boolean;
  loadedAt: string | null;
}

// Dev-only seed. The dynamic import keeps the mock dataset out of the release
// bundle entirely when tree-shaking — and the guard keeps it out at runtime.
function devSeed(): { vehicles: Vehicle[]; drivers: Driver[] } {
  if (!ENABLE_MOCK_DATA) return { vehicles: [], drivers: [] };
  const { mockVehicles, mockDrivers } = require('../../data/mockFleet');
  return { vehicles: mockVehicles, drivers: mockDrivers };
}

const seed = devSeed();

const initialState: FleetState = {
  vehicles: seed.vehicles,
  drivers: seed.drivers,
  loading: false,
  loadedAt: null,
};

/**
 * Placeholder for the real fetch — wire to vehicleApi/complianceApi once the
 * list endpoints are confirmed. Kept here so screens already dispatch it.
 */
export const loadFleet = createAsyncThunk('fleet/load', async () => {
  // TODO: const { data } = await vehicleApi.list(...);
  return { vehicles: [] as Vehicle[], drivers: [] as Driver[] };
});

const fleetSlice = createSlice({
  name: 'fleet',
  initialState,
  reducers: {
    setVehicles(state, action: PayloadAction<Vehicle[]>) {
      state.vehicles = action.payload;
    },
    setDrivers(state, action: PayloadAction<Driver[]>) {
      state.drivers = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadFleet.pending, (state) => { state.loading = true; })
      .addCase(loadFleet.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.loadedAt = new Date().toISOString();
        if (payload.vehicles.length) state.vehicles = payload.vehicles;
        if (payload.drivers.length) state.drivers = payload.drivers;
      })
      .addCase(loadFleet.rejected, (state) => { state.loading = false; });
  },
});

export const { setVehicles, setDrivers } = fleetSlice.actions;
export default fleetSlice.reducer;
