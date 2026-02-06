import { api } from './api';

export interface CommentAuthor {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface Comment {
  id: string;
  pageId: string;
  parentId: string | null;
  blockId: string | null;
  content: string;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedById: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: CommentAuthor;
  resolvedBy: { id: string; name: string | null } | null;
  replies?: Comment[];
}

export interface CreateCommentInput {
  content: string;
  parentId?: string;
  blockId?: string;
}

export interface UpdateCommentInput {
  content: string;
}

export const commentsService = {
  /**
   * Get all comments for a page
   */
  async getComments(orgId: string, pageId: string, blockId?: string): Promise<Comment[]> {
    const params = blockId ? `?blockId=${blockId}` : '';
    const response = await api.get<{ comments: Comment[] }>(
      `/organizations/${orgId}/pages/${pageId}/comments${params}`
    );
    return response.comments;
  },

  /**
   * Get comment count for a page
   */
  async getCommentCount(orgId: string, pageId: string, unresolvedOnly = false): Promise<number> {
    const params = unresolvedOnly ? '?unresolvedOnly=true' : '';
    const response = await api.get<{ count: number }>(
      `/organizations/${orgId}/pages/${pageId}/comments/count${params}`
    );
    return response.count;
  },

  /**
   * Create a new comment
   */
  async createComment(orgId: string, pageId: string, input: CreateCommentInput): Promise<Comment> {
    const response = await api.post<{ comment: Comment }>(
      `/organizations/${orgId}/pages/${pageId}/comments`,
      input
    );
    return response.comment;
  },

  /**
   * Update a comment
   */
  async updateComment(
    orgId: string,
    pageId: string,
    commentId: string,
    input: UpdateCommentInput
  ): Promise<Comment> {
    const response = await api.patch<{ comment: Comment }>(
      `/organizations/${orgId}/pages/${pageId}/comments/${commentId}`,
      input
    );
    return response.comment;
  },

  /**
   * Delete a comment
   */
  async deleteComment(orgId: string, pageId: string, commentId: string): Promise<void> {
    await api.delete(`/organizations/${orgId}/pages/${pageId}/comments/${commentId}`);
  },

  /**
   * Resolve or unresolve a comment
   */
  async resolveComment(
    orgId: string,
    pageId: string,
    commentId: string,
    resolve: boolean
  ): Promise<Comment> {
    const response = await api.post<{ comment: Comment }>(
      `/organizations/${orgId}/pages/${pageId}/comments/${commentId}/resolve`,
      { resolve }
    );
    return response.comment;
  },
};
