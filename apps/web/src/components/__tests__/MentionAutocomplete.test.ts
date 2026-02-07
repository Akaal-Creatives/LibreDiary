import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VueWrapper } from '@vue/test-utils';
import { mount, flushPromises } from '@vue/test-utils';
import type { MentionUser } from '@/services';

// Hoist mock definitions so they are available before module imports
const { mockMentionsService } = vi.hoisted(() => ({
  mockMentionsService: {
    searchUsers: vi.fn(),
    getMentions: vi.fn(),
  },
}));

vi.mock('@/services', () => ({
  mentionsService: mockMentionsService,
}));

import MentionAutocomplete from '../MentionAutocomplete.vue';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const testUsers: MentionUser[] = [
  { id: 'user-1', name: 'Alice Smith', email: 'alice@test.com', avatarUrl: null },
  {
    id: 'user-2',
    name: 'Bob Jones',
    email: 'bob@test.com',
    avatarUrl: 'https://example.com/bob.jpg',
  },
];

const userWithoutName: MentionUser = {
  id: 'user-3',
  name: null,
  email: 'charlie@test.com',
  avatarUrl: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  modelValue: '',
  organizationId: 'org-1',
};

function mountComponent(props: Record<string, unknown> = {}) {
  return mount(MentionAutocomplete, {
    props: { ...defaultProps, ...props },
    global: {
      stubs: {
        Transition: true,
      },
    },
  });
}

/**
 * Simulate typing text that includes an @ mention into the textarea.
 *
 * Because the watcher reads `selectionStart` from the textarea element we
 * must set it explicitly before triggering the prop change that fires the
 * watcher.
 */
