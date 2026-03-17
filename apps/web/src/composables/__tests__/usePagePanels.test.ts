import { describe, it, expect, beforeEach } from 'vitest';
import { usePagePanels } from '../usePagePanels';

describe('usePagePanels', () => {
  beforeEach(() => {
    // Reset all shared state before each test
    const { closePanels, setCommentCount } = usePagePanels();
    closePanels();
    setCommentCount(0);
  });

  describe('returned API', () => {
    it('should return all reactive refs and functions', () => {
      const result = usePagePanels();

      expect(result).toHaveProperty('showCommentsPanel');
      expect(result).toHaveProperty('showVersionHistory');
      expect(result).toHaveProperty('showShareModal');
      expect(result).toHaveProperty('commentCount');
      expect(typeof result.openComments).toBe('function');
      expect(typeof result.closeComments).toBe('function');
      expect(typeof result.openVersionHistory).toBe('function');
      expect(typeof result.closeVersionHistory).toBe('function');
      expect(typeof result.openShare).toBe('function');
      expect(typeof result.closeShare).toBe('function');
      expect(typeof result.setCommentCount).toBe('function');
      expect(typeof result.closePanels).toBe('function');
    });
  });

  describe('default state', () => {
    it('should have all panels closed by default', () => {
      const { showCommentsPanel, showVersionHistory, showShareModal } = usePagePanels();

      expect(showCommentsPanel.value).toBe(false);
      expect(showVersionHistory.value).toBe(false);
      expect(showShareModal.value).toBe(false);
    });

    it('should have comment count at 0 by default', () => {
      const { commentCount } = usePagePanels();

      expect(commentCount.value).toBe(0);
    });
  });

  describe('comments panel', () => {
    it('openComments should set showCommentsPanel to true', () => {
      const { showCommentsPanel, openComments } = usePagePanels();

      openComments();

      expect(showCommentsPanel.value).toBe(true);
    });

    it('closeComments should set showCommentsPanel to false', () => {
      const { showCommentsPanel, openComments, closeComments } = usePagePanels();

      openComments();
      expect(showCommentsPanel.value).toBe(true);

      closeComments();
      expect(showCommentsPanel.value).toBe(false);
    });

    it('closeComments should be safe to call when already closed', () => {
      const { showCommentsPanel, closeComments } = usePagePanels();

      closeComments();

      expect(showCommentsPanel.value).toBe(false);
    });
  });

  describe('version history panel', () => {
    it('openVersionHistory should set showVersionHistory to true', () => {
      const { showVersionHistory, openVersionHistory } = usePagePanels();

      openVersionHistory();

      expect(showVersionHistory.value).toBe(true);
    });

    it('closeVersionHistory should set showVersionHistory to false', () => {
      const { showVersionHistory, openVersionHistory, closeVersionHistory } = usePagePanels();

      openVersionHistory();
      expect(showVersionHistory.value).toBe(true);

      closeVersionHistory();
      expect(showVersionHistory.value).toBe(false);
    });

    it('closeVersionHistory should be safe to call when already closed', () => {
      const { showVersionHistory, closeVersionHistory } = usePagePanels();

      closeVersionHistory();

      expect(showVersionHistory.value).toBe(false);
    });
  });

  describe('share modal', () => {
    it('openShare should set showShareModal to true', () => {
      const { showShareModal, openShare } = usePagePanels();

      openShare();

      expect(showShareModal.value).toBe(true);
    });

    it('closeShare should set showShareModal to false', () => {
      const { showShareModal, openShare, closeShare } = usePagePanels();

      openShare();
      expect(showShareModal.value).toBe(true);

      closeShare();
      expect(showShareModal.value).toBe(false);
    });

    it('closeShare should be safe to call when already closed', () => {
      const { showShareModal, closeShare } = usePagePanels();

      closeShare();

      expect(showShareModal.value).toBe(false);
    });
  });

  describe('commentCount', () => {
    it('setCommentCount should update the comment count', () => {
      const { commentCount, setCommentCount } = usePagePanels();

      setCommentCount(5);

      expect(commentCount.value).toBe(5);
    });

    it('setCommentCount should accept zero', () => {
      const { commentCount, setCommentCount } = usePagePanels();

      setCommentCount(10);
      setCommentCount(0);

      expect(commentCount.value).toBe(0);
    });

    it('setCommentCount should overwrite previous values', () => {
      const { commentCount, setCommentCount } = usePagePanels();

      setCommentCount(3);
      setCommentCount(7);

      expect(commentCount.value).toBe(7);
    });
  });

  describe('closePanels', () => {
    it('should close all panels at once', () => {
      const {
        showCommentsPanel,
        showVersionHistory,
        showShareModal,
        openComments,
        openVersionHistory,
        openShare,
        closePanels,
      } = usePagePanels();

      openComments();
      openVersionHistory();
      openShare();
      expect(showCommentsPanel.value).toBe(true);
      expect(showVersionHistory.value).toBe(true);
      expect(showShareModal.value).toBe(true);

      closePanels();

      expect(showCommentsPanel.value).toBe(false);
      expect(showVersionHistory.value).toBe(false);
      expect(showShareModal.value).toBe(false);
    });

    it('should not affect commentCount', () => {
      const { commentCount, setCommentCount, closePanels } = usePagePanels();

      setCommentCount(42);
      closePanels();

      expect(commentCount.value).toBe(42);
    });

    it('should be safe to call when all panels are already closed', () => {
      const { showCommentsPanel, showVersionHistory, showShareModal, closePanels } =
        usePagePanels();

      closePanels();

      expect(showCommentsPanel.value).toBe(false);
      expect(showVersionHistory.value).toBe(false);
      expect(showShareModal.value).toBe(false);
    });
  });

  describe('shared state', () => {
    it('should share reactive state across multiple usePagePanels() calls', () => {
      const instance1 = usePagePanels();
      const instance2 = usePagePanels();

      instance1.openComments();

      expect(instance2.showCommentsPanel.value).toBe(true);
    });

    it('should share commentCount across instances', () => {
      const instance1 = usePagePanels();
      const instance2 = usePagePanels();

      instance1.setCommentCount(15);

      expect(instance2.commentCount.value).toBe(15);
    });

    it('closePanels from one instance should close panels visible to another', () => {
      const instance1 = usePagePanels();
      const instance2 = usePagePanels();

      instance1.openComments();
      instance1.openVersionHistory();
      instance1.openShare();

      instance2.closePanels();

      expect(instance1.showCommentsPanel.value).toBe(false);
      expect(instance1.showVersionHistory.value).toBe(false);
      expect(instance1.showShareModal.value).toBe(false);
    });
  });

  describe('panel independence', () => {
    it('opening one panel should not affect others', () => {
      const { showCommentsPanel, showVersionHistory, showShareModal, openComments } =
        usePagePanels();

      openComments();

      expect(showCommentsPanel.value).toBe(true);
      expect(showVersionHistory.value).toBe(false);
      expect(showShareModal.value).toBe(false);
    });

    it('closing one panel should not affect others', () => {
      const {
        showCommentsPanel,
        showVersionHistory,
        showShareModal,
        openComments,
        openVersionHistory,
        openShare,
        closeComments,
      } = usePagePanels();

      openComments();
      openVersionHistory();
      openShare();

      closeComments();

      expect(showCommentsPanel.value).toBe(false);
      expect(showVersionHistory.value).toBe(true);
      expect(showShareModal.value).toBe(true);
    });
  });
});
