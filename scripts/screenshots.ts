/**
 * Marketing screenshot automation script.
 *
 * Captures screenshots of every important section in LibreDiary
 * across 3 viewports (desktop, tablet, mobile) and 2 themes (light, dark).
 *
 * Prerequisites:
 *   1. Dev servers running: `pnpm dev`
 *   2. Seed data loaded: `pnpm --filter @librediary/server db:seed:dev`
 *
 * Usage:
 *   pnpm screenshots
 */

import { chromium, type Browser, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

const CHROME_PATH =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const LOGIN_EMAIL = 'user0@akaal.biz';
const LOGIN_PASSWORD = 'Password123';

const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
] as const;

const THEMES = ['light', 'dark'] as const;

const OUTPUT_DIR = join(process.cwd(), 'screenshots');

// Timeout for waiting on selectors (ms)
const WAIT_TIMEOUT = 15_000;

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

interface SectionDef {
  name: string;
  /** Route to navigate to, or null if handled by `setup` */
  route: string | null;
  /** CSS selector to wait for before capturing */
  waitFor: string;
  /** Whether this section needs authentication */
  requiresAuth: boolean;
  /**
   * Optional setup function run after navigation.
   * Use for opening modals, switching views, etc.
   */
  setup?: (page: Page) => Promise<void>;
}

const sections: SectionDef[] = [
  // --- Public / Auth ---
  {
    name: 'login',
    route: '/login',
    waitFor: '.auth-layout__card',
    requiresAuth: false,
  },
  {
    name: 'forgot-password',
    route: '/forgot-password',
    waitFor: '.auth-layout__card',
    requiresAuth: false,
  },

  // --- Main App ---
  {
    name: 'dashboard',
    route: '/app/dashboard',
    waitFor: '.dashboard-page',
    requiresAuth: true,
  },
  {
    name: 'page-editor',
    route: null, // resolved dynamically
    waitFor: '.page-content',
    requiresAuth: true,
  },

  // --- Database views ---
  {
    name: 'database-table',
    route: null, // resolved dynamically
    waitFor: '.database-content',
    requiresAuth: true,
  },
  {
    name: 'database-kanban',
    route: null,
    waitFor: '.kanban-board, .kanban-view',
    requiresAuth: true,
    setup: async (page: Page) => {
      // Click the kanban view tab
      await clickViewTab(page, 'KANBAN', 'By Status');
    },
  },
  {
    name: 'database-calendar',
    route: null,
    waitFor: '.calendar-content, .calendar-view',
    requiresAuth: true,
    setup: async (page: Page) => {
      await clickViewTab(page, 'CALENDAR', 'Timeline');
    },
  },
  {
    name: 'database-gallery',
    route: null, // Team Directory
    waitFor: '.gallery-grid, .gallery-view',
    requiresAuth: true,
  },

  // --- Modals ---
  {
    name: 'search-modal',
    route: '/app/dashboard',
    waitFor: '.search-modal',
    requiresAuth: true,
    setup: async (page: Page) => {
      // Use keyboard shortcut — .search-wrapper is hidden on tablet/mobile
      // when sidebar collapses, so clicking it fails on smaller viewports.
      await page.keyboard.press('Meta+k');
      await page.waitForSelector('.search-modal', { timeout: WAIT_TIMEOUT });
      await delay(300);
    },
  },
  {
    name: 'share-modal',
    route: null, // on page editor
    waitFor: '.modal-container',
    requiresAuth: true,
    setup: async (page: Page) => {
      // Click the share button in the page header
      const shareBtn = page.locator('.share-btn').first();
      if (await shareBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await shareBtn.click();
      }
      await page.waitForSelector('.modal-container', { timeout: WAIT_TIMEOUT });
      await delay(400);
    },
  },

  // --- Templates & Trash ---
  {
    name: 'templates',
    route: '/app/templates',
    waitFor: '.templates-page',
    requiresAuth: true,
  },
  {
    name: 'trash',
    route: '/app/trash',
    waitFor: '.trash-page',
    requiresAuth: true,
  },

  // --- Organisation Settings ---
  {
    name: 'settings-organization',
    route: '/app/settings/organization',
    waitFor: '.settings-page',
    requiresAuth: true,
  },
  {
    name: 'settings-members',
    route: '/app/settings/members',
    waitFor: '.members-page',
    requiresAuth: true,
  },
  {
    name: 'settings-invites',
    route: '/app/settings/invites',
    waitFor: '.invites-page',
    requiresAuth: true,
  },
  {
    name: 'settings-backups',
    route: '/app/settings/backups',
    waitFor: '.backups-page',
    requiresAuth: true,
  },
  {
    name: 'settings-webhooks',
    route: '/app/settings/webhooks',
    waitFor: '.webhooks-page',
    requiresAuth: true,
  },
  {
    name: 'settings-sessions',
    route: '/app/settings/sessions',
    waitFor: '.sessions-page',
    requiresAuth: true,
  },
  {
    name: 'settings-notifications',
    route: '/app/settings/notifications',
    waitFor: '.settings-page',
    requiresAuth: true,
  },
  {
    name: 'settings-api-tokens',
    route: '/app/settings/api-tokens',
    waitFor: '.tokens-page',
    requiresAuth: true,
  },
  {
    name: 'settings-data-privacy',
    route: '/app/settings/data',
    waitFor: '.settings-page',
    requiresAuth: true,
  },

  // --- Admin ---
  {
    name: 'admin-dashboard',
    route: '/admin/dashboard',
    waitFor: '.admin-dashboard',
    requiresAuth: true,
  },
  {
    name: 'admin-users',
    route: '/admin/users',
    waitFor: '.admin-users',
    requiresAuth: true,
  },
  {
    name: 'admin-organizations',
    route: '/admin/organizations',
    waitFor: '.admin-organizations',
    requiresAuth: true,
  },
  {
    name: 'admin-settings',
    route: '/admin/settings',
    waitFor: '.admin-settings',
    requiresAuth: true,
  },
  {
    name: 'admin-backups',
    route: '/admin/backups',
    waitFor: '.admin-backups',
    requiresAuth: true,
  },
  {
    name: 'admin-translations',
    route: '/admin/translations',
    waitFor: '.admin-translations',
    requiresAuth: true,
  },
  {
    name: 'admin-audit-logs',
    route: '/admin/audit-logs',
    waitFor: '.admin-audit-logs',
    requiresAuth: true,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickViewTab(page: Page, _viewType: string, viewName: string): Promise<void> {
  // Try clicking a tab/button that matches the view name
  const tab = page
    .locator('button, [role="tab"], .view-tab, .view-switcher-btn', {
      hasText: new RegExp(viewName, 'i'),
    })
    .first();

  if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await tab.click();
    await delay(600);
  }
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  // Allow CSS transitions to settle
  await delay(400);
}

async function suppressOnboarding(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem('librediary-tour-completed', 'true');
  });
}

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.auth-layout__card', { timeout: WAIT_TIMEOUT });

  await page.fill('#email', LOGIN_EMAIL);
  await page.fill('#password', LOGIN_PASSWORD);
  await page.click('.submit-btn');

  // Wait for redirect to the app
  await page.waitForURL('**/app/**', { timeout: WAIT_TIMEOUT });
  await delay(500);

  // Suppress onboarding tour
  await suppressOnboarding(page);
}

