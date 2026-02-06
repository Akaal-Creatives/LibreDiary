import { ref, shallowRef, onUnmounted, watch } from 'vue';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

export interface CollaborationUser {
  name: string;
  color: string;
  clientId?: number;
}

export interface UseCollaborationOptions {
  documentName: string;
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSynced?: () => void;
  onAuthenticationFailed?: (reason: string) => void;
}

export function useCollaboration(options: UseCollaborationOptions) {
  const { documentName, enabled = true } = options;

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
  function getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In development, the API is on port 3000
    const host = import.meta.env.DEV ? `${window.location.hostname}:3000` : window.location.host;
    return `${protocol}//${host}/collaboration/${documentName}`;
  }

  // Initialize collaboration
  function connect() {
    if (!enabled || provider.value) return;

    isConnecting.value = true;
    connectionError.value = null;

    // Create Yjs document
    ydoc.value = new Y.Doc();

    // Create Hocuspocus provider
    // Token is passed via cookies (httpOnly), so we don't need to pass it explicitly
    provider.value = new HocuspocusProvider({
      url: getWebSocketUrl(),
      name: documentName,
      document: ydoc.value,
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
  }

  // Auto-connect when enabled changes
  watch(
    () => enabled,
    (newEnabled) => {
      if (newEnabled) {
        connect();
      } else {
        disconnect();
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
