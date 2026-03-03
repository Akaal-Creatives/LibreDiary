import { ref } from 'vue';

// Shared reactive state for page panels/modals.
// Used by both AppHeader (top nav buttons) and PageView (page-level buttons)
// to control the same panels without prop drilling.

const showCommentsPanel = ref(false);
const showVersionHistory = ref(false);
const showShareModal = ref(false);
const commentCount = ref(0);

export function usePagePanels() {
  function openComments() {
    showCommentsPanel.value = true;
  }

  function closeComments() {
    showCommentsPanel.value = false;
  }

  function openVersionHistory() {
    showVersionHistory.value = true;
  }

  function closeVersionHistory() {
    showVersionHistory.value = false;
  }

  function openShare() {
    showShareModal.value = true;
  }

  function closeShare() {
    showShareModal.value = false;
  }

  function setCommentCount(count: number) {
    commentCount.value = count;
  }

  return {
    showCommentsPanel,
    showVersionHistory,
    showShareModal,
    commentCount,
    openComments,
    closeComments,
    openVersionHistory,
    closeVersionHistory,
    openShare,
    closeShare,
    setCommentCount,
  };
}
