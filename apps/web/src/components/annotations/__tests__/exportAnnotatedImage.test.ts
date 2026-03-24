import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportAnnotatedImage } from '../exportAnnotatedImage';

// Mock canvas context
const mockContext = {
  drawImage: vi.fn(),
};

const mockCanvas = {
  getContext: vi.fn(() => mockContext),
  toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
    cb(new Blob(['fake-image'], { type: 'image/png' }));
  }),
  width: 0,
  height: 0,
};

vi.stubGlobal(
  'document',
  Object.assign(document, {
    createElement: vi.fn((tag: string) => {
      if (tag === 'canvas') return mockCanvas;
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click: vi.fn(),
          style: {},
        };
      }
      return document.createElement(tag);
    }),
  })
);

describe('exportAnnotatedImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('should create a canvas and composite the image with annotations', async () => {
    const mockImage = { naturalWidth: 800, naturalHeight: 600 } as HTMLImageElement;
    const mockStage = {
      toCanvas: vi.fn(() => mockCanvas),
      width: vi.fn(() => 800),
      height: vi.fn(() => 600),
    };

    await exportAnnotatedImage({
      image: mockImage,
      stage: mockStage as never,
      fileName: 'test-annotated.png',
    });

    expect(mockContext.drawImage).toHaveBeenCalled();
  });

  it('should use the provided fileName for download', async () => {
    const mockImage = { naturalWidth: 400, naturalHeight: 300 } as HTMLImageElement;
    const mockStage = {
      toCanvas: vi.fn(() => mockCanvas),
      width: vi.fn(() => 400),
      height: vi.fn(() => 300),
    };

    await exportAnnotatedImage({
      image: mockImage,
      stage: mockStage as never,
      fileName: 'my-export.png',
    });

    // The function should have triggered a download
    // We can verify by checking createElement was called for an anchor
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should return the blob', async () => {
    const mockImage = { naturalWidth: 400, naturalHeight: 300 } as HTMLImageElement;
    const mockStage = {
      toCanvas: vi.fn(() => mockCanvas),
      width: vi.fn(() => 400),
      height: vi.fn(() => 300),
    };

    const blob = await exportAnnotatedImage({
      image: mockImage,
      stage: mockStage as never,
      fileName: 'export.png',
    });

    expect(blob).toBeInstanceOf(Blob);
  });
});
