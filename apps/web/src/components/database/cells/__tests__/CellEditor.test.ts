import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/stores/organizations', () => ({
  useOrganizationsStore: () => ({
    members: [
      {
        id: 'member-1',
        userId: 'user-1',
        organizationId: 'org-1',
        role: 'MEMBER',
        createdAt: '2024-01-01',
        user: { id: 'user-1', email: 'alice@example.com', name: 'Alice Smith', avatarUrl: null },
      },
      {
        id: 'member-2',
        userId: 'user-2',
        organizationId: 'org-1',
        role: 'ADMIN',
        createdAt: '2024-01-01',
        user: {
          id: 'user-2',
          email: 'bob@example.com',
          name: 'Bob Jones',
          avatarUrl: 'https://example.com/bob.jpg',
        },
      },
    ],
    fetchMembers: vi.fn(),
  }),
}));

const mockFetchRelatedDatabase = vi.fn();

vi.mock('@/stores/databases', () => ({
  useDatabasesStore: () => ({
    relatedDatabases: new Map([
      [
        'target-db-1',
        {
          id: 'target-db-1',
          name: 'Projects',
          properties: [
            {
              id: 'tp-1',
              databaseId: 'target-db-1',
              name: 'Name',
              type: 'TEXT',
              position: 0,
              config: null,
            },
          ],
          rows: [
            {
              id: 'trow-1',
              databaseId: 'target-db-1',
              position: 0,
              cells: { 'tp-1': 'Alpha Project' },
              createdById: 'user-1',
              createdAt: '2024-01-01',
              updatedAt: '2024-01-01',
            },
            {
              id: 'trow-2',
              databaseId: 'target-db-1',
              position: 1,
              cells: { 'tp-1': 'Beta Project' },
              createdById: 'user-1',
              createdAt: '2024-01-01',
              updatedAt: '2024-01-01',
            },
          ],
          views: [],
        },
      ],
    ]),
    fetchRelatedDatabase: mockFetchRelatedDatabase,
  }),
}));

const mockUploadFile = vi.fn();

vi.mock('@/stores/files', () => ({
  useFilesStore: () => ({
    uploadFile: mockUploadFile,
    uploading: false,
    uploadProgress: 0,
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    currentOrganizationId: 'org-1',
  }),
}));

import CellEditor from '../CellEditor.vue';

