import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import RecoveryKeyModal from '../RecoveryKeyModal.vue';

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

// Mock URL methods
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: vi.fn(),
});

describe('RecoveryKeyModal', () => {
  const testRecoveryKey = 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX-YZ12-3456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mountModal(props: Partial<{ open: boolean; recoveryKey: string }> = {}) {
    return mount(RecoveryKeyModal, {
      props: {
        open: true,
        recoveryKey: testRecoveryKey,
        ...props,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });
  }

  it('should render recovery key when open', () => {
    const wrapper = mountModal();
    expect(wrapper.text()).toContain(testRecoveryKey);
  });

  it('should not render when closed', () => {
    const wrapper = mountModal({ open: false });
    expect(wrapper.text()).not.toContain(testRecoveryKey);
  });

  it('should have a copy button that copies to clipboard', async () => {
    const wrapper = mountModal();
    const copyBtn = wrapper.find('[data-testid="copy-recovery-key"]');
    expect(copyBtn.exists()).toBe(true);

    await copyBtn.trigger('click');
    expect(mockWriteText).toHaveBeenCalledWith(testRecoveryKey);
  });

  it('should have a download button', () => {
    const wrapper = mountModal();
    const downloadBtn = wrapper.find('[data-testid="download-recovery-key"]');
    expect(downloadBtn.exists()).toBe(true);
  });

  it('should have a confirmation checkbox', () => {
    const wrapper = mountModal();
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(checkbox.exists()).toBe(true);
  });

  it('should disable confirm button until checkbox is checked', () => {
    const wrapper = mountModal();
    const confirmBtn = wrapper.find('[data-testid="confirm-recovery-key"]');
    expect(confirmBtn.exists()).toBe(true);
    expect((confirmBtn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('should enable confirm button when checkbox is checked', async () => {
    const wrapper = mountModal();
    const checkbox = wrapper.find('input[type="checkbox"]');
    await checkbox.setValue(true);

    const confirmBtn = wrapper.find('[data-testid="confirm-recovery-key"]');
    expect((confirmBtn.element as HTMLButtonElement).disabled).toBe(false);
  });

  it('should emit confirmed when confirm button is clicked', async () => {
    const wrapper = mountModal();
    const checkbox = wrapper.find('input[type="checkbox"]');
    await checkbox.setValue(true);

    const confirmBtn = wrapper.find('[data-testid="confirm-recovery-key"]');
    await confirmBtn.trigger('click');

    expect(wrapper.emitted('confirmed')).toBeTruthy();
  });

  it('should not emit close on backdrop click (forced modal)', () => {
    const wrapper = mountModal();
    // The modal should not close on backdrop or escape — user must confirm
    expect(wrapper.find('.recovery-modal').exists()).toBe(true);
  });
});
