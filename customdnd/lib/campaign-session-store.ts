import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCampaignForUser } from "@/lib/campaign-store";

export type CampaignSessionStatus = "scheduled" | "completed" | "canceled";

export type CampaignSession = {
  id: string;
  campaignId: string;
  title: string;
  scheduledFor: string;
  notes: string;
  status: CampaignSessionStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type CampaignSessionsFile = {
  sessions: CampaignSession[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const CAMPAIGN_SESSIONS_FILE = path.join(DATA_DIR, "campaign-sessions.json");

function sanitizeTitle(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 120);
}

function sanitizeNotes(input: string): string {
  return input.trim().slice(0, 10000);
}

function toValidIsoDate(input: string): string | null {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

async function ensureSessionsFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(CAMPAIGN_SESSIONS_FILE, "utf8");
  } catch {
    const initial: CampaignSessionsFile = { sessions: [] };
    await writeFile(CAMPAIGN_SESSIONS_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readSessionsFile(): Promise<CampaignSessionsFile> {
  await ensureSessionsFile();
  const raw = await readFile(CAMPAIGN_SESSIONS_FILE, "utf8");
  return JSON.parse(raw) as CampaignSessionsFile;
}

async function writeSessionsFile(data: CampaignSessionsFile): Promise<void> {
  await ensureSessionsFile();
  await writeFile(CAMPAIGN_SESSIONS_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function listCampaignSessions(campaignId: string, requesterUserId: string) {
  const membership = await getCampaignForUser(campaignId, requesterUserId);
  if (!membership) {
    throw new Error("Unauthorized");
  }

  const data = await readSessionsFile();
  const sessions = data.sessions
    .filter((session) => session.campaignId === campaignId)
    .sort((a, b) => (a.scheduledFor < b.scheduledFor ? 1 : -1));

  return {
    sessions,
    canManageSessions: membership.role === "owner" || membership.role === "dm",
  };
}

export async function createCampaignSession(
  campaignId: string,
  requesterUserId: string,
  input: {
    title: string;
    scheduledFor: string;
    notes?: string;
  },
): Promise<CampaignSession> {
  const membership = await getCampaignForUser(campaignId, requesterUserId);
  if (!membership || (membership.role !== "owner" && membership.role !== "dm")) {
    throw new Error("Forbidden");
  }

  const title = sanitizeTitle(input.title);
  if (!title) {
    throw new Error("Session title is required");
  }

  const scheduledFor = toValidIsoDate(input.scheduledFor);
  if (!scheduledFor) {
    throw new Error("Valid scheduled date is required");
  }

  const notes = sanitizeNotes(input.notes ?? "");
  const now = new Date().toISOString();
  const session: CampaignSession = {
    id: randomUUID(),
    campaignId,
    title,
    scheduledFor,
    notes,
    status: "scheduled",
    createdByUserId: requesterUserId,
    createdAt: now,
    updatedAt: now,
  };

  const data = await readSessionsFile();
  data.sessions.push(session);
  await writeSessionsFile(data);
  return session;
}

export async function updateCampaignSession(
  campaignId: string,
  sessionId: string,
  requesterUserId: string,
  updates: {
    title?: string;
    scheduledFor?: string;
    notes?: string;
    status?: CampaignSessionStatus;
  },
): Promise<CampaignSession | null> {
  const membership = await getCampaignForUser(campaignId, requesterUserId);
  if (!membership || (membership.role !== "owner" && membership.role !== "dm")) {
    throw new Error("Forbidden");
  }

  const data = await readSessionsFile();
  const index = data.sessions.findIndex(
    (session) => session.id === sessionId && session.campaignId === campaignId,
  );
  if (index < 0) {
    return null;
  }

  const current = data.sessions[index];

  let nextTitle = current.title;
  if (updates.title !== undefined) {
    const sanitized = sanitizeTitle(updates.title);
    if (!sanitized) {
      throw new Error("Session title is required");
    }
    nextTitle = sanitized;
  }

  let nextScheduledFor = current.scheduledFor;
  if (updates.scheduledFor !== undefined) {
    const iso = toValidIsoDate(updates.scheduledFor);
    if (!iso) {
      throw new Error("Valid scheduled date is required");
    }
    nextScheduledFor = iso;
  }

  let nextStatus = current.status;
  if (updates.status !== undefined) {
    if (updates.status !== "scheduled" && updates.status !== "completed" && updates.status !== "canceled") {
      throw new Error("Invalid status");
    }
    nextStatus = updates.status;
  }

  let nextNotes = current.notes;
  if (updates.notes !== undefined) {
    nextNotes = sanitizeNotes(updates.notes);
  }

  const updated: CampaignSession = {
    ...current,
    title: nextTitle,
    scheduledFor: nextScheduledFor,
    status: nextStatus,
    notes: nextNotes,
    updatedAt: new Date().toISOString(),
  };

  data.sessions[index] = updated;
  await writeSessionsFile(data);
  return updated;
}
