import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type StoredUser = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
};

type UsersFile = {
  users: StoredUser[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

type LegacyStoredUser = Omit<StoredUser, "displayName"> & {
  displayName?: string;
};

function getDefaultDisplayName(email: string): string {
  const [name] = email.split("@");
  const fallback = name?.trim() || "Adventurer";
  return fallback.slice(0, 30);
}

function sanitizeDisplayName(displayName: string): string {
  return displayName.trim().replace(/\s+/g, " ").slice(0, 30);
}

async function ensureUsersFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(USERS_FILE, "utf8");
  } catch {
    const initial: UsersFile = { users: [] };
    await writeFile(USERS_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readUsersFile(): Promise<UsersFile> {
  await ensureUsersFile();
  const raw = await readFile(USERS_FILE, "utf8");
  const parsed = JSON.parse(raw) as { users?: LegacyStoredUser[] };
  const users = (parsed.users ?? []).map((user) => ({
    ...user,
    displayName: sanitizeDisplayName(user.displayName ?? getDefaultDisplayName(user.email)),
  }));
  return { users };
}

async function writeUsersFile(data: UsersFile): Promise<void> {
  await ensureUsersFile();
  await writeFile(USERS_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const data = await readUsersFile();
  return data.users.find((user) => user.email === normalizedEmail) ?? null;
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const data = await readUsersFile();
  return data.users.find((user) => user.id === id) ?? null;
}

export async function listUsersByIds(ids: string[]): Promise<StoredUser[]> {
  const uniqueIds = new Set(ids);
  if (uniqueIds.size === 0) {
    return [];
  }

  const data = await readUsersFile();
  return data.users.filter((user) => uniqueIds.has(user.id));
}

export async function createUser(email: string, passwordHash: string): Promise<StoredUser> {
  return createUserWithProfile(email, passwordHash);
}

export async function createUserWithProfile(
  email: string,
  passwordHash: string,
  displayNameInput?: string,
): Promise<StoredUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const data = await readUsersFile();

  if (data.users.some((user) => user.email === normalizedEmail)) {
    throw new Error("User already exists");
  }

  const displayName = sanitizeDisplayName(displayNameInput ?? "") || getDefaultDisplayName(normalizedEmail);

  const user: StoredUser = {
    id: randomUUID(),
    email: normalizedEmail,
    displayName,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  data.users.push(user);
  await writeUsersFile(data);
  return user;
}

export async function updateUserDisplayName(id: string, displayNameInput: string): Promise<StoredUser | null> {
  const data = await readUsersFile();
  const index = data.users.findIndex((user) => user.id === id);

  if (index < 0) {
    return null;
  }

  const displayName = sanitizeDisplayName(displayNameInput);
  if (!displayName) {
    throw new Error("Display name is required");
  }

  data.users[index] = {
    ...data.users[index],
    displayName,
  };

  await writeUsersFile(data);
  return data.users[index];
}
