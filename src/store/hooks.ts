/**
 * Typed Redux hooks — wrap react-redux primitives with app-specific types
 * so components get full type-safety on state and dispatch without re-importing types.
 */

import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState } from './rootReducer';
import type { AppDispatch } from './storeInstance';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
