import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { setupService } from '@/services';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/HomePage.vue'),
  },
  {
    path: '/setup',
    name: 'setup',
    component: () => import('@/pages/SetupWizardPage.vue'),
    meta: { setup: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/register/:token',
    name: 'register',
    component: () => import('@/pages/RegisterPage.vue'),
    meta: { guest: true },
    props: true,
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/pages/ForgotPasswordPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/reset-password/:token',
    name: 'reset-password',
    component: () => import('@/pages/ResetPasswordPage.vue'),
    meta: { guest: true },
    props: true,
  },
  {
    path: '/verify-email/:token',
    name: 'verify-email',
    component: () => import('@/pages/VerifyEmailPage.vue'),
    props: true,
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
      },
      {
        path: 'page/:pageId',
        name: 'page',
        component: () => import('@/pages/app/PageView.vue'),
        props: true,
      },
      {
        path: 'trash',
        name: 'trash',
        component: () => import('@/pages/app/TrashPage.vue'),
      },
      // Organization Settings
      {
        path: 'settings/organization',
        name: 'organization-settings',
        component: () => import('@/pages/app/settings/OrganizationSettingsPage.vue'),
      },
      {
        path: 'settings/members',
        name: 'organization-members',
        component: () => import('@/pages/app/settings/MembersPage.vue'),
      },
      {
        path: 'settings/invites',
        name: 'organization-invites',
        component: () => import('@/pages/app/settings/InvitesPage.vue'),
        meta: { minRole: 'ADMIN' },
      },
      // Create Organization
      {
        path: 'create-organization',
        name: 'create-organization',
        component: () => import('@/pages/app/CreateOrganizationPage.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
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

  next();
});

export default router;
