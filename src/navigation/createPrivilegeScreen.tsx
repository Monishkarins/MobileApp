/**
 * Wraps a stack screen so Role Management restrictions still apply when the
 * user reaches it via deep link or a stale tab (menu hide alone is not enough).
 */

import React from 'react';
import { UnauthorizedScreen } from '../components/common/UnauthorizedScreen';
import { useHasAccess } from '../hooks/useHasAccess';
import type { PrivilegeId } from '../types/accessMenus';

export function createPrivilegeScreen(
  Screen: React.ComponentType<any>,
  privilegeIds: PrivilegeId | PrivilegeId[],
  message = 'Your role does not have access to this feature.',
) {
  function PrivilegeGuardedScreen(props: any) {
    const allowed = useHasAccess(privilegeIds);
    if (!allowed) {
      return <UnauthorizedScreen message={message} />;
    }
    return <Screen {...props} />;
  }

  const screenName = Screen.displayName || Screen.name || 'Screen';
  PrivilegeGuardedScreen.displayName = `PrivilegeGate(${screenName})`;
  return PrivilegeGuardedScreen;
}
