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

// Re-export design tokens for convenience
export * from '@/styles/design-tokens';
