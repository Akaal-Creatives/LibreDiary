import { api } from './api';

export interface MentionUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface Mention {
  id: string;
  commentId: string;
  userId: string;
  createdAt: string;
  user: MentionUser;
  comment?: {
    id: string;
    pageId: string;
    content: string;
    createdById: string;
    createdAt: string;
    page: {
      id: string;
      organizationId: string;
      title: string;
    };
    createdBy: MentionUser;
  };
}

export const mentionsService = {
  /**
   * Search users for @mention autocomplete
   */
  async searchUsers(orgId: string, query: string): Promise<MentionUser[]> {
    const response = await api.get<{ users: MentionUser[] }>(
      `/organizations/${orgId}/mentions/users/search?q=${encodeURIComponent(query)}`
    );
    return response.users;
  },

  /**
   * Get all mentions for the current user in the organization
   */
  async getMentions(orgId: string): Promise<Mention[]> {
    const response = await api.get<{ mentions: Mention[] }>(`/organizations/${orgId}/mentions`);
    return response.mentions;
  },
};
