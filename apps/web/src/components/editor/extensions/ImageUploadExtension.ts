import Image from '@tiptap/extension-image';

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
        ({ chain }: { chain: () => any }) => {
          const formData = new FormData();
          formData.append('file', file);

          return fetch(`/api/v1/organizations/${orgId}/files`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success && data.data?.url) {
                chain().focus().setImage({ src: data.data.url, alt: file.name }).run();
              }
            })
            .catch((err) => {
              console.error('Image upload failed:', err);
            });
        },
    };
  },
});
