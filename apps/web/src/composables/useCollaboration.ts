import { ref, shallowRef, onUnmounted, watch, toValue, type MaybeRefOrGetter } from 'vue';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

export interface CollaborationUser {
  name: string;
  color: string;
  clientId?: number;
}

export interface UseCollaborationOptions {
  /** Document name - can be a string, ref, or getter for reactivity */
  documentName: MaybeRefOrGetter<string | null>;
  /** Enable/disable collaboration - can be a boolean, ref, or getter */
  enabled?: MaybeRefOrGetter<boolean>;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSynced?: () => void;
  onAuthenticationFailed?: (reason: string) => void;
}

// Cache the WS token to avoid fetching on every connection
let cachedWsToken: { token: string; expiresAt: number } | null = null;

/**
 * Fetch a WebSocket authentication token from the API
 * This token is short-lived (5 minutes) and used for WebSocket auth
 * since httpOnly cookies can't be accessed by JavaScript
 */
async function getWsToken(): Promise<string | null> {
  // Check cache first (with 30 second buffer before expiry)
  if (cachedWsToken && Date.now() < cachedWsToken.expiresAt - 30000) {
    return cachedWsToken.token;
  }

  try {
    const apiBase = import.meta.env.DEV
      ? `http://${window.location.hostname}:3000`
      : window.location.origin;

    const response = await fetch(`${apiBase}/api/v1/auth/ws-token`, {
      method: 'GET',
      credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
      console.warn('Failed to fetch WS token:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.success && data.data?.token) {
      cachedWsToken = {
        token: data.data.token,
        expiresAt: Date.now() + data.data.expiresIn,
      };
      return data.data.token;
    }
  } catch (error) {
    console.warn('Error fetching WS token:', error);
  }

  return null;
}

export function useCollaboration(options: UseCollaborationOptions) {
  // Track current document name for reconnection detection
  let currentDocumentName: string | null = null;

  // State
  const isConnected = ref(false);
  const isSynced = ref(false);
  const isConnecting = ref(false);
  const connectionError = ref<string | null>(null);
  const connectedUsers = ref<CollaborationUser[]>([]);

  // Yjs document and provider (use shallowRef to avoid reactivity issues)
  const ydoc = shallowRef<Y.Doc | null>(null);
  const provider = shallowRef<HocuspocusProvider | null>(null);

  // Get WebSocket URL based on current location
  function getWebSocketUrl(docName: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In development, the API is on port 3000
    const host = import.meta.env.DEV ? `${window.location.hostname}:3000` : window.location.host;
    return `${protocol}//${host}/collaboration/${docName}`;
  }

  // Initialize collaboration
  async function connect() {
    const docName = toValue(options.documentName);
    const isEnabled = toValue(options.enabled) ?? true;

    // Don't connect if disabled or no document name
    if (!isEnabled || !docName || provider.value) return;

    currentDocumentName = docName;
    isConnecting.value = true;
    connectionError.value = null;

    // Fetch WS token for authentication
    const wsToken = await getWsToken();

    // Create Yjs document
    ydoc.value = new Y.Doc();

    // Create Hocuspocus provider with token
    provider.value = new HocuspocusProvider({
      url: getWebSocketUrl(docName),
      name: docName,
      document: ydoc.value,
      token: wsToken || undefined, // Pass the WS token for authentication
      // Connection handlers
      onConnect: () => {
        isConnected.value = true;
        isConnecting.value = false;
        connectionError.value = null;
        options.onConnect?.();
      },
      onDisconnect: () => {
        isConnected.value = false;
        isSynced.value = false;
        options.onDisconnect?.();
      },
      onSynced: ({ state }) => {
        isSynced.value = state;
        if (state) {
          options.onSynced?.();
        }
      },
      onAuthenticationFailed: ({ reason }) => {
        isConnecting.value = false;
        connectionError.value = reason || 'Authentication failed';
        options.onAuthenticationFailed?.(reason);
      },
      onAwarenessUpdate: ({ states }) => {
        // Update connected users from awareness
        const users: CollaborationUser[] = [];
        states.forEach((state, clientId) => {
          if (state.user) {
            users.push({
              ...state.user,
              clientId,
            });
          }
        });
        connectedUsers.value = users;
      },
    });
  }

  // Disconnect and cleanup
  function disconnect() {
    if (provider.value) {
      provider.value.destroy();
      provider.value = null;
    }
    if (ydoc.value) {
      ydoc.value.destroy();
      ydoc.value = null;
    }
    isConnected.value = false;
    isSynced.value = false;
    isConnecting.value = false;
    connectedUsers.value = [];
    currentDocumentName = null;
  }

  // Auto-connect when enabled or documentName changes
  watch(
    () => ({
      enabled: toValue(options.enabled) ?? true,
      documentName: toValue(options.documentName),
    }),
    ({ enabled: isEnabled, documentName: docName }) => {
      // If disabled, disconnect
      if (!isEnabled || !docName) {
        disconnect();
        return;
      }

      // If document name changed, reconnect
      if (docName !== currentDocumentName) {
        disconnect();
        connect();
      } else if (!provider.value) {
        // Not connected yet, connect now
        connect();
      }
    },
    { immediate: true }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    // State
    isConnected,
    isSynced,
    isConnecting,
    connectionError,
    connectedUsers,
    // Refs
    ydoc,
    provider,
    // Methods
    connect,
    disconnect,
  };
}
