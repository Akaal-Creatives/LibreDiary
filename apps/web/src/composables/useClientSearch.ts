import { ref } from 'vue';
import MiniSearch from 'minisearch';
import type { SearchResult } from '@librediary/shared';

/**
 * Document shape accepted by the client-side search index.
 * Matches the fields available after decrypting an encrypted page.
 */
export interface ClientSearchDocument {
  id: string;
  title: string;
  plainContent: string;
  icon: string | null;
  createdById: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientSearchOptions {
  limit?: number;
}

function createIndex(): MiniSearch<ClientSearchDocument> {
  return new MiniSearch<ClientSearchDocument>({
    fields: ['title', 'plainContent'],
    storeFields: ['title', 'icon', 'createdById', 'createdByName', 'createdAt', 'updatedAt'],
    searchOptions: {
      boost: { title: 2 },
      fuzzy: 0.2,
      prefix: true,
    },
  });
}

/**
 * Composable providing client-side full-text search for encrypted workspaces.
 *
 * The server cannot search encrypted content, so we maintain a MiniSearch
 * index in memory from decrypted page data. Each call creates an independent
 * index instance — use one per encrypted workspace.
 */
export function useClientSearch() {
  const indexedIds = new Set<string>();
  let miniSearch = createIndex();
  const indexSize = ref(0);

  function addDocument(doc: ClientSearchDocument) {
    if (indexedIds.has(doc.id)) {
      miniSearch.replace(doc);
    } else {
      miniSearch.add(doc);
      indexedIds.add(doc.id);
    }
    indexSize.value = indexedIds.size;
  }

  function addDocuments(docs: ClientSearchDocument[]) {
    for (const doc of docs) {
      addDocument(doc);
    }
  }

  function updateDocument(doc: ClientSearchDocument) {
    if (indexedIds.has(doc.id)) {
      miniSearch.replace(doc);
    } else {
      miniSearch.add(doc);
      indexedIds.add(doc.id);
    }
    indexSize.value = indexedIds.size;
  }

  function removeDocument(id: string) {
    if (indexedIds.has(id)) {
      miniSearch.discard(id);
      indexedIds.delete(id);
      indexSize.value = indexedIds.size;
    }
  }

  function search(query: string, options?: ClientSearchOptions): SearchResult[] {
    if (!query.trim()) return [];

    const raw = miniSearch.search(query);
    const limited = options?.limit ? raw.slice(0, options.limit) : raw;

    return limited.map((result) => ({
      id: result.id as string,
      title: (result.title as string) ?? '',
      titleHighlight: (result.title as string) ?? '',
      contentHighlight: '',
      icon: (result.icon as string | null) ?? null,
      createdById: (result.createdById as string) ?? '',
      createdByName: (result.createdByName as string | null) ?? null,
      createdAt: (result.createdAt as string) ?? '',
      updatedAt: (result.updatedAt as string) ?? '',
      rank: result.score,
    }));
  }

  function clearIndex() {
    miniSearch = createIndex();
    indexedIds.clear();
    indexSize.value = 0;
  }

  return {
    addDocument,
    addDocuments,
    updateDocument,
    removeDocument,
    search,
    clearIndex,
    indexSize,
  };
}
