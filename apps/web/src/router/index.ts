import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { setupService } from '@/services';
import { i18n } from '@/i18n';

declare module 'vue-router' {
  interface RouteMeta {
    title?: string;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    redirect: '/login',
  },
  {
    path: '/setup',
    name: 'setup',
    component: () => import('@/pages/SetupWizardPage.vue'),
    meta: { setup: true, title: 'pageTitle.setup' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { guest: true, title: 'pageTitle.login' },
  },
  {
    path: '/register/:token',
    name: 'register',
    component: () => import('@/pages/RegisterPage.vue'),
    meta: { guest: true, title: 'pageTitle.register' },
    props: true,
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/ForgotPasswordPage.vue'),
    meta: { guest: true, title: 'pageTitle.forgotPassword' },
  },
  {
    path: '/reset-password/:token',
    name: 'reset-password',
    component: () => import('@/pages/ResetPasswordPage.vue'),
    meta: { guest: true, title: 'pageTitle.resetPassword' },
    props: true,
  },
  {
    path: '/verify-email/:token',
    name: 'verify-email',
    component: () => import('@/pages/VerifyEmailPage.vue'),
    meta: { title: 'pageTitle.verifyEmail' },
    props: true,
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/pages/OnboardingPage.vue'),
    meta: { requiresAuth: true, title: 'pageTitle.onboarding' },
  },
  {
    path: '/app',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'app-home',
        redirect: { name: 'dashboard' },
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/app/DashboardPage.vue'),
        meta: { title: 'pageTitle.dashboard' },
      },
      {
        path: 'page/:pageId',
        name: 'page',
        component: () => import('@/pages/app/PageView.vue'),
        props: true,
        meta: { title: 'pageTitle.page' },
      },
      {
        path: 'database/:databaseId',
        name: 'database',
        component: () => import('@/pages/app/DatabaseView.vue'),
        props: true,
        meta: { title: 'pageTitle.database' },
      },
      {
        path: 'templates',
        name: 'templates',
        component: () => import('@/pages/app/TemplatesPage.vue'),
        meta: { title: 'pageTitle.templates' },
      },
      {
        path: 'trash',
        name: 'trash',
        component: () => import('@/pages/app/TrashPage.vue'),
        meta: { title: 'pageTitle.trash' },
      },
      // Organization Settings
      {
        path: 'settings/organization',
        name: 'organization-settings',
        component: () => import('@/pages/app/settings/OrganizationSettingsPage.vue'),
        meta: { title: 'pageTitle.organisationSettings' },
      },
      {
        path: 'settings/members',
        name: 'organization-members',
        component: () => import('@/pages/app/settings/MembersPage.vue'),
        meta: { title: 'pageTitle.members' },
      },
      {
        path: 'settings/invites',
        name: 'organization-invites',
        component: () => import('@/pages/app/settings/InvitesPage.vue'),
        meta: { minRole: 'ADMIN', title: 'pageTitle.invites' },
      },
      {
        path: 'settings/backups',
        name: 'organization-backups',
        component: () => import('@/pages/app/settings/BackupsPage.vue'),
        meta: { minRole: 'ADMIN', title: 'pageTitle.backups' },
      },
      {
        path: 'settings/webhooks',
        name: 'organization-webhooks',
        component: () => import('@/pages/app/settings/WebhooksPage.vue'),
        meta: { minRole: 'ADMIN', title: 'pageTitle.webhooks' },
      },
      // User Settings
      {
        path: 'settings/sessions',
        name: 'user-sessions',
        component: () => import('@/pages/app/settings/SessionsPage.vue'),
        meta: { title: 'pageTitle.sessions' },
      },
      {
        path: 'settings/notifications',
        name: 'notification-settings',
        component: () => import('@/pages/app/settings/NotificationSettingsPage.vue'),
        meta: { title: 'pageTitle.notificationSettings' },
      },
      {
        path: 'settings/api-tokens',
        name: 'api-tokens',
        component: () => import('@/pages/app/settings/ApiTokensPage.vue'),
        meta: { title: 'pageTitle.apiTokens' },
      },
      {
        path: 'settings/data',
        name: 'user-data-privacy',
        component: () => import('@/pages/app/settings/DataPrivacyPage.vue'),
        meta: { title: 'pageTitle.dataPrivacy' },
      },
      // Create Organization
      {
        path: 'create-organization',
        name: 'create-organization',
        component: () => import('@/pages/app/CreateOrganizationPage.vue'),
        meta: { title: 'pageTitle.createOrganisation' },
      },
    ],
  },
  {
    path: '/p/:slug',
    name: 'public-page',
    component: () => import('@/pages/PublicPageView.vue'),
    props: true,
    meta: { title: 'pageTitle.publicPage' },
  },
  {
    path: '/share/:token',
    name: 'share-link',
    component: () => import('@/pages/ShareLinkPage.vue'),
    props: true,
    meta: { title: 'pageTitle.shareLink' },
  },
  // Admin Routes (Super Admin only)
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresSuperAdmin: true },
    children: [
      {
        path: '',
        name: 'admin-home',
        redirect: { name: 'admin-dashboard' },
      },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('@/pages/admin/AdminDashboardPage.vue'),
        meta: { title: 'pageTitle.adminDashboard' },
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/pages/admin/AdminUsersPage.vue'),
        meta: { title: 'pageTitle.adminUsers' },
      },
      {
        path: 'organizations',
        name: 'admin-organizations',
        component: () => import('@/pages/admin/AdminOrganizationsPage.vue'),
        meta: { title: 'pageTitle.adminOrganisations' },
      },
      {
        path: 'settings',
        name: 'admin-settings',
        component: () => import('@/pages/admin/AdminSettingsPage.vue'),
        meta: { title: 'pageTitle.adminSettings' },
      },
      {
        path: 'backups',
        name: 'admin-backups',
        component: () => import('@/pages/admin/AdminBackupsPage.vue'),
        meta: { title: 'pageTitle.adminBackups' },
      },
      {
        path: 'translations',
        name: 'admin-translations',
        component: () => import('@/pages/admin/AdminTranslationsPage.vue'),
        meta: { title: 'pageTitle.adminTranslations' },
      },
      {
        path: 'audit-logs',
        name: 'admin-audit-logs',
        component: () => import('@/pages/admin/AdminAuditLogsPage.vue'),
        meta: { title: 'pageTitle.adminAuditLogs' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { title: 'pageTitle.notFound' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Track if initialization has been attempted
let initializationPromise: Promise<void> | null = null;
let setupCheckPromise: Promise<boolean> | null = null;
let setupRequired: boolean | null = null;

// Check if setup is required
async function checkSetup(): Promise<boolean> {
  if (setupRequired !== null) return setupRequired;

  try {
    const status = await setupService.getStatus();
    setupRequired = status.setupRequired;
    return setupRequired;
  } catch {
    // If we can't reach the API, assume setup is not required
    setupRequired = false;
    return false;
  }
}

// Reset setup status cache (called after setup completes)
export function resetSetupStatus(): void {
  setupRequired = false;
  setupCheckPromise = null;
}

// Navigation guards
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Check setup status on first navigation (except for the setup page itself)
  if (!to.meta.setup && setupCheckPromise === null) {
    setupCheckPromise = checkSetup();
  }

  // Wait for setup check to complete
  if (setupCheckPromise) {
    const needsSetup = await setupCheckPromise;
    setupCheckPromise = null;

    // Redirect to setup if required (except if already going there)
    if (needsSetup && !to.meta.setup) {
      return next({ name: 'setup' });
    }
  }

  // If setup is complete and user tries to access setup page, redirect
  if (to.meta.setup && setupRequired === false) {
    return next({ name: 'home' });
  }

  // Initialize auth state on first navigation
  if (!authStore.initialized && !initializationPromise) {
    initializationPromise = authStore.initialize();
  }

  // Wait for initialization to complete
  if (initializationPromise) {
    await initializationPromise;
    initializationPromise = null;
  }

  // Check if route requires authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } });
  }

  // Redirect authenticated users away from guest-only pages
  if (to.meta.guest && authStore.isAuthenticated) {
    return next({ name: 'app-home' });
  }

  // Redirect new users to onboarding if not completed (skip if already going there)
  if (
    authStore.isAuthenticated &&
    authStore.user &&
    !authStore.user.onboardingCompletedAt &&
    to.name !== 'onboarding' &&
    to.meta.requiresAuth &&
    !to.meta.requiresSuperAdmin
  ) {
    return next({ name: 'onboarding' });
  }

  // Check if route requires super admin access
  if (to.meta.requiresSuperAdmin && !authStore.user?.isSuperAdmin) {
    return next({ name: 'dashboard' });
  }

  next();
});

// Set document title from route meta
router.afterEach((to) => {
  const { t } = i18n.global;
  const titleKey = to.meta.title as string | undefined;
  const pageTitle = titleKey ? t(titleKey) : '';
  document.title = pageTitle ? `${pageTitle} - LibreDiary` : 'LibreDiary';
});

export default router;
