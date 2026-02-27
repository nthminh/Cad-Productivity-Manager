import type { UserRole } from './permissions';
import { db, isFirebaseConfigured } from './firebase';
import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';

export type { UserRole };

export interface AppUser {
  username: string;
  displayName: string;
  role: UserRole;
  passwordHash: string;
}

interface SessionUser {
  username: string;
  displayName: string;
  role: UserRole;
}

const PASSWORD_HASH_KEY = 'app_password_hash'; // legacy key kept for migration
const APP_USERS_KEY = 'app_users';
const SESSION_USER_KEY = 'app_session_user';
const LEGACY_SESSION_KEY = 'app_authenticated';
const DEFAULT_PASSWORD = 'admin';
const PBKDF2_ITERATIONS = 100000;
const FIRESTORE_USERS_COLLECTION = 'app_users';

// ── Crypto helpers ───────────────────────────────────────────────────

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

async function checkHash(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith('pbkdf2:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const salt = fromHex(parts[1]);
    const expectedHash = parts[2];
    return (await pbkdf2Hash(password, salt)) === expectedHash;
  }
  // Legacy plain SHA-256 fallback
  return (await sha256(password)) === stored;
}

/** Hashes a password with PBKDF2 + random salt. Returns "pbkdf2:<saltHex>:<hashHex>". */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2Hash(password, salt);
  return `pbkdf2:${toHex(salt)}:${hash}`;
}

// ── User storage ─────────────────────────────────────────────────────

export function getUsers(): AppUser[] {
  const stored = localStorage.getItem(APP_USERS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as AppUser[];
  } catch {
    return [];
  }
}

function saveUsers(users: AppUser[]): void {
  localStorage.setItem(APP_USERS_KEY, JSON.stringify(users));
  // Fire-and-forget sync to Firestore so other devices can pick up the changes
  void syncUsersToFirestore(users);
}

async function syncUsersToFirestore(users: AppUser[]): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await Promise.all(
      users.map((u) =>
        setDoc(doc(db, FIRESTORE_USERS_COLLECTION, u.username), u),
      ),
    );
  } catch (e) {
    console.error('Failed to sync users to Firestore', e);
  }
}

/**
 * Fetches users from Firestore and updates localStorage.
 * Should be called before ensureDefaultUsers() so that credentials created
 * on another device (e.g. desktop) are available on this device (e.g. phone).
 */
export async function syncUsersFromFirestore(): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    const snapshot = await getDocs(collection(db, FIRESTORE_USERS_COLLECTION));
    if (!snapshot.empty) {
      const users = snapshot.docs.map((d) => d.data() as AppUser);
      localStorage.setItem(APP_USERS_KEY, JSON.stringify(users));
    }
  } catch (e) {
    console.error('Failed to sync users from Firestore', e);
  }
}

/**
 * Ensures at least a default admin user exists.
 * Migrates a legacy single-password hash if present.
 * Call once on app startup (e.g. in LoginGate useEffect).
 */
export async function ensureDefaultUsers(): Promise<void> {
  const users = getUsers();
  if (users.length === 0) {
    const legacyHash = localStorage.getItem(PASSWORD_HASH_KEY);
    const passwordHash = legacyHash ?? (await hashPassword(DEFAULT_PASSWORD));
    saveUsers([
      {
        username: 'admin',
        displayName: 'Quản trị viên',
        role: 'admin',
        passwordHash,
      },
    ]);
  }
}

// ── Authentication ────────────────────────────────────────────────────

/** Verifies username + password and returns the matching AppUser, or null on failure. */
export async function verifyUser(username: string, password: string): Promise<AppUser | null> {
  const users = getUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) return null;
  const valid = await checkHash(password, user.passwordHash);
  return valid ? user : null;
}

export function getCurrentUser(): SessionUser | null {
  const stored = localStorage.getItem(SESSION_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as SessionUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function setCurrentUser(user: AppUser): void {
  const sessionUser: SessionUser = {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(sessionUser));
}

/** @deprecated Use setCurrentUser instead. Kept for backward compatibility. */
export function setAuthenticated(): void {
  // no-op
}

export function logout(): void {
  localStorage.removeItem(SESSION_USER_KEY);
  // Also clear legacy sessionStorage entries for backward compatibility
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}

// ── Password management ───────────────────────────────────────────────

/** @deprecated Use updateUser({ password }) instead. Kept for backward compatibility. */
export function getStoredPasswordHash(): string | null {
  return localStorage.getItem(PASSWORD_HASH_KEY);
}

/**
 * Updates the password hash for the currently logged-in user.
 * @deprecated Use updateUser({ password }) instead. Kept for backward compatibility.
 */
export function setStoredPasswordHash(hash: string): void {
  const session = getCurrentUser();
  if (session) {
    const users = getUsers();
    const idx = users.findIndex((u) => u.username === session.username);
    if (idx !== -1) {
      users[idx] = { ...users[idx], passwordHash: hash };
      saveUsers(users);
    }
  }
  localStorage.setItem(PASSWORD_HASH_KEY, hash);
}

/** Returns true if the currently logged-in user is still using the default password. */
export async function isUsingDefaultPassword(): Promise<boolean> {
  const session = getCurrentUser();
  if (!session) {
    // Before first login: check if any user exists
    return getUsers().length === 0;
  }
  return (await verifyUser(session.username, DEFAULT_PASSWORD)) !== null;
}

/** @deprecated Use verifyUser instead. Checks if the password matches any existing user. */
export async function verifyPassword(password: string): Promise<boolean> {
  const users = getUsers();
  for (const user of users) {
    if (await checkHash(password, user.passwordHash)) return true;
  }
  return false;
}

// ── User management (admin only in UI) ───────────────────────────────

export async function addUser(
  username: string,
  displayName: string,
  role: UserRole,
  password: string,
): Promise<void> {
  const users = getUsers();
  if (users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
    throw new Error('Tên đăng nhập đã tồn tại.');
  }
  const passwordHash = await hashPassword(password);
  saveUsers([...users, { username: username.trim(), displayName, role, passwordHash }]);
}

export async function updateUser(
  username: string,
  updates: { displayName?: string; role?: UserRole; password?: string },
): Promise<void> {
  const users = getUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx === -1) throw new Error('Không tìm thấy người dùng.');
  const updated = { ...users[idx] };
  if (updates.displayName !== undefined) updated.displayName = updates.displayName;
  if (updates.role !== undefined) updated.role = updates.role;
  if (updates.password !== undefined) updated.passwordHash = await hashPassword(updates.password);
  users[idx] = updated;
  saveUsers(users);
}

export function removeUser(username: string): void {
  saveUsers(getUsers().filter((u) => u.username !== username));
  if (isFirebaseConfigured && db) {
    void deleteDoc(doc(db, FIRESTORE_USERS_COLLECTION, username)).catch((e) =>
      console.error('Failed to delete user from Firestore', e),
    );
  }
}

