/**
 * Root reducer map — explicit state typing avoids circular imports between
 * store/index and hooks when screens select auth or fleet slices.
 */

import authReducer from './slices/authSlice';
import fleetReducer from './slices/fleetSlice';
import roleReducer from './slices/roleSlice';

export const rootReducer = {
  auth: authReducer,
  fleet: fleetReducer,
  role: roleReducer,
};

export type RootState = {
  auth: ReturnType<typeof authReducer>;
  fleet: ReturnType<typeof fleetReducer>;
  role: ReturnType<typeof roleReducer>;
};
