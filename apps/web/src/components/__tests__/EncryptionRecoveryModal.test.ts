import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import EncryptionRecoveryModal from '../EncryptionRecoveryModal.vue';

// Mock useEncryption
const mockRecoverWithRecoveryKey = vi.fn();
vi.mock('@/composables/useEncryption', () => ({
  useEncryption: () => ({
    recoverWithRecoveryKey: mockRecoverWithRecoveryKey,
  }),
}));

// Mock useToast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

describe('EncryptionRecoveryModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mountModal(props: Partial<{ open: boolean }> = {}) {
    return mount(EncryptionRecoveryModal, {
      props: {
        open: true,
        ...props,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
          RecoveryKeyModal: true,
        },
      },
    });
  }

  it('should render when open', () => {
    const wrapper = mountModal();
    expect(wrapper.find('.recovery-flow-modal').exists()).toBe(true);
  });

  it('should not render when closed', () => {
    const wrapper = mountModal({ open: false });
    expect(wrapper.find('.recovery-flow-modal').exists()).toBe(false);
  });

  it('should show recovery key input on step 1', () => {
    const wrapper = mountModal();
    const input = wrapper.find('[data-testid="recovery-key-input"]');
    expect(input.exists()).toBe(true);
  });

  it('should disable next button when recovery key is empty', () => {
    const wrapper = mountModal();
    const nextBtn = wrapper.find('[data-testid="recovery-next-btn"]');
    expect((nextBtn.element as HTMLButtonElement).disabled).toBe(true);
  });

  it('should show passphrase inputs on step 2', async () => {
    const wrapper = mountModal();
    const input = wrapper.find('[data-testid="recovery-key-input"]');
    await input.setValue('ABCD-EFGH-IJKL-MNOP');

    const nextBtn = wrapper.find('[data-testid="recovery-next-btn"]');
    await nextBtn.trigger('click');

    expect(wrapper.find('[data-testid="new-passphrase-input"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="confirm-passphrase-input"]').exists()).toBe(true);
  });

  it('should show error when passphrases do not match', async () => {
    const wrapper = mountModal();

    // Step 1: enter recovery key
    await wrapper.find('[data-testid="recovery-key-input"]').setValue('ABCD-EFGH-IJKL-MNOP');
    await wrapper.find('[data-testid="recovery-next-btn"]').trigger('click');

    // Step 2: mismatched passphrases
    await wrapper.find('[data-testid="new-passphrase-input"]').setValue('password123');
    await wrapper.find('[data-testid="confirm-passphrase-input"]').setValue('different');
    await wrapper.find('[data-testid="recovery-submit-btn"]').trigger('click');

    expect(wrapper.text()).toContain('do not match');
  });

  it('should call recoverWithRecoveryKey on valid submission', async () => {
    mockRecoverWithRecoveryKey.mockResolvedValue({ recoveryKey: 'NEW-KEY-1234' });

    const wrapper = mountModal();

    // Step 1: enter recovery key
    await wrapper.find('[data-testid="recovery-key-input"]').setValue('ABCD-EFGH-IJKL-MNOP');
    await wrapper.find('[data-testid="recovery-next-btn"]').trigger('click');

    // Step 2: matching passphrases
    await wrapper.find('[data-testid="new-passphrase-input"]').setValue('password123');
    await wrapper.find('[data-testid="confirm-passphrase-input"]').setValue('password123');
    await wrapper.find('[data-testid="recovery-submit-btn"]').trigger('click');
    await flushPromises();

    expect(mockRecoverWithRecoveryKey).toHaveBeenCalledWith('ABCD-EFGH-IJKL-MNOP', 'password123');
  });

  it('should emit close event', () => {
    const wrapper = mountModal();
    const closeBtn = wrapper.find('[data-testid="recovery-close-btn"]');
    closeBtn.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
