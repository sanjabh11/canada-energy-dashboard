export const SOVEREIGN_VAULT_ENVELOPE_VERSION = 'edge-vault-v1';
export const SOVEREIGN_VAULT_ALGORITHM = 'AES-GCM';
export const SOVEREIGN_VAULT_KDF = {
  name: 'PBKDF2',
  hash: 'SHA-256',
  iterations: 210_000,
} as const;

export interface SovereignVaultKdfDescriptor {
  name: 'PBKDF2';
  hash: 'SHA-256';
  iterations: number;
}

export interface SovereignVaultEncryptedEnvelope {
  version: string;
  algorithm: string;
  kdf: SovereignVaultKdfDescriptor;
  salt: string;
  iv: string;
  fingerprint: string;
  exportedAt: string;
  dataOwner: string;
  ciphertext: string;
}

function ensureCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto is unavailable in this environment.');
  }
  return globalThis.crypto;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sha256Hex(value: string): Promise<string> {
  const cryptoApi = ensureCrypto();
  const digest = await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function deriveEncryptionKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const cryptoApi = ensureCrypto();
  const baseKey = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: SOVEREIGN_VAULT_KDF.iterations,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function isSovereignVaultEnvelope(value: unknown): value is SovereignVaultEncryptedEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.version === 'string'
    && typeof candidate.algorithm === 'string'
    && typeof candidate.salt === 'string'
    && typeof candidate.iv === 'string'
    && typeof candidate.fingerprint === 'string'
    && typeof candidate.exportedAt === 'string'
    && typeof candidate.dataOwner === 'string'
    && typeof candidate.ciphertext === 'string'
    && typeof candidate.kdf === 'object'
    && candidate.kdf !== null;
}

export async function buildSovereignVaultFingerprint(metadata: {
  version: string;
  algorithm: string;
  kdf: SovereignVaultKdfDescriptor;
  salt: string;
  iv: string;
  exportedAt: string;
  dataOwner: string;
}): Promise<string> {
  const material = [
    metadata.version,
    metadata.algorithm,
    metadata.kdf.name,
    metadata.kdf.hash,
    metadata.kdf.iterations,
    metadata.salt,
    metadata.iv,
    metadata.exportedAt,
    metadata.dataOwner,
  ].join('|');
  const digest = await sha256Hex(material);
  return `${digest.slice(0, 8)}-${digest.slice(8, 16)}-${digest.slice(16, 24)}`;
}

export async function encryptSovereignVaultPayload(
  payload: unknown,
  passphrase: string,
  dataOwner: string,
  exportedAt = new Date().toISOString(),
): Promise<SovereignVaultEncryptedEnvelope> {
  if (!passphrase.trim()) {
    throw new Error('Passphrase is required for encrypted export.');
  }

  const cryptoApi = ensureCrypto();
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await cryptoApi.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const saltBase64 = bytesToBase64(salt);
  const ivBase64 = bytesToBase64(iv);
  const envelopeMetadata = {
    version: SOVEREIGN_VAULT_ENVELOPE_VERSION,
    algorithm: SOVEREIGN_VAULT_ALGORITHM,
    kdf: { ...SOVEREIGN_VAULT_KDF },
    salt: saltBase64,
    iv: ivBase64,
    exportedAt,
    dataOwner,
  };

  return {
    ...envelopeMetadata,
    fingerprint: await buildSovereignVaultFingerprint(envelopeMetadata),
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptSovereignVaultPayload<T>(
  envelope: unknown,
  passphrase: string,
): Promise<T> {
  if (!isSovereignVaultEnvelope(envelope)) {
    throw new Error('Malformed encrypted vault envelope.');
  }
  if (envelope.version !== SOVEREIGN_VAULT_ENVELOPE_VERSION) {
    throw new Error(`Unsupported vault envelope version: ${envelope.version}`);
  }
  if (envelope.algorithm !== SOVEREIGN_VAULT_ALGORITHM || envelope.kdf?.name !== 'PBKDF2') {
    throw new Error('Unsupported vault encryption settings.');
  }
  if (!passphrase.trim()) {
    throw new Error('Passphrase is required for import.');
  }

  try {
    const key = await deriveEncryptionKey(passphrase, base64ToBytes(envelope.salt));
    const decrypted = await ensureCrypto().subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
      key,
      base64ToBytes(envelope.ciphertext),
    );
    const plaintext = new TextDecoder().decode(new Uint8Array(decrypted));
    return JSON.parse(plaintext) as T;
  } catch {
    throw new Error('Vault import failed. Verify the passphrase and encrypted file.');
  }
}
