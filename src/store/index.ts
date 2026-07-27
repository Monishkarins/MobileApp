/**
 * Redux store barrel — central app state for authentication and fleet modules.
 */

export { store } from './storeInstance';
export type { AppDispatch } from './storeInstance';
export type { RootState } from './rootReducer';
export { useAppDispatch, useAppSelector } from './hooks';
export { selectAuthState } from './selectors';
