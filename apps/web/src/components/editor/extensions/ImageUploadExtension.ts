import Image from '@tiptap/extension-image';
import type { ChainedCommands } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import type { Component } from 'vue';
import { resolveUploadUrl } from '@/utils/uploadUrl';
import ImageNodeView from '@/components/annotations/ImageNodeView.vue';

/**
 * ImageUploadExtension wraps the standard Tiptap Image extension and adds
 * a file-upload command that posts to the existing `/files` API, then
 * inserts the resulting URL as an image node.
 */
export const ImageUploadExtension = Image.extend({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {} as Record<string, unknown>,
      resize: false as const,
      orgId: null as string | null,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      alt: { default: null },
      title: { default: null },
    };
  },

  addNodeView() {
    return VueNodeViewRenderer(ImageNodeView as Component);
  },

  addCommands() {
    return {
      ...this.parent?.(),
      uploadImage:
        (file: File, orgId?: string) =>
        ({ chain }: { chain: () => ChainedCommands }) => {
          const effectiveOrgId = orgId ?? (this.options as { orgId?: string | null }).orgId;
          if (!effectiveOrgId) {
            console.error('Image upload failed: no orgId configured');
            return false;
          }

          const formData = new FormData();
          formData.append('file', file);

          const apiBase = import.meta.env.VITE_API_URL || '/api/v1';
          return fetch(`${apiBase}/organizations/${effectiveOrgId}/files`, {
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
