import Image from '@tiptap/extension-image';
import type { ChainedCommands } from '@tiptap/core';
import { resolveUploadUrl } from '@/utils/uploadUrl';

/**
 * ImageUploadExtension wraps the standard Tiptap Image extension and adds
 * a file-upload command that posts to the existing `/files` API, then
 * inserts the resulting URL as an image node.
 */
export const ImageUploadExtension = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      alt: { default: null },
      title: { default: null },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      uploadImage:
        (file: File, orgId: string) =>
        ({ chain }: { chain: () => ChainedCommands }) => {
          const formData = new FormData();
          formData.append('file', file);

          const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
          return fetch(`${apiBase}/organizations/${orgId}/files`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.data?.url) {
                chain()
                  .focus()
                  .setImage({ src: resolveUploadUrl(data.data.url), alt: file.name })
                  .run();
              }
            })
            .catch((err) => {
              console.error('Image upload failed:', err);
            });
        },
    };
  },
});
