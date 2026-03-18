export { useTheme, type Theme } from './useTheme';
export { useLocale } from './useLocale';
export {
  useDialog,
  alert,
  confirm,
  type AlertOptions,
  type ConfirmOptions,
  type AlertVariant,
  type ConfirmVariant,
} from './useDialog';
export { useToast, type Toast } from './useToast';
export {
  useCollaboration,
  type CollaborationUser,
  type UseCollaborationOptions,
} from './useCollaboration';
export { useKeyboardShortcuts, type KeyboardShortcut } from './useKeyboardShortcuts';
export { useSidebar } from './useSidebar';
export { useOnboardingTour } from './useOnboardingTour';
export { useMarkdownExport } from './useMarkdownExport';
export { useEncryption } from './useEncryption';
export {
  useClientSearch,
  type ClientSearchDocument,
  type ClientSearchOptions,
} from './useClientSearch';

export { useInbox } from './useInbox';
export { useOfflineQueue, type QueuedCapture } from './useOfflineQueue';
export { useScrollDirection, type ScrollDirection } from './useScrollDirection';

// Re-export design tokens for convenience
export * from '@/styles/design-tokens';