/**
 * Fetch page and database IDs from the sidebar DOM so we don't need API calls.
 */
interface AppIds {
  /** First page ID (Getting Started) */
  gettingStartedPageId: string | null;
  /** Task Tracker database ID */
  taskTrackerDbId: string | null;
  /** Team Directory database ID */
  teamDirectoryDbId: string | null;
}

async function resolveIds(page: Page): Promise<AppIds> {
  // Use the API to resolve IDs — sidebar uses <button> elements without href
  // attributes, so DOM queries for <a> tags won't work.

  // First, get the current org ID from the app state
  const orgId = await page.evaluate(() => {
    // The Pinia auth store persists the org ID in localStorage
    const stored = localStorage.getItem('currentOrganizationId');
    if (stored) return stored;
    return null;
  });

  if (!orgId) {
    console.log('  ⚠️  Could not resolve org ID from app state');
    return { gettingStartedPageId: null, taskTrackerDbId: null, teamDirectoryDbId: null };
  }

  let gettingStartedPageId: string | null = null;
  let taskTrackerDbId: string | null = null;
  let teamDirectoryDbId: string | null = null;

  try {
    // Fetch pages via API (shares the authenticated session cookie)
    const pagesResponse = await page.request.get(`${BASE_URL}/api/v1/organizations/${orgId}/pages`);
    if (pagesResponse.ok()) {
      const data = await pagesResponse.json();
      const pages = data.pages ?? [];

      // Find "Getting Started" page, fallback to first page
      const gettingStarted = pages.find((p: { title: string }) => p.title === 'Getting Started');
      gettingStartedPageId = gettingStarted?.id ?? pages[0]?.id ?? null;
    }
  } catch (e) {
    console.log('  ⚠️  Failed to fetch pages via API:', e);
  }

  try {
    // Fetch databases via API
    const dbResponse = await page.request.get(
      `${BASE_URL}/api/v1/organizations/${orgId}/databases`
    );
    if (dbResponse.ok()) {
      const data = await dbResponse.json();
      const databases = data.databases ?? [];

      for (const db of databases) {
        if (db.name === 'Task Tracker') taskTrackerDbId = db.id;
        else if (db.name === 'Team Directory') teamDirectoryDbId = db.id;
      }

      // Fallback: use first two databases
      if (!taskTrackerDbId && databases.length > 0) taskTrackerDbId = databases[0].id;
      if (!teamDirectoryDbId && databases.length > 1) teamDirectoryDbId = databases[1].id;
    }
  } catch (e) {
    console.log('  ⚠️  Failed to fetch databases via API:', e);
  }

  return { gettingStartedPageId, taskTrackerDbId, teamDirectoryDbId };
}

