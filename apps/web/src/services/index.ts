export { api, ApiError } from './api';
export { authService } from './auth.service';
export type {
  AuthResponse,
  OrgMembership,
  LoginInput,
  RegisterInput,
  SessionInfo,
  InviteInfo,
} from './auth.service';
export { organizationsService } from './organizations.service';
export type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  MemberWithUser,
  InviteInfo as OrgInviteInfo,
  CreateInviteInput,
  OrganizationWithMembership,
} from './organizations.service';
export { pagesService } from './pages.service';
export type {
  CreatePageInput,
  UpdatePageInput,
  MovePageInput,
  FavoriteWithPage,
} from './pages.service';
export { setupService } from './setup.service';
export type { SetupStatus, SetupInput, SetupResult } from './setup.service';
export * as oauthService from './oauth.service';
export * as adminService from './admin.service';
export type {
  AdminStats,
  AdminUser,
  AdminUserDetail,
  AdminOrganization,
  AdminOrgDetail,
  Pagination,
} from './admin.service';
export { versionsService } from './versions.service';
export type { PageVersion } from './versions.service';
export { commentsService } from './comments.service';
export type {
  Comment,
  CommentAuthor,
  CreateCommentInput,
  UpdateCommentInput,
} from './comments.service';
export { mentionsService } from './mentions.service';
export type { Mention, MentionUser } from './mentions.service';
export { notificationsService } from './notifications.service';
export type {
  NotificationResponse,
  UnreadCountResponse,
  GetNotificationsOptions,
} from './notifications.service';
export {
  searchService,
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from './search.service';
export type { SearchServiceResponse } from './search.service';
