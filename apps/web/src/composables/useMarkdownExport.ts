import type { Editor } from '@tiptap/core';

/**
 * Composable for Markdown import/export via the tiptap-markdown extension.
 *
 * Requires the Markdown extension to be registered on the editor
 * (which exposes `editor.storage.markdown`).
 */
export function useMarkdownExport(getEditor: () => Editor | null | undefined) {
  /**
   * Export the current editor content as a Markdown string.
   */
  function exportAsMarkdown(): string {
    const editor = getEditor();
    if (!editor) return '';

    // tiptap-markdown stores a getMarkdown() helper on editor.storage.markdown
    const storage = editor.storage as unknown as Record<string, Record<string, unknown>>;
    const md = storage?.markdown;
    if (md && typeof md.getMarkdown === 'function') {
      return (md.getMarkdown as () => string)();
    }

    // Fallback: return the raw HTML (shouldn't happen if the extension is loaded)
    return editor.getHTML();
  }

  /**
   * Replace the editor content with parsed Markdown.
   */
  function importFromMarkdown(markdown: string) {
    const editor = getEditor();
    if (!editor) return;

    // tiptap-markdown makes setContent() accept Markdown strings directly
    editor.commands.setContent(markdown, { emitUpdate: true });
  }

  /**
   * Download the current content as a .md file.
   */
  function downloadAsMarkdown(filename = 'document.md') {
    const md = exportAsMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Open a file picker and import a .md file into the editor.
   */
  function importFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,text/markdown';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        importFromMarkdown(text);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  return {
    exportAsMarkdown,
    importFromMarkdown,
    downloadAsMarkdown,
    importFromFile,
  };
}