async function captureScreenshot(
  page: Page,
  section: string,
  viewport: string,
  theme: string
): Promise<void> {
  const dir = join(OUTPUT_DIR, section);
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${section}-${viewport}-${theme}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('📸 LibreDiary Marketing Screenshot Automation\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output:   ${OUTPUT_DIR}\n`);

  // Launch browser using system Chrome
  const browser: Browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--disable-gpu', '--no-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // ------------------------------------------------------------------
  // Step 1: Capture unauthenticated auth pages
  // ------------------------------------------------------------------
  const unauthSections = sections.filter((s) => !s.requiresAuth);

  for (const section of unauthSections) {
    console.log(`--- Capturing ${section.name} ---`);
    await page.goto(`${BASE_URL}${section.route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector(section.waitFor, { timeout: WAIT_TIMEOUT });
    await delay(300);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const theme of THEMES) {
        await setTheme(page, theme);
        await captureScreenshot(page, section.name, vp.name, theme);
        console.log(`  ✅ ${section.name}-${vp.name}-${theme}`);
      }
    }
  }

  // ------------------------------------------------------------------
  // Step 2: Login
  // ------------------------------------------------------------------
  console.log('\n--- Logging in as user0 ---');
  // Reset to desktop viewport for login
  await page.setViewportSize({ width: 1920, height: 1080 });
  await setTheme(page, 'light');
  await login(page);
  console.log('  ✅ Logged in\n');

  // ------------------------------------------------------------------
  // Step 3: Resolve dynamic IDs
  // ------------------------------------------------------------------
  const ids = await resolveIds(page);
  console.log('Resolved IDs:');
  console.log(`  Getting Started page: ${ids.gettingStartedPageId ?? 'not found'}`);
  console.log(`  Task Tracker DB:      ${ids.taskTrackerDbId ?? 'not found'}`);
  console.log(`  Team Directory DB:    ${ids.teamDirectoryDbId ?? 'not found'}\n`);

  // Patch section routes with resolved IDs
  const sectionRoutes: Record<string, string | null> = {
    'page-editor': ids.gettingStartedPageId ? `/app/page/${ids.gettingStartedPageId}` : null,
    'database-table': ids.taskTrackerDbId ? `/app/database/${ids.taskTrackerDbId}` : null,
    'database-kanban': ids.taskTrackerDbId ? `/app/database/${ids.taskTrackerDbId}` : null,
    'database-calendar': ids.taskTrackerDbId ? `/app/database/${ids.taskTrackerDbId}` : null,
    'database-gallery': ids.teamDirectoryDbId ? `/app/database/${ids.teamDirectoryDbId}` : null,
    'share-modal': ids.gettingStartedPageId ? `/app/page/${ids.gettingStartedPageId}` : null,
  };

  // ------------------------------------------------------------------
  // Step 4: Capture authenticated sections
  // ------------------------------------------------------------------
  const authSections = sections.filter((s) => s.requiresAuth);

  for (const section of authSections) {
    const route = sectionRoutes[section.name] ?? section.route;
    if (!route) {
      console.log(`⏭️  Skipping ${section.name} (no route resolved)`);
      continue;
    }

    console.log(`--- Capturing ${section.name} ---`);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const theme of THEMES) {
        try {
          // Navigate to the route
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });

          // Suppress onboarding each time (localStorage can be cleared on nav)
          await suppressOnboarding(page);

          // Set theme
          await setTheme(page, theme);

          // Run section-specific setup (open modals, switch views, etc.)
          if (section.setup) {
            await section.setup(page);
          }

          // Wait for the content selector
          await page.waitForSelector(section.waitFor, { timeout: WAIT_TIMEOUT }).catch(async () => {
            // Admin pages load data on mount — wait for any content to appear
            if (section.name.startsWith('admin-')) {
              await delay(2000);
            }
            console.log(
              `  ⚠️  Selector "${section.waitFor}" not found for ${section.name}, capturing anyway`
            );
          });

          // Extra settle time for data-driven pages
          await delay(section.name.startsWith('admin-') ? 500 : 300);

          await captureScreenshot(page, section.name, vp.name, theme);
          console.log(`  ✅ ${section.name}-${vp.name}-${theme}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`  ❌ ${section.name}-${vp.name}-${theme}: ${msg}`);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------
  await context.close();
  await browser.close();

  console.log('\n========================================');
  console.log('📸 Screenshot capture complete!');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('========================================');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