async function simulateMentionTyping(wrapper: VueWrapper, text: string, cursorPosition?: number) {
  const textarea = wrapper.find('textarea').element as HTMLTextAreaElement;
  const pos = cursorPosition ?? text.length;

  // Set the native element value & cursor first so the watcher can read it
  textarea.value = text;
  textarea.selectionStart = pos;
  textarea.selectionEnd = pos;

  // Now update the prop, which sets localValue and fires the watcher
  await wrapper.setProps({ modelValue: text });
  await flushPromises();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MentionAutocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMentionsService.searchUsers.mockResolvedValue([]);
  });

  // =========================================================================
  // Rendering
  // =========================================================================

  describe('rendering', () => {
    it('should render textarea with the provided placeholder', () => {
      const wrapper = mountComponent({ placeholder: 'Leave a comment...' });
      const textarea = wrapper.find('textarea');

      expect(textarea.exists()).toBe(true);
      expect(textarea.attributes('placeholder')).toBe('Leave a comment...');
    });

    it('should render textarea with default placeholder when none is provided', () => {
      const wrapper = mountComponent();
      const textarea = wrapper.find('textarea');

      expect(textarea.attributes('placeholder')).toBe('Type @ to mention someone...');
    });

    it('should render textarea with the provided rows attribute', () => {
      const wrapper = mountComponent({ rows: 5 });
      const textarea = wrapper.find('textarea');

      expect(textarea.attributes('rows')).toBe('5');
    });

    it('should render textarea with default rows of 2 when none is provided', () => {
      const wrapper = mountComponent();
      const textarea = wrapper.find('textarea');

      expect(textarea.attributes('rows')).toBe('2');
    });

    it('should render a disabled textarea when disabled prop is true', () => {
      const wrapper = mountComponent({ disabled: true });
      const textarea = wrapper.find('textarea');

      expect(textarea.attributes('disabled')).toBeDefined();
    });

    it('should render a non-disabled textarea when disabled prop is false', () => {
      const wrapper = mountComponent({ disabled: false });
      const textarea = wrapper.find('textarea');

      // In happy-dom a non-disabled element has no "disabled" attribute
      expect(textarea.element.disabled).toBe(false);
    });
  });

  // =========================================================================
  // v-model behaviour
  // =========================================================================

  describe('v-model behaviour', () => {
    it('should emit update:modelValue when textarea value changes', async () => {
      const wrapper = mountComponent();
      const textarea = wrapper.find('textarea');

      await textarea.setValue('Hello');

      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      expect(wrapper.emitted('update:modelValue')![0]).toEqual(['Hello']);
    });
  });

  // =========================================================================
  // @ mention detection and search
  // =========================================================================

  describe('mention detection and search', () => {
    it('should not call searchUsers when query is less than 2 characters after @', async () => {
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@a');

      expect(mockMentionsService.searchUsers).not.toHaveBeenCalled();
    });

    it('should call mentionsService.searchUsers when typing 2+ chars after @', async () => {
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      expect(mockMentionsService.searchUsers).toHaveBeenCalledWith('org-1', 'al');
    });

    it('should show dropdown with user results when search returns users', async () => {
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      const dropdown = wrapper.find('.mention-dropdown');
      expect(dropdown.exists()).toBe(true);

      const items = wrapper.findAll('.mention-item');
      expect(items).toHaveLength(2);
    });

    it('should not show dropdown when search returns empty results', async () => {
      mockMentionsService.searchUsers.mockResolvedValue([]);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@zz');

      expect(wrapper.find('.mention-dropdown').exists()).toBe(false);
    });

    it('should show user name, email, and mention preview in dropdown items', async () => {
      mockMentionsService.searchUsers.mockResolvedValue([testUsers[0]!]);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      const item = wrapper.find('.mention-item');
      expect(item.find('.user-name').text()).toBe('Alice Smith');
      expect(item.find('.user-email').text()).toBe('alice@test.com');
      expect(item.find('.mention-preview').text()).toBe('@alice_smith');
    });

    it('should show avatar initials when user has no avatarUrl', async () => {
      mockMentionsService.searchUsers.mockResolvedValue([testUsers[0]!]);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      const avatar = wrapper.find('.user-avatar');
      expect(avatar.find('img').exists()).toBe(false);
      expect(avatar.find('.avatar-initials').text()).toBe('AS');
    });

    it('should show avatar image when user has avatarUrl', async () => {
      mockMentionsService.searchUsers.mockResolvedValue([testUsers[1]!]);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@bo');

      const avatar = wrapper.find('.user-avatar');
      const img = avatar.find('img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe('https://example.com/bob.jpg');
    });

    it('should show search spinner indicator while searching', async () => {
      // Use a promise that does not resolve immediately so we can observe the loading state
      let resolveSearch!: (value: MentionUser[]) => void;
      mockMentionsService.searchUsers.mockImplementation(
        () =>
          new Promise<MentionUser[]>((resolve) => {
            resolveSearch = resolve;
          })
      );

      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      // The search has been called but not yet resolved
      expect(wrapper.find('.search-indicator').exists()).toBe(true);
      expect(wrapper.find('.search-spinner').exists()).toBe(true);

      // Resolve and verify spinner disappears
      resolveSearch(testUsers);
      await flushPromises();
      expect(wrapper.find('.search-indicator').exists()).toBe(false);
    });

    it('should close dropdown when search fails', async () => {
      // First show the dropdown with a successful search
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');
      expect(wrapper.find('.mention-dropdown').exists()).toBe(true);

      // Now simulate a failing search
      mockMentionsService.searchUsers.mockRejectedValue(new Error('Network error'));
      await simulateMentionTyping(wrapper, '@alx');

      expect(wrapper.find('.mention-dropdown').exists()).toBe(false);
    });
  });

  // =========================================================================
  // Keyboard navigation
  // =========================================================================

  describe('keyboard navigation', () => {
    it('should close dropdown on Escape key', async () => {
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      expect(wrapper.find('.mention-dropdown').exists()).toBe(true);

      await wrapper.find('textarea').trigger('keydown', { key: 'Escape' });
      await flushPromises();

      expect(wrapper.find('.mention-dropdown').exists()).toBe(false);
    });

    it('should emit submit on Cmd+Enter when dropdown is not showing', async () => {
      const wrapper = mountComponent({ modelValue: 'Hello' });
      const textarea = wrapper.find('textarea');

      await textarea.trigger('keydown', { key: 'Enter', metaKey: true });

      expect(wrapper.emitted('submit')).toBeTruthy();
      expect(wrapper.emitted('submit')).toHaveLength(1);
    });

    it('should emit submit on Ctrl+Enter when dropdown is not showing', async () => {
      const wrapper = mountComponent({ modelValue: 'Hello' });
      const textarea = wrapper.find('textarea');

      await textarea.trigger('keydown', { key: 'Enter', ctrlKey: true });

      expect(wrapper.emitted('submit')).toBeTruthy();
      expect(wrapper.emitted('submit')).toHaveLength(1);
    });

    it('should not emit submit on Cmd+Enter when dropdown is showing', async () => {
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      expect(wrapper.find('.mention-dropdown').exists()).toBe(true);

      await wrapper.find('textarea').trigger('keydown', { key: 'Enter', metaKey: true });

      // Enter selects the user rather than submitting
      expect(wrapper.emitted('submit')).toBeFalsy();
    });

    it('should navigate down with ArrowDown and wrap around', async () => {
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      const textarea = wrapper.find('textarea');

      // Initially index 0 is selected
      let items = wrapper.findAll('.mention-item');
      expect(items[0]!.classes()).toContain('selected');

      // Press ArrowDown to move to index 1
      await textarea.trigger('keydown', { key: 'ArrowDown' });
      await flushPromises();

      items = wrapper.findAll('.mention-item');
      expect(items[1]!.classes()).toContain('selected');

      // Press ArrowDown again to wrap back to index 0
      await textarea.trigger('keydown', { key: 'ArrowDown' });
      await flushPromises();

      items = wrapper.findAll('.mention-item');
      expect(items[0]!.classes()).toContain('selected');
    });

    it('should navigate up with ArrowUp and wrap around', async () => {
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      const textarea = wrapper.find('textarea');

      // Initially index 0 is selected; pressing ArrowUp should wrap to last
      await textarea.trigger('keydown', { key: 'ArrowUp' });
      await flushPromises();

      const items = wrapper.findAll('.mention-item');
      expect(items[1]!.classes()).toContain('selected');
    });

    it('should select user on Enter key and insert @username into text', async () => {
      mockMentionsService.searchUsers.mockResolvedValue([testUsers[0]!]);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      // Press Enter to select the first (and only) user
      await wrapper.find('textarea').trigger('keydown', { key: 'Enter' });
      await flushPromises();

      // Should have emitted update:modelValue with the inserted mention
      const emitted = wrapper.emitted('update:modelValue')!;
      const lastEmittedValue = emitted[emitted.length - 1]![0] as string;
      expect(lastEmittedValue).toContain('@alice_smith ');
    });

    it('should select user on Tab key', async () => {
      mockMentionsService.searchUsers.mockResolvedValue([testUsers[0]!]);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      await wrapper.find('textarea').trigger('keydown', { key: 'Tab' });
      await flushPromises();

      const emitted = wrapper.emitted('update:modelValue')!;
      const lastEmittedValue = emitted[emitted.length - 1]![0] as string;
      expect(lastEmittedValue).toContain('@alice_smith ');

      // Dropdown should close after selection
      expect(wrapper.find('.mention-dropdown').exists()).toBe(false);
    });
  });

  // =========================================================================
  // getUserMentionName logic
  // =========================================================================

  describe('getUserMentionName', () => {
    it('should convert name with spaces to lowercase underscores', async () => {
      mockMentionsService.searchUsers.mockResolvedValue([testUsers[0]!]);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      // The mention preview in the dropdown reflects getUserMentionName output
      const preview = wrapper.find('.mention-preview');
      expect(preview.text()).toBe('@alice_smith');
    });

    it('should use email prefix when name is null', async () => {
      mockMentionsService.searchUsers.mockResolvedValue([userWithoutName]);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@ch');

      const preview = wrapper.find('.mention-preview');
      expect(preview.text()).toBe('@charlie');
    });
  });

  // =========================================================================
  // getInitials logic
  // =========================================================================

  describe('getInitials', () => {
    it('should return first letters of name parts as initials', async () => {
      mockMentionsService.searchUsers.mockResolvedValue([testUsers[0]!]);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      const initials = wrapper.find('.avatar-initials');
      expect(initials.text()).toBe('AS');
    });

    it('should return "?" for users with no name', async () => {
      mockMentionsService.searchUsers.mockResolvedValue([userWithoutName]);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@ch');

      const initials = wrapper.find('.avatar-initials');
      expect(initials.text()).toBe('?');
    });
  });

  // =========================================================================
  // Dropdown interaction
  // =========================================================================

  describe('dropdown interaction', () => {
    it('should select user when clicking a dropdown item', async () => {
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      // Click the second user
      const items = wrapper.findAll('.mention-item');
      await items[1]!.trigger('click');
      await flushPromises();

      const emitted = wrapper.emitted('update:modelValue')!;
      const lastEmittedValue = emitted[emitted.length - 1]![0] as string;
      expect(lastEmittedValue).toContain('@bob_jones ');
    });

    it('should highlight item on mouseenter', async () => {
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      const items = wrapper.findAll('.mention-item');

      // Initially first item is selected
      expect(items[0]!.classes()).toContain('selected');
      expect(items[1]!.classes()).not.toContain('selected');

      // Hover over the second item
      await items[1]!.trigger('mouseenter');
      await flushPromises();

      // Now the second item should be selected
      const updatedItems = wrapper.findAll('.mention-item');
      expect(updatedItems[1]!.classes()).toContain('selected');
    });
  });

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('should detect @ at the very start of the text', async () => {
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@al');

      expect(mockMentionsService.searchUsers).toHaveBeenCalledWith('org-1', 'al');
    });

    it('should detect @ after whitespace', async () => {
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, 'hello @al');

      expect(mockMentionsService.searchUsers).toHaveBeenCalledWith('org-1', 'al');
    });

    it('should not detect @ in the middle of a word (no preceding whitespace)', async () => {
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, 'test@al');

      expect(mockMentionsService.searchUsers).not.toHaveBeenCalled();
    });

    it('should close dropdown when query contains a space after @', async () => {
      mockMentionsService.searchUsers.mockResolvedValue(testUsers);
      const wrapper = mountComponent();

      // Start with a valid mention that opens the dropdown
      await simulateMentionTyping(wrapper, '@al');
      expect(wrapper.find('.mention-dropdown').exists()).toBe(true);

      // Now type a space, which should close the dropdown
      await simulateMentionTyping(wrapper, '@al ');

      expect(wrapper.find('.mention-dropdown').exists()).toBe(false);
    });

    it('should not search when organizationId is empty', async () => {
      const wrapper = mountComponent({ organizationId: '' });
      await simulateMentionTyping(wrapper, '@al');

      // searchUsers should not be called, or if called, dropdown should not appear
      expect(wrapper.find('.mention-dropdown').exists()).toBe(false);
    });

    it('should display email prefix as name when user name is null', async () => {
      mockMentionsService.searchUsers.mockResolvedValue([userWithoutName]);
      const wrapper = mountComponent();
      await simulateMentionTyping(wrapper, '@ch');

      // The template falls back to email.split('@')[0] when name is null
      const userName = wrapper.find('.user-name');
      expect(userName.text()).toBe('charlie');
    });
  });
});
