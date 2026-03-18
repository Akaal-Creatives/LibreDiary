import { ref, computed } from 'vue';
import { usePagesStore } from '@/stores/pages';
import { useAuthStore } from '@/stores/auth';

const INBOX_ICON = '\uD83D\uDCE5';
const INBOX_TITLE = 'Inbox';

function storageKey(orgId: string): string {
  return `librediary:inbox:${orgId}`;
}

/**
 * Lazily creates and caches a root-level "Inbox" page per organisation.
 * The page ID is stored in localStorage so subsequent calls are instant.
 * If the cached page has been trashed or deleted, a new one is created.
 */
export function useInbox() {
  const pagesStore = usePagesStore();
  const authStore = useAuthStore();

  const inboxPageId = ref<string | null>(null);
  const loading = ref(false);

  const inboxPage = computed(() =>
    inboxPageId.value ? (pagesStore.pages.get(inboxPageId.value) ?? null) : null
  );

  function getOrgId(): string {
    const orgId = authStore.currentOrganizationId;
    if (!orgId) throw new Error('No organisation selected');
    return orgId;
  }

  /**
   * Look up cached inbox page ID from localStorage.
   * Validates the page still exists in the store (not trashed).
   */
  function getCachedInboxId(orgId: string): string | null {
    const cached = localStorage.getItem(storageKey(orgId));
    if (!cached) return null;

    // Verify the page still exists in the active page tree
    const page = pagesStore.pages.get(cached);
    if (!page) return null;

    return cached;
  }

  /**
   * Search existing root pages for one that looks like an Inbox page.
   * Matches by title and icon as a fallback when localStorage is empty.
   */
  function findExistingInbox(): string | null {
    for (const [id, page] of pagesStore.pages) {
      if (!page.parentId && (page.title === INBOX_TITLE || page.icon === INBOX_ICON)) {
        return id;
      }
    }
    return null;
  }

  /**
   * Ensure the Inbox page exists. Returns the page ID.
   * Creates the page if it doesn't exist or has been trashed.
   */
  async function ensureInbox(): Promise<string> {
    const orgId = getOrgId();

    // 1. Check localStorage cache
    const cachedId = getCachedInboxId(orgId);
    if (cachedId) {
      inboxPageId.value = cachedId;
      return cachedId;
    }

    // 2. Fallback: search existing pages by title/icon
    const existingId = findExistingInbox();
    if (existingId) {
      localStorage.setItem(storageKey(orgId), existingId);
      inboxPageId.value = existingId;
      return existingId;
    }

    // 3. Create a new Inbox page
    loading.value = true;
    try {
      const page = await pagesStore.createPage({
        title: INBOX_TITLE,
        icon: INBOX_ICON,
      });

      localStorage.setItem(storageKey(orgId), page.id);
      inboxPageId.value = page.id;
      return page.id;
    } finally {
      loading.value = false;
    }
  }

  return {
    inboxPageId,
    inboxPage,
    loading,
    ensureInbox,
  };
}

/** Reset helper for tests */
export function _resetInbox() {
  // Clear all inbox keys from localStorage
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('librediary:inbox:')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}
