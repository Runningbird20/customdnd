import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type GuestLink = {
  token: string;
  sessionId: string;
  sessionName: string;
  hostUserId: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
};

type GuestLinksFile = {
  links: GuestLink[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const GUEST_LINKS_FILE = path.join(DATA_DIR, "guest-links.json");

async function ensureGuestLinksFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(GUEST_LINKS_FILE, "utf8");
  } catch {
    const initial: GuestLinksFile = { links: [] };
    await writeFile(GUEST_LINKS_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readGuestLinksFile(): Promise<GuestLinksFile> {
  await ensureGuestLinksFile();
  const raw = await readFile(GUEST_LINKS_FILE, "utf8");
  return JSON.parse(raw) as GuestLinksFile;
}

async function writeGuestLinksFile(data: GuestLinksFile): Promise<void> {
  await ensureGuestLinksFile();
  await writeFile(GUEST_LINKS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function sanitizeSessionName(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 60);
}

export function isLinkExpired(link: GuestLink): boolean {
  return Date.now() > new Date(link.expiresAt).getTime();
}

export async function createGuestLink(
  hostUserId: string,
  sessionNameInput: string,
  expiresInHours: number,
): Promise<GuestLink> {
  const sessionName = sanitizeSessionName(sessionNameInput);
  if (!sessionName) {
    throw new Error("Session name is required");
  }

  if (expiresInHours < 1 || expiresInHours > 168) {
    throw new Error("Expiry must be between 1 and 168 hours");
  }

  const data = await readGuestLinksFile();
  const link: GuestLink = {
    token: randomBytes(24).toString("base64url"),
    sessionId: randomUUID(),
    sessionName,
    hostUserId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
    revoked: false,
  };

  data.links.push(link);
  await writeGuestLinksFile(data);
  return link;
}

export async function listGuestLinksByHost(hostUserId: string): Promise<GuestLink[]> {
  const data = await readGuestLinksFile();
  return data.links
    .filter((link) => link.hostUserId === hostUserId)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function findGuestLinkByToken(token: string): Promise<GuestLink | null> {
  const data = await readGuestLinksFile();
  return data.links.find((link) => link.token === token) ?? null;
}

export async function validateGuestLink(token: string): Promise<GuestLink | null> {
  const link = await findGuestLinkByToken(token);
  if (!link) {
    return null;
  }

  if (link.revoked || isLinkExpired(link)) {
    return null;
  }

  return link;
}
