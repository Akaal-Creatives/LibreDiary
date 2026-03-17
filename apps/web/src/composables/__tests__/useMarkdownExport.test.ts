import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMarkdownExport } from '../useMarkdownExport';
import type { Editor } from '@tiptap/core';

/**
 * Helper to build a minimal mock Editor with configurable storage and commands.
 */
function createMockEditor(
  overrides: {
    storage?: Record<string, unknown>;
    getHTML?: () => string;
    setContent?: (...args: unknown[]) => boolean;
  } = {}
) {
  return {
    storage: overrides.storage ?? {},
    getHTML: overrides.getHTML ?? (() => '<p>fallback html</p>'),
    commands: {
      setContent: overrides.setContent ?? vi.fn(),
    },
  } as unknown as Editor;
}

describe('useMarkdownExport', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportAsMarkdown', () => {
    it('should return empty string when editor is null', () => {
      const { exportAsMarkdown } = useMarkdownExport(() => null);
      expect(exportAsMarkdown()).toBe('');
    });

    it('should return empty string when editor is undefined', () => {
      const { exportAsMarkdown } = useMarkdownExport(() => undefined);
      expect(exportAsMarkdown()).toBe('');
    });

    it('should use storage.markdown.getMarkdown() when available', () => {
      const getMarkdown = vi.fn(() => '# Hello World');
      const editor = createMockEditor({
        storage: { markdown: { getMarkdown } },
      });

      const { exportAsMarkdown } = useMarkdownExport(() => editor);
      const result = exportAsMarkdown();

      expect(getMarkdown).toHaveBeenCalledOnce();
      expect(result).toBe('# Hello World');
    });

    it('should fall back to getHTML() when markdown storage is missing', () => {
      const editor = createMockEditor({
        storage: {},
        getHTML: () => '<p>some html</p>',
      });

      const { exportAsMarkdown } = useMarkdownExport(() => editor);
      expect(exportAsMarkdown()).toBe('<p>some html</p>');
    });

    it('should fall back to getHTML() when markdown.getMarkdown is not a function', () => {
      const editor = createMockEditor({
        storage: { markdown: { getMarkdown: 'not-a-function' } },
        getHTML: () => '<h1>Title</h1>',
      });

      const { exportAsMarkdown } = useMarkdownExport(() => editor);
      expect(exportAsMarkdown()).toBe('<h1>Title</h1>');
    });

    it('should fall back to getHTML() when markdown storage is null-ish', () => {
      const editor = createMockEditor({
        storage: { markdown: undefined } as unknown as Record<string, unknown>,
        getHTML: () => '<p>fallback</p>',
      });

      const { exportAsMarkdown } = useMarkdownExport(() => editor);
      expect(exportAsMarkdown()).toBe('<p>fallback</p>');
    });
  });

  describe('importFromMarkdown', () => {
    it('should do nothing when editor is null', () => {
      const { importFromMarkdown } = useMarkdownExport(() => null);
      // Should not throw
      expect(() => importFromMarkdown('# Test')).not.toThrow();
    });

    it('should do nothing when editor is undefined', () => {
      const { importFromMarkdown } = useMarkdownExport(() => undefined);
      expect(() => importFromMarkdown('# Test')).not.toThrow();
    });

    it('should call editor.commands.setContent with markdown and emitUpdate', () => {
      const setContent = vi.fn();
      const editor = createMockEditor({ setContent });

      const { importFromMarkdown } = useMarkdownExport(() => editor);
      importFromMarkdown('# My Document');

      expect(setContent).toHaveBeenCalledOnce();
      expect(setContent).toHaveBeenCalledWith('# My Document', { emitUpdate: true });
    });

    it('should handle empty markdown string', () => {
      const setContent = vi.fn();
      const editor = createMockEditor({ setContent });

      const { importFromMarkdown } = useMarkdownExport(() => editor);
      importFromMarkdown('');

      expect(setContent).toHaveBeenCalledWith('', { emitUpdate: true });
    });
  });

  describe('downloadAsMarkdown', () => {
    it('should create a blob URL, trigger download, and revoke the URL', () => {
      const editor = createMockEditor({
        storage: { markdown: { getMarkdown: () => '# Content' } },
      });

      const mockAnchor = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);

      const mockUrl = 'blob:http://localhost/fake-uuid';
      vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const { downloadAsMarkdown } = useMarkdownExport(() => editor);
      downloadAsMarkdown();

      expect(URL.createObjectURL).toHaveBeenCalledOnce();
      const blobArg = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('text/markdown;charset=utf-8');

      expect(mockAnchor.href).toBe(mockUrl);
      expect(mockAnchor.download).toBe('document.md');
      expect(mockAnchor.click).toHaveBeenCalledOnce();

      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });

    it('should use a custom filename when provided', () => {
      const editor = createMockEditor({
        storage: { markdown: { getMarkdown: () => '# Custom' } },
      });

      const mockAnchor = { href: '', download: '', click: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const { downloadAsMarkdown } = useMarkdownExport(() => editor);
      downloadAsMarkdown('my-diary-entry.md');

      expect(mockAnchor.download).toBe('my-diary-entry.md');
    });

    it('should download empty content when editor is null', () => {
      const mockAnchor = { href: '', download: '', click: vi.fn() };
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const { downloadAsMarkdown } = useMarkdownExport(() => null);
      downloadAsMarkdown();

      // exportAsMarkdown returns '' for null editor, so blob content is empty
      const blobArg = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
      expect(blobArg.size).toBe(0);
      expect(mockAnchor.click).toHaveBeenCalledOnce();
    });
  });

  describe('importFromFile', () => {
    it('should create a file input with correct attributes and click it', () => {
      const mockInput = {
        type: '',
        accept: '',
        onchange: null as (() => void) | null,
        click: vi.fn(),
        files: null,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockInput as unknown as HTMLElement);

      const { importFromFile } = useMarkdownExport(() => null);
      importFromFile();

      expect(mockInput.type).toBe('file');
      expect(mockInput.accept).toBe('.md,.markdown,text/markdown');
      expect(mockInput.click).toHaveBeenCalledOnce();
    });

    it('should do nothing when no file is selected', () => {
      const setContent = vi.fn();
      const editor = createMockEditor({ setContent });

      const mockInput = {
        type: '',
        accept: '',
        onchange: null as (() => void) | null,
        click: vi.fn(),
        files: [] as unknown as FileList,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockInput as unknown as HTMLElement);

      const { importFromFile } = useMarkdownExport(() => editor);
      importFromFile();

      // Simulate the change event with no files
      expect(mockInput.onchange).not.toBeNull();
      mockInput.onchange!();

      expect(setContent).not.toHaveBeenCalled();
    });

    it('should read a selected file and import its contents', async () => {
      const setContent = vi.fn();
      const editor = createMockEditor({ setContent });

      const fileContent = '# Imported Document\n\nSome content here.';
      const readAsTextSpy = vi.fn();

      vi.stubGlobal(
        'FileReader',
        class MockFileReader {
          result: string | null = null;
          onload: (() => void) | null = null;
          readAsText(file: File) {
            readAsTextSpy(file);
            this.result = fileContent;
            if (this.onload) this.onload();
          }
        }
      );

      const mockFile = new File([fileContent], 'entry.md', {
        type: 'text/markdown',
      });

      const mockInput = {
        type: '',
        accept: '',
        onchange: null as (() => void) | null,
        click: vi.fn(),
        files: [mockFile] as unknown as FileList,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockInput as unknown as HTMLElement);

      const { importFromFile } = useMarkdownExport(() => editor);
      importFromFile();

      // Trigger the file selection change
      mockInput.onchange!();

      expect(readAsTextSpy).toHaveBeenCalledWith(mockFile);
      expect(setContent).toHaveBeenCalledWith(fileContent, { emitUpdate: true });
    });

    it('should not call setContent when editor is null during file import', () => {
      const fileContent = '# Test';
      const readAsTextSpy = vi.fn();

      vi.stubGlobal(
        'FileReader',
        class MockFileReader {
          result: string | null = null;
          onload: (() => void) | null = null;
          readAsText(file: File) {
            readAsTextSpy(file);
            this.result = fileContent;
            if (this.onload) this.onload();
          }
        }
      );

      const mockFile = new File([fileContent], 'test.md', {
        type: 'text/markdown',
      });

      const mockInput = {
        type: '',
        accept: '',
        onchange: null as (() => void) | null,
        click: vi.fn(),
        files: [mockFile] as unknown as FileList,
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockInput as unknown as HTMLElement);

      const { importFromFile } = useMarkdownExport(() => null);
      importFromFile();
      mockInput.onchange!();

      // importFromMarkdown should exit early because editor is null
      expect(readAsTextSpy).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('return value', () => {
    it('should return all four functions', () => {
      const result = useMarkdownExport(() => null);

      expect(typeof result.exportAsMarkdown).toBe('function');
      expect(typeof result.importFromMarkdown).toBe('function');
      expect(typeof result.downloadAsMarkdown).toBe('function');
      expect(typeof result.importFromFile).toBe('function');
      expect(Object.keys(result)).toHaveLength(4);
    });
  });
});
