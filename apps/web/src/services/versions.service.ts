import { api } from './api';

export interface PageVersion {
  id: string;
  pageId: string;
  version: number;
  title: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface VersionsResponse {
  success: boolean;
  data: PageVersion[];
}

export interface VersionResponse {
  success: boolean;
  data: PageVersion;
}

export const versionsService = {
  /**
   * Get all versions for a page
   */
  async getVersions(orgId: string, pageId: string): Promise<PageVersion[]> {
    const response = await api.get<PageVersion[]>(
      `/organizations/${orgId}/pages/${pageId}/versions`
    );
    return response;
  },

  /**
   * Get a specific version
   */
  async getVersion(orgId: string, pageId: string, versionId: string): Promise<PageVersion> {
    const response = await api.get<PageVersion>(
      `/organizations/${orgId}/pages/${pageId}/versions/${versionId}`
    );
    return response;
  },

  /**
   * Create a new version snapshot
   */
  async createVersion(orgId: string, pageId: string): Promise<PageVersion> {
    const response = await api.post<PageVersion>(
      `/organizations/${orgId}/pages/${pageId}/versions`,
      {}
    );
    return response;
  },

  /**
   * Restore a page to a specific version
   */
  async restoreVersion(
    orgId: string,
    pageId: string,
    versionId: string
  ): Promise<{ id: string; title: string }> {
    const response = await api.post<{ id: string; title: string }>(
      `/organizations/${orgId}/pages/${pageId}/versions/${versionId}/restore`,
      {}
    );
    return response;
  },
};