describe('CellEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders text input with initial value', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'Hello', type: 'TEXT' },
    });
    await flushPromises();
    const input = wrapper.find('.cell-input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('Hello');
  });

  it('renders number input for NUMBER type', () => {
    const wrapper = mount(CellEditor, {
      props: { value: 42, type: 'NUMBER' },
    });
    const input = wrapper.find('.cell-input');
    expect((input.element as HTMLInputElement).type).toBe('number');
  });

  it('renders date input for DATE type', () => {
    const wrapper = mount(CellEditor, {
      props: { value: '2024-06-15', type: 'DATE' },
    });
    const input = wrapper.find('.cell-input');
    expect((input.element as HTMLInputElement).type).toBe('date');
  });

  it('emits save on Enter key', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'Hello', type: 'TEXT' },
    });
    const input = wrapper.find('.cell-input');
    await input.setValue('Updated');
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')![0]).toEqual(['Updated']);
  });

  it('emits cancel on Escape key', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'Hello', type: 'TEXT' },
    });
    const input = wrapper.find('.cell-input');
    await input.trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('emits toggled value immediately for CHECKBOX type', () => {
    const wrapper = mount(CellEditor, {
      props: { value: false, type: 'CHECKBOX' },
    });
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')![0]).toEqual([true]);
  });

  it('shows select dropdown for SELECT type', async () => {
    const wrapper = mount(CellEditor, {
      props: {
        value: null,
        type: 'SELECT',
        config: { options: [{ label: 'Done' }, { label: 'Todo' }] },
      },
    });
    await flushPromises();
    const dropdown = wrapper.find('.select-dropdown');
    expect(dropdown.exists()).toBe(true);
    const options = wrapper.findAll('.select-option');
    expect(options).toHaveLength(2);
  });

  it('emits selected option for SELECT type', async () => {
    const wrapper = mount(CellEditor, {
      props: {
        value: null,
        type: 'SELECT',
        config: { options: [{ label: 'Done' }, { label: 'Todo' }] },
      },
    });
    await flushPromises();
    const options = wrapper.findAll('.select-option');
    await options[0]!.trigger('mousedown');
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')![0]).toEqual(['Done']);
  });

  it('converts empty number input to null', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 42, type: 'NUMBER' },
    });
    const input = wrapper.find('.cell-input');
    await input.setValue('');
    await input.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('save')![0]).toEqual([null]);
  });

  it('renders URL input for URL type', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'https://example.com', type: 'URL' },
    });
    await flushPromises();
    const input = wrapper.find('.cell-input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('https://example.com');
  });

  it('renders email input for EMAIL type', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'test@example.com', type: 'EMAIL' },
    });
    await flushPromises();
    const input = wrapper.find('.cell-input');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('test@example.com');
  });

  it('toggles checkbox from true to false', () => {
    const wrapper = mount(CellEditor, {
      props: { value: true, type: 'CHECKBOX' },
    });
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')![0]).toEqual([false]);
  });

  it('emits save on Tab key', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: 'Hello', type: 'TEXT' },
    });
    const input = wrapper.find('.cell-input');
    await input.setValue('Tabbed');
    await input.trigger('keydown', { key: 'Tab' });
    expect(wrapper.emitted('save')).toBeTruthy();
    expect(wrapper.emitted('save')![0]).toEqual(['Tabbed']);
  });

  it('handles null initial value for text input', async () => {
    const wrapper = mount(CellEditor, {
      props: { value: null, type: 'TEXT' },
    });
    await flushPromises();
    const input = wrapper.find('.cell-input');
    expect((input.element as HTMLInputElement).value).toBe('');
  });

  it('handles multi-select type with options', async () => {
    const wrapper = mount(CellEditor, {
      props: {
        value: ['Tag A'],
        type: 'MULTI_SELECT',
        config: { options: [{ label: 'Tag A' }, { label: 'Tag B' }, { label: 'Tag C' }] },
      },
    });
    await flushPromises();
    const dropdown = wrapper.find('.select-dropdown');
    expect(dropdown.exists()).toBe(true);
  });

  // Person property type
  describe('PERSON type', () => {
    it('shows person dropdown with org members', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: null, type: 'PERSON' },
      });
      await flushPromises();
      const dropdown = wrapper.find('.person-dropdown');
      expect(dropdown.exists()).toBe(true);
      const options = wrapper.findAll('.person-option');
      expect(options).toHaveLength(2);
    });

    it('displays member names in dropdown', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: null, type: 'PERSON' },
      });
      await flushPromises();
      expect(wrapper.text()).toContain('Alice Smith');
      expect(wrapper.text()).toContain('Bob Jones');
    });

    it('emits save with user ID on member selection', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: null, type: 'PERSON' },
      });
      await flushPromises();
      const options = wrapper.findAll('.person-option');
      await options[0]!.trigger('mousedown');
      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')![0]).toEqual(['user-1']);
    });

    it('highlights currently selected member', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: 'user-2', type: 'PERSON' },
      });
      await flushPromises();
      const options = wrapper.findAll('.person-option');
      expect(options[1]!.classes()).toContain('selected');
    });

    it('allows clearing person value', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: 'user-1', type: 'PERSON' },
      });
      await flushPromises();
      const clearBtn = wrapper.find('.person-clear');
      expect(clearBtn.exists()).toBe(true);
      await clearBtn.trigger('mousedown');
      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')![0]).toEqual([null]);
    });
  });

  // Relation property type
  describe('RELATION type', () => {
    it('shows relation dropdown with target database rows', async () => {
      const wrapper = mount(CellEditor, {
        props: {
          value: [],
          type: 'RELATION',
          config: { targetDatabaseId: 'target-db-1' },
        },
      });
      await flushPromises();
      const dropdown = wrapper.find('.relation-dropdown');
      expect(dropdown.exists()).toBe(true);
      const options = wrapper.findAll('.relation-option');
      expect(options).toHaveLength(2);
    });

    it('displays row titles in relation dropdown', async () => {
      const wrapper = mount(CellEditor, {
        props: {
          value: [],
          type: 'RELATION',
          config: { targetDatabaseId: 'target-db-1' },
        },
      });
      await flushPromises();
      expect(wrapper.text()).toContain('Alpha Project');
      expect(wrapper.text()).toContain('Beta Project');
    });

    it('emits save with toggled row ID array on selection', async () => {
      const wrapper = mount(CellEditor, {
        props: {
          value: ['trow-1'],
          type: 'RELATION',
          config: { targetDatabaseId: 'target-db-1' },
        },
      });
      await flushPromises();
      const options = wrapper.findAll('.relation-option');
      // Click trow-2 to add it
      await options[1]!.trigger('mousedown');
      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')![0]).toEqual([['trow-1', 'trow-2']]);
    });

    it('highlights currently linked rows', async () => {
      const wrapper = mount(CellEditor, {
        props: {
          value: ['trow-1'],
          type: 'RELATION',
          config: { targetDatabaseId: 'target-db-1' },
        },
      });
      await flushPromises();
      const options = wrapper.findAll('.relation-option');
      expect(options[0]!.classes()).toContain('selected');
      expect(options[1]!.classes()).not.toContain('selected');
    });

    it('removes relation on clicking selected row', async () => {
      const wrapper = mount(CellEditor, {
        props: {
          value: ['trow-1', 'trow-2'],
          type: 'RELATION',
          config: { targetDatabaseId: 'target-db-1' },
        },
      });
      await flushPromises();
      const options = wrapper.findAll('.relation-option');
      // Click trow-1 to remove it
      await options[0]!.trigger('mousedown');
      expect(wrapper.emitted('save')).toBeTruthy();
      expect(wrapper.emitted('save')![0]).toEqual([['trow-2']]);
    });

    it('shows done button to close dropdown', async () => {
      const wrapper = mount(CellEditor, {
        props: {
          value: [],
          type: 'RELATION',
          config: { targetDatabaseId: 'target-db-1' },
        },
      });
      await flushPromises();
      const doneBtn = wrapper.find('.relation-done');
      expect(doneBtn.exists()).toBe(true);
    });

    it('shows empty state when target database has no rows', async () => {
      // Override mock to return empty rows for a different db
      const wrapper = mount(CellEditor, {
        props: {
          value: [],
          type: 'RELATION',
          config: { targetDatabaseId: 'nonexistent-db' },
        },
      });
      await flushPromises();
      expect(wrapper.text()).toContain('No rows');
    });
  });

  // Files property type
  describe('FILES type', () => {
    it('shows files dropdown on mount when type is FILES', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: [], type: 'FILES' },
      });
      await flushPromises();
      const dropdown = wrapper.find('.files-dropdown');
      expect(dropdown.exists()).toBe(true);
    });

    it('displays current files from value prop', async () => {
      const files = [
        {
          id: 'f1',
          name: 'report.pdf',
          url: '/uploads/report.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
      ];
      const wrapper = mount(CellEditor, {
        props: { value: files, type: 'FILES' },
      });
      await flushPromises();
      expect(wrapper.text()).toContain('report.pdf');
    });

    it('remove button emits save with file removed', async () => {
      const files = [
        {
          id: 'f1',
          name: 'report.pdf',
          url: '/uploads/report.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
        {
          id: 'f2',
          name: 'photo.jpg',
          url: '/uploads/photo.jpg',
          mimeType: 'image/jpeg',
          size: 2048,
        },
      ];
      const wrapper = mount(CellEditor, {
        props: { value: files, type: 'FILES' },
      });
      await flushPromises();
      const removeBtns = wrapper.findAll('.file-remove-btn');
      expect(removeBtns).toHaveLength(2);
      await removeBtns[0]!.trigger('mousedown');
      expect(wrapper.emitted('save')).toBeTruthy();
      const emitted = wrapper.emitted('save')![0]![0] as Array<{ id: string }>;
      expect(emitted).toHaveLength(1);
      expect(emitted[0]!.id).toBe('f2');
    });

    it('done button emits save with current value', async () => {
      const files = [
        {
          id: 'f1',
          name: 'report.pdf',
          url: '/uploads/report.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
      ];
      const wrapper = mount(CellEditor, {
        props: { value: files, type: 'FILES' },
      });
      await flushPromises();
      const doneBtn = wrapper.find('.files-done-btn');
      expect(doneBtn.exists()).toBe(true);
      await doneBtn.trigger('mousedown');
      expect(wrapper.emitted('save')).toBeTruthy();
    });

    it('accept attribute set from config.allowedMimeTypes', async () => {
      const wrapper = mount(CellEditor, {
        props: {
          value: [],
          type: 'FILES',
          config: { allowedMimeTypes: ['image/*', 'application/pdf'] },
        },
      });
      await flushPromises();
      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.exists()).toBe(true);
      expect(fileInput.attributes('accept')).toBe('image/*,application/pdf');
    });

    it('shows upload button with correct text', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: [], type: 'FILES' },
      });
      await flushPromises();
      const uploadBtn = wrapper.find('.files-upload-btn');
      expect(uploadBtn.exists()).toBe(true);
      expect(uploadBtn.text()).toContain('Upload file');
    });

    it('has hidden file input element', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: [], type: 'FILES' },
      });
      await flushPromises();
      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.exists()).toBe(true);
      expect(fileInput.attributes('style')).toContain('display: none');
    });

    it('no accept attribute when config has no allowedMimeTypes', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: [], type: 'FILES' },
      });
      await flushPromises();
      const fileInput = wrapper.find('input[type="file"]');
      expect(fileInput.exists()).toBe(true);
      expect(fileInput.attributes('accept')).toBeUndefined();
    });

    it('defaults to empty files list for non-array value', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: null, type: 'FILES' },
      });
      await flushPromises();
      expect(wrapper.find('.files-dropdown').exists()).toBe(true);
      expect(wrapper.find('.files-list').exists()).toBe(false);
    });

    it('does not render files-list when no files', async () => {
      const wrapper = mount(CellEditor, {
        props: { value: [], type: 'FILES' },
      });
      await flushPromises();
      expect(wrapper.find('.files-list').exists()).toBe(false);
    });

    it('emits save with new file after successful upload', async () => {
      mockUploadFile.mockResolvedValue({
        id: 'new-f1',
        originalName: 'uploaded.pdf',
        url: '/uploads/uploaded.pdf',
        storagePath: '/storage/uploaded.pdf',
        mimeType: 'application/pdf',
        size: 4096,
      });
      const wrapper = mount(CellEditor, {
        props: { value: [], type: 'FILES' },
      });
      await flushPromises();
      const fileInput = wrapper.find('input[type="file"]');
      const file = new File(['content'], 'uploaded.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput.element, 'files', { value: [file] });
      await fileInput.trigger('change');
      await flushPromises();
      expect(mockUploadFile).toHaveBeenCalledWith(file);
      expect(wrapper.emitted('save')).toBeTruthy();
      const emitted = wrapper.emitted('save')![0]![0] as Array<{ id: string; name: string }>;
      expect(emitted).toHaveLength(1);
      expect(emitted[0]!.id).toBe('new-f1');
      expect(emitted[0]!.name).toBe('uploaded.pdf');
    });

    it('does not emit save when upload fails', async () => {
      mockUploadFile.mockRejectedValue(new Error('Upload failed'));
      const wrapper = mount(CellEditor, {
        props: { value: [], type: 'FILES' },
      });
      await flushPromises();
      const fileInput = wrapper.find('input[type="file"]');
      const file = new File(['content'], 'fail.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput.element, 'files', { value: [file] });
      await fileInput.trigger('change');
      await flushPromises();
      expect(mockUploadFile).toHaveBeenCalled();
      expect(wrapper.emitted('save')).toBeFalsy();
    });

    it('appends uploaded file to existing files', async () => {
      mockUploadFile.mockResolvedValue({
        id: 'new-f2',
        originalName: 'second.pdf',
        url: '/uploads/second.pdf',
        storagePath: '/storage/second.pdf',
        mimeType: 'application/pdf',
        size: 2048,
      });
      const existingFiles = [
        {
          id: 'f1',
          name: 'first.pdf',
          url: '/uploads/first.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
      ];
      const wrapper = mount(CellEditor, {
        props: { value: existingFiles, type: 'FILES' },
      });
      await flushPromises();
      const fileInput = wrapper.find('input[type="file"]');
      const file = new File(['content'], 'second.pdf', { type: 'application/pdf' });
      Object.defineProperty(fileInput.element, 'files', { value: [file] });
      await fileInput.trigger('change');
      await flushPromises();
      const emitted = wrapper.emitted('save')![0]![0] as Array<{ id: string }>;
      expect(emitted).toHaveLength(2);
      expect(emitted[0]!.id).toBe('f1');
      expect(emitted[1]!.id).toBe('new-f2');
    });
  });
});
