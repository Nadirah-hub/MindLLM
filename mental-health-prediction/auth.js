/**
 * Authentication: user store, password hashing, JWT.
 * - USERNAME is unique identifier; PASSWORD is never stored in plain text, shown, or logged.
 * - Authentication status is checked at the start of every protected interaction.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, 'users.json');
const SALT_ROUNDS = 10;
const JWT_EXPIRY = '7d';
const USERNAME_MIN = 1;
const USERNAME_MAX = 64;
const PASSWORD_MIN = 6;

/** Ensure users file exists. */
async function ensureUsersFile() {
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

/**
 * Load users map { username -> hashedPassword }.
 * @returns {Promise<Record<string, string>>}
 */
async function loadUsers() {
  await ensureUsersFile();
  const data = await fs.readFile(USERS_FILE, 'utf8');
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Save users map. Never write plain passwords.
 * @param {Record<string, string>} users
 */
async function saveUsers(users) {
  await ensureUsersFile();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

/**
 * Validate username: non-empty, length, allow letters, numbers, underscore, @, ., hyphen (e.g. email).
 * @param {string} username
 * @returns {{ valid: boolean, message?: string }}
 */
function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required.' };
  }
  const t = username.trim();
  if (t.length < USERNAME_MIN) return { valid: false, message: 'Username is required.' };
  if (t.length > USERNAME_MAX) return { valid: false, message: 'Username is too long.' };
  if (!/^[a-zA-Z0-9_@.\-]+$/.test(t)) {
    return { valid: false, message: 'Username may only contain letters, numbers, and _ @ . -' };
  }
  return { valid: true };
}

/**
 * Validate password: min length. Never return or log the password.
 * @param {string} password
 * @returns {{ valid: boolean, message?: string }}
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }
  if (password.length < PASSWORD_MIN) {
    return { valid: false, message: 'Password must be at least 6 characters.' };
  }
  return { valid: true };
}

/**
 * Register a new user. Password is hashed and never stored in plain text.
 * @param {string} username
 * @param {string} password - never logged or returned
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
async function register(username, password) {
  const u = validateUsername(username);
  if (!u.valid) return { success: false, message: u.message };
  const p = validatePassword(password);
  if (!p.valid) return { success: false, message: p.message };

  const normalizedUsername = username.trim();
  try {
    const users = await loadUsers();
    if (users[normalizedUsername]) {
      return { success: false, message: 'Username already in use.' };
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    users[normalizedUsername] = hashed;
    await saveUsers(users);
    return { success: true };
  } catch (err) {
    console.error('Register error (no password logged):', err.message);
    return { success: false, message: 'Registration failed. Please try again.' };
  }
}

/**
 * Authenticate user. Password is never logged or returned.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ success: boolean, token?: string, username?: string, message?: string }>}
 */
async function login(username, password) {
  const u = validateUsername(username);
  if (!u.valid) return { success: false, message: 'Invalid credentials. Please try again.' };
  const p = validatePassword(password);
  if (!p.valid) return { success: false, message: 'Invalid credentials. Please try again.' };

  const normalizedUsername = username.trim();
  const users = await loadUsers();
  const entry = users[normalizedUsername];

  if (!entry) {
    return { success: false, message: 'Invalid credentials. Please try again.' };
  }

  // Handle legacy (string) and new (object) structure
  const hashed = typeof entry === 'string' ? entry : entry.password;

  const match = await bcrypt.compare(password, hashed);
  if (!match) {
    return { success: false, message: 'Invalid credentials. Please try again.' };
  }

  const secret = process.env.JWT_SECRET || 'mental-health-app-secret-change-in-production';
  const token = jwt.sign(
    { username: normalizedUsername },
    secret,
    { expiresIn: JWT_EXPIRY }
  );
  return { success: true, token, username: normalizedUsername };
}

/**
 * Verify JWT and return payload. Returns null if invalid/expired.
 * @param {string} token
 * @returns {{ username: string } | null}
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const secret = process.env.JWT_SECRET || 'mental-health-app-secret-change-in-production';
  try {
    const payload = jwt.verify(token, secret);
    if (payload && payload.username) return { username: payload.username };
    return null;
  } catch {
    return null;
  }
}

/**
 * Save a chat message to the user's history.
 * @param {string} username
 * @param {object} message - { role, content, mood, timestamp }
 */
async function saveChat(username, message) {
  const normalizedUsername = username.trim();
  const users = await loadUsers();

  // Initialize history array if it doesn't exist
  // We need to handle the case where the user entry might just be the password hash string
  // or an object. To support history, we'll migrate to an object structure if needed,
  // but for simplicity let's store history in a separate property or file?
  // Actually, let's keep it simple: users.json structure will optionally support objects.
  // Wait, the current `register` function stores `users[normalizedUsername] = hashed;` (string).
  // We should change the structure to be `users[normalizedUsername] = { password: hashed, history: [] }`.
  // BUT to avoid breaking existing users without migration, we can check typeof.

  let entry = users[normalizedUsername];
  if (!entry) return; // User not found

  if (typeof entry === 'string') {
    // Migrate string (password hash) to object
    entry = { password: entry, history: [] };
    users[normalizedUsername] = entry;
  }

  if (!entry.history) {
    entry.history = [];
  }

  entry.history.push(message);
  await saveUsers(users);
}

/**
 * Get chat history for a user.
 * @param {string} username
 * @returns {Promise<Array>}
 */
async function getChatHistory(username) {
  const normalizedUsername = username.trim();
  const users = await loadUsers();
  const entry = users[normalizedUsername];

  if (!entry) return [];
  if (typeof entry === 'string') return []; // No history yet, just password

  return entry.history || [];
}

// We also need to update login to handle the object structure
// The existing login function: `const hashed = users[normalizedUsername];`
// If it's an object, `hashed` will be the object, so `bcrypt.compare` will fail.
// I need to update `login` and `register` as well to support the new structure consistently
// or handle both. Let's update `login` right now in this same replacement.

export {
  register,
  login,
  verifyToken,
  validateUsername,
  validatePassword,
  saveChat,
  getChatHistory,
};
