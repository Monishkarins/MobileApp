/**
 * Typed Redux selectors — reusable slice accessors for screens and thunks.
 */

import type { RootState } from './rootReducer';

export const selectAuthState = (state: RootState) => state.auth;
