/**
 * Role / privilege APIs — same endpoints the web portal uses for SideNav access.
 */

import { apiClient } from './client';
import type { AccessMenuItem } from '../../types/accessMenus';

export interface UserAccessResponse {
  accessMenus: AccessMenuItem[];
}

export const roleApi = {
  /**
   * Effective menus for this user: user-specific override, else role default
   * from access_menus_portal (Role Management).
   */
  getUserAccess: (userId: number, roleId: number) =>
    apiClient.get<UserAccessResponse>('/auth/role/getUserAccess', {
      params: { userId, roleId },
    }),
};
