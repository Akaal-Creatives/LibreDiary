import { api } from './api';

export interface SetupStatus {
  setupRequired: boolean;
  reason?: 'NO_SETTINGS' | 'SETUP_INCOMPLETE';
  siteName?: string;
}

export interface SetupInput {
  admin: {
    email: string;
    password: string;
    name?: string;
  };
  organization: {
    name: string;
    slug: string;
  };
  siteName?: string;
}

export interface SetupResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    isSuperAdmin: boolean;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}

export const setupService = {
  /**
   * Check if setup is required
   */
  async getStatus(): Promise<SetupStatus> {
    return api.get<SetupStatus>('/setup/status');
  },

  /**
   * Complete the initial setup
   */
  async complete(input: SetupInput): Promise<SetupResult> {
    return api.post<SetupResult>('/setup/complete', input);
  },
};
