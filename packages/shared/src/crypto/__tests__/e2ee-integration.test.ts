import { describe, it, expect } from 'vitest';
import { deriveKeyFromPassphrase, deriveKeyFromPassphraseWithSalt } from '../key-derivation.js';
import { encrypt, decrypt, generateKey } from '../symmetric.js';
import { wrapKey, unwrapKey } from '../key-wrap.js';
import { generateKeyPair, encryptForRecipient, decryptFromSender } from '../asymmetric.js';
import { generateRecoveryKey, recoverMasterKey } from '../recovery.js';

describe('E2EE Full Key Hierarchy Integration', () => {
  it('should complete the full encryption lifecycle', async () => {
    // 1. User sets up encryption with a passphrase
    const passphrase = 'my-secure-passphrase-2024';
    const { key: masterKey, salt } = await deriveKeyFromPassphrase(passphrase);

    // 2. Generate a workspace key
    const workspaceKey = await generateKey();

    // 3. Wrap workspace key with master key for storage
    const wrappedWorkspaceKey = await wrapKey(workspaceKey, masterKey);

    // 4. Encrypt page content with workspace key
    const pageContent = new TextEncoder().encode('# My Secret Page\n\nThis is private content.');
    const encryptedContent = await encrypt(pageContent, workspaceKey);

    // 5. Later: user re-enters passphrase to decrypt
    const reDerivedMasterKey = await deriveKeyFromPassphraseWithSalt(passphrase, salt);
    expect(reDerivedMasterKey).toEqual(masterKey);

    // 6. Unwrap workspace key
    const unwrappedWorkspaceKey = await unwrapKey(wrappedWorkspaceKey, reDerivedMasterKey);
    expect(unwrappedWorkspaceKey).toEqual(workspaceKey);

    // 7. Decrypt page content
    const decryptedContent = await decrypt(encryptedContent, unwrappedWorkspaceKey);
    expect(new TextDecoder().decode(decryptedContent)).toBe(
      '# My Secret Page\n\nThis is private content.'
    );
  });

  it('should share workspace key with a collaborator', async () => {
    // 1. Owner sets up encryption
    const ownerPassphrase = 'owner-passphrase';
    const { key: ownerMasterKey } = await deriveKeyFromPassphrase(ownerPassphrase);
    const ownerKeyPair = await generateKeyPair();
    const workspaceKey = await generateKey();

    // 2. Owner wraps workspace key (stored server-side for the owner)
    const _ownerWrappedKey = await wrapKey(workspaceKey, ownerMasterKey);

    // 3. Collaborator sets up encryption
    const collabKeyPair = await generateKeyPair();

    // 4. Owner shares workspace key with collaborator
    const keyShare = await encryptForRecipient(
      workspaceKey,
      ownerKeyPair.privateKey,
      collabKeyPair.publicKey
    );

    // 5. Collaborator decrypts the key share
    const collabWorkspaceKey = await decryptFromSender(
      keyShare,
      collabKeyPair.privateKey,
      ownerKeyPair.publicKey
    );
    expect(collabWorkspaceKey).toEqual(workspaceKey);

    // 6. Both can encrypt/decrypt the same content
    const content = new TextEncoder().encode('Shared secret note');
    const encrypted = await encrypt(content, workspaceKey);

    const decryptedByOwner = await decrypt(encrypted, workspaceKey);
    const decryptedByCollab = await decrypt(encrypted, collabWorkspaceKey);

    expect(decryptedByOwner).toEqual(content);
    expect(decryptedByCollab).toEqual(content);
  });

  it('should recover access via recovery key after losing passphrase', async () => {
    // 1. Initial setup
    const passphrase = 'will-be-forgotten';
    const { key: masterKey } = await deriveKeyFromPassphrase(passphrase);
    const workspaceKey = await generateKey();
    const wrappedWorkspaceKey = await wrapKey(workspaceKey, masterKey);

    // 2. Generate recovery key (user saves this)
    const recovery = await generateRecoveryKey(masterKey);

    // 3. Encrypt some content
    const content = new TextEncoder().encode('Important data');
    const encrypted = await encrypt(content, workspaceKey);

    // 4. User forgets passphrase, uses recovery key
    const recoveredMasterKey = await recoverMasterKey(
      recovery.recoveryKey,
      recovery.encryptedMasterKey,
      recovery.salt
    );

    // 5. Unwrap workspace key with recovered master key
    const recoveredWorkspaceKey = await unwrapKey(wrappedWorkspaceKey, recoveredMasterKey);
    expect(recoveredWorkspaceKey).toEqual(workspaceKey);

    // 6. Decrypt content
    const decrypted = await decrypt(encrypted, recoveredWorkspaceKey);
    expect(new TextDecoder().decode(decrypted)).toBe('Important data');
  });

  it('should prevent server from reading content', async () => {
    // Simulate what the server sees
    const passphrase = 'user-passphrase';
    const { key: masterKey } = await deriveKeyFromPassphrase(passphrase);
    const workspaceKey = await generateKey();
    const wrappedWorkspaceKey = await wrapKey(workspaceKey, masterKey);

    const content = new TextEncoder().encode('Server should never see this');
    const encrypted = await encrypt(content, workspaceKey);

    // Server has: salt, wrappedWorkspaceKey, encrypted content
    // Server does NOT have: passphrase, masterKey, workspaceKey

    // Server cannot decrypt without the master key
    const wrongKey = await generateKey();
    await expect(unwrapKey(wrappedWorkspaceKey, wrongKey)).rejects.toThrow();

    // Server cannot decrypt content without workspace key
    await expect(decrypt(encrypted, wrongKey)).rejects.toThrow();
  });
});
