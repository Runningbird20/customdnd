import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCampaignForUser } from "@/lib/campaign-store";

export type CampaignRule = {
  id: string;
  campaignId: string;
  title: string;
  content: string;
  pinned: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type CampaignRulesFile = {
  rules: CampaignRule[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const CAMPAIGN_RULES_FILE = path.join(DATA_DIR, "campaign-rules.json");

function sanitizeTitle(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 120);
}

function sanitizeContent(input: string): string {
  return input.trim().slice(0, 5000);
}

async function ensureRulesFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(CAMPAIGN_RULES_FILE, "utf8");
  } catch {
    const initial: CampaignRulesFile = { rules: [] };
    await writeFile(CAMPAIGN_RULES_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readRulesFile(): Promise<CampaignRulesFile> {
  await ensureRulesFile();
  const raw = await readFile(CAMPAIGN_RULES_FILE, "utf8");
  return JSON.parse(raw) as CampaignRulesFile;
}

async function writeRulesFile(data: CampaignRulesFile): Promise<void> {
  await ensureRulesFile();
  await writeFile(CAMPAIGN_RULES_FILE, JSON.stringify(data, null, 2), "utf8");
}

function canManageRules(role: "owner" | "dm" | "player" | "spectator"): boolean {
  return role === "owner" || role === "dm";
}

function sortRules(rules: CampaignRule[]): CampaignRule[] {
  return [...rules].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
}

export async function listCampaignRules(campaignId: string, requesterUserId: string) {
  const membership = await getCampaignForUser(campaignId, requesterUserId);
  if (!membership) {
    throw new Error("Unauthorized");
  }

  const data = await readRulesFile();
  const rules = sortRules(data.rules.filter((rule) => rule.campaignId === campaignId));

  return {
    rules,
    canManageRules: canManageRules(membership.role),
  };
}

export async function createCampaignRule(
  campaignId: string,
  requesterUserId: string,
  input: {
    title: string;
    content: string;
    pinned?: boolean;
  },
): Promise<CampaignRule> {
  const membership = await getCampaignForUser(campaignId, requesterUserId);
  if (!membership || !canManageRules(membership.role)) {
    throw new Error("Forbidden");
  }

  const title = sanitizeTitle(input.title);
  if (!title) {
    throw new Error("Rule title is required");
  }

  const content = sanitizeContent(input.content);
  if (!content) {
    throw new Error("Rule content is required");
  }

  const now = new Date().toISOString();
  const rule: CampaignRule = {
    id: randomUUID(),
    campaignId,
    title,
    content,
    pinned: Boolean(input.pinned ?? true),
    createdByUserId: requesterUserId,
    createdAt: now,
    updatedAt: now,
  };

  const data = await readRulesFile();
  data.rules.push(rule);
  await writeRulesFile(data);
  return rule;
}

export async function updateCampaignRule(
  campaignId: string,
  ruleId: string,
  requesterUserId: string,
  updates: {
    title?: string;
    content?: string;
    pinned?: boolean;
  },
): Promise<CampaignRule | null> {
  const membership = await getCampaignForUser(campaignId, requesterUserId);
  if (!membership || !canManageRules(membership.role)) {
    throw new Error("Forbidden");
  }

  const data = await readRulesFile();
  const index = data.rules.findIndex((rule) => rule.id === ruleId && rule.campaignId === campaignId);
  if (index < 0) {
    return null;
  }

  const current = data.rules[index];

  let title = current.title;
  if (updates.title !== undefined) {
    const sanitized = sanitizeTitle(updates.title);
    if (!sanitized) {
      throw new Error("Rule title is required");
    }
    title = sanitized;
  }

  let content = current.content;
  if (updates.content !== undefined) {
    const sanitized = sanitizeContent(updates.content);
    if (!sanitized) {
      throw new Error("Rule content is required");
    }
    content = sanitized;
  }

  const updated: CampaignRule = {
    ...current,
    title,
    content,
    pinned: updates.pinned ?? current.pinned,
    updatedAt: new Date().toISOString(),
  };

  data.rules[index] = updated;
  await writeRulesFile(data);
  return updated;
}

export async function deleteCampaignRule(
  campaignId: string,
  ruleId: string,
  requesterUserId: string,
): Promise<boolean> {
  const membership = await getCampaignForUser(campaignId, requesterUserId);
  if (!membership || !canManageRules(membership.role)) {
    throw new Error("Forbidden");
  }

  const data = await readRulesFile();
  const initialCount = data.rules.length;
  data.rules = data.rules.filter((rule) => !(rule.id === ruleId && rule.campaignId === campaignId));
  if (data.rules.length === initialCount) {
    return false;
  }

  await writeRulesFile(data);
  return true;
}
