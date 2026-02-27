const PASSWORD_HASH_KEY = 'app_password_hash';
const SESSION_KEY = 'app_authenticated';
const DEFAULT_PASSWORD = 'admin';
const PBKDF2_ITERATIONS = 100000;

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(pairs.map((h) => parseInt(h, 16)));
}

async function pbkdf2Hash(password: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/** Hashes a password with PBKDF2 + random salt. Returns "pbkdf2:<saltHex>:<hashHex>". */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2Hash(password, salt);
  return `pbkdf2:${toHex(salt)}:${hash}`;
}

export function getStoredPasswordHash(): string | null {
  return localStorage.getItem(PASSWORD_HASH_KEY);
}

export function setStoredPasswordHash(hash: string): void {
  localStorage.setItem(PASSWORD_HASH_KEY, hash);
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

export function setAuthenticated(): void {
  sessionStorage.setItem(SESSION_KEY, 'true');
}

export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/** Verifies a plaintext password against the stored hash (PBKDF2) or against the default (SHA-256). */
export async function verifyPassword(password: string): Promise<boolean> {
  const stored = getStoredPasswordHash();
  if (!stored) {
    // No custom password set yet – compare against the built-in default using SHA-256
    return (await sha256(password)) === (await sha256(DEFAULT_PASSWORD));
  }
  if (stored.startsWith('pbkdf2:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const salt = fromHex(parts[1]);
    const expectedHash = parts[2];
    const hash = await pbkdf2Hash(password, salt);
    return hash === expectedHash;
  }
  // Legacy plain SHA-256 fallback
  return (await sha256(password)) === stored;
}

/** Returns true if the app is still using the default password (no custom password set, or stored hash matches "admin"). */
export async function isUsingDefaultPassword(): Promise<boolean> {
  const stored = getStoredPasswordHash();
  if (!stored) return true;
  return verifyPassword(DEFAULT_PASSWORD);
}

