import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { listUsersByIds } from "@/lib/user-store";

export type CampaignRole = "owner" | "dm" | "player" | "spectator";
export type AssignableCampaignRole = Exclude<CampaignRole, "owner">;

export type Campaign = {
  id: string;
  name: string;
  description: string;
  partyList: string[];
  ownerUserId: string;
  createdAt: string;
};

export type CampaignMember = {
  campaignId: string;
  userId: string;
  role: CampaignRole;
  joinedAt: string;
};

export type CampaignMemberWithUser = CampaignMember & {
  email: string;
  displayName: string;
};

export type SessionModeSnapshot = {
  campaign: {
    id: string;
    name: string;
    description: string;
    partyList: string[];
  };
  currentUser: {
    userId: string;
    role: CampaignRole;
    permissions: {
      canRunSession: boolean;
      canManageInvites: boolean;
      canManageRoles: boolean;
      canManageHouseRules: boolean;
    };
  };
  members: Array<{
    userId: string;
    displayName: string;
    role: CampaignRole;
  }>;
};

export type CampaignInviteLink = {
  id: string;
  campaignId: string;
  token: string;
  createdByUserId: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
};

export type CampaignEmailInvite = {
  id: string;
  campaignId: string;
  invitedEmail: string;
  createdByUserId: string;
  createdAt: string;
  status: "pending" | "accepted";
  acceptedAt?: string;
};

type LegacyCampaignMember = Omit<CampaignMember, "role"> & {
  role: "owner" | "player";
};

type LegacyCampaign = Omit<Campaign, "description" | "partyList"> & {
  description?: string;
  partyList?: string[];
};

type CampaignsFile = {
  campaigns: Campaign[];
  members: CampaignMember[];
  inviteLinks: CampaignInviteLink[];
  emailInvites: CampaignEmailInvite[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const CAMPAIGNS_FILE = path.join(DATA_DIR, "campaigns.json");

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sanitizeCampaignName(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 80);
}

function sanitizeCampaignDescription(input: string): string {
  return input.trim().slice(0, 1000);
}

function sanitizePartyList(input: string[]): string[] {
  const cleaned = input
    .map((entry) => entry.trim().replace(/\s+/g, " ").slice(0, 60))
    .filter((entry) => entry.length > 0);

  const unique = Array.from(new Set(cleaned));
  return unique.slice(0, 50);
}

function normalizeMemberRole(role: LegacyCampaignMember["role"] | CampaignRole): CampaignRole {
  if (role === "owner" || role === "dm" || role === "player" || role === "spectator") {
    return role;
  }
  return "player";
}

async function ensureCampaignsFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(CAMPAIGNS_FILE, "utf8");
  } catch {
    const initial: CampaignsFile = {
      campaigns: [],
      members: [],
      inviteLinks: [],
      emailInvites: [],
    };
    await writeFile(CAMPAIGNS_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readCampaignsFile(): Promise<CampaignsFile> {
  await ensureCampaignsFile();
  const raw = await readFile(CAMPAIGNS_FILE, "utf8");
  const parsed = JSON.parse(raw) as {
    campaigns?: LegacyCampaign[];
    members?: LegacyCampaignMember[];
    inviteLinks?: CampaignInviteLink[];
    emailInvites?: CampaignEmailInvite[];
  };

  return {
    campaigns: (parsed.campaigns ?? []).map((campaign) => ({
      ...campaign,
      description: sanitizeCampaignDescription(campaign.description ?? ""),
      partyList: sanitizePartyList(campaign.partyList ?? []),
    })),
    members: (parsed.members ?? []).map((member) => ({
      ...member,
      role: normalizeMemberRole(member.role),
    })),
    inviteLinks: parsed.inviteLinks ?? [],
    emailInvites: parsed.emailInvites ?? [],
  };
}

async function writeCampaignsFile(data: CampaignsFile): Promise<void> {
  await ensureCampaignsFile();
  await writeFile(CAMPAIGNS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function ensureOwnerMembership(data: CampaignsFile, campaignId: string, ownerUserId: string): void {
  const membership = data.members.find(
    (member) => member.campaignId === campaignId && member.userId === ownerUserId,
  );
  if (!membership) {
    data.members.push({
      campaignId,
      userId: ownerUserId,
      role: "owner",
      joinedAt: new Date().toISOString(),
    });
    return;
  }

  membership.role = "owner";
}

export async function createCampaign(
  ownerUserId: string,
  nameInput: string,
  descriptionInput = "",
  partyListInput: string[] = [],
): Promise<Campaign> {
  const name = sanitizeCampaignName(nameInput);
  if (!name) {
    throw new Error("Campaign name is required");
  }

  const description = sanitizeCampaignDescription(descriptionInput);
  const partyList = sanitizePartyList(partyListInput);

  const data = await readCampaignsFile();
  const campaign: Campaign = {
    id: randomUUID(),
    name,
    description,
    partyList,
    ownerUserId,
    createdAt: new Date().toISOString(),
  };

  data.campaigns.push(campaign);
  ensureOwnerMembership(data, campaign.id, ownerUserId);
  await writeCampaignsFile(data);
  return campaign;
}

export async function listCampaignsForUser(userId: string): Promise<Array<Campaign & { role: CampaignRole }>> {
  const data = await readCampaignsFile();
  const memberships = data.members.filter((member) => member.userId === userId);

  return memberships
    .map((member) => {
      const campaign = data.campaigns.find((item) => item.id === member.campaignId);
      if (!campaign) {
        return null;
      }
      return { ...campaign, role: member.role };
    })
    .filter((value): value is Campaign & { role: CampaignRole } => Boolean(value));
}

export async function getCampaignForUser(
  campaignId: string,
  userId: string,
): Promise<(Campaign & { role: CampaignRole }) | null> {
  const data = await readCampaignsFile();
  const campaign = data.campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    return null;
  }

  ensureOwnerMembership(data, campaign.id, campaign.ownerUserId);

  const membership = data.members.find((member) => member.campaignId === campaignId && member.userId === userId);
  if (!membership) {
    return null;
  }

  return {
    ...campaign,
    role: membership.role,
  };
}

export async function isCampaignOwner(campaignId: string, userId: string): Promise<boolean> {
  const data = await readCampaignsFile();
  const campaign = data.campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    return false;
  }

  ensureOwnerMembership(data, campaign.id, campaign.ownerUserId);
  return data.members.some(
    (member) => member.campaignId === campaignId && member.userId === userId && member.role === "owner",
  );
}

export function isInviteLinkExpired(link: CampaignInviteLink): boolean {
  return Date.now() > new Date(link.expiresAt).getTime();
}

export async function createCampaignInviteLink(
  campaignId: string,
  ownerUserId: string,
  expiresInHours: number,
): Promise<CampaignInviteLink> {
  const data = await readCampaignsFile();
  const campaign = data.campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }
  ensureOwnerMembership(data, campaign.id, campaign.ownerUserId);

  const ownerMembership = data.members.find(
    (member) => member.campaignId === campaignId && member.userId === ownerUserId && member.role === "owner",
  );
  if (!ownerMembership) {
    throw new Error("Only owners can create invite links");
  }

  if (expiresInHours < 1 || expiresInHours > 168) {
    throw new Error("Expiry must be between 1 and 168 hours");
  }

  const link: CampaignInviteLink = {
    id: randomUUID(),
    campaignId,
    token: randomBytes(24).toString("base64url"),
    createdByUserId: ownerUserId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
    revoked: false,
  };

  data.inviteLinks.push(link);
  await writeCampaignsFile(data);
  return link;
}

export async function listCampaignInviteLinks(
  campaignId: string,
  userId: string,
): Promise<CampaignInviteLink[]> {
  const data = await readCampaignsFile();
  const campaign = data.campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }
  ensureOwnerMembership(data, campaign.id, campaign.ownerUserId);

  const ownerMembership = data.members.find(
    (member) => member.campaignId === campaignId && member.userId === userId && member.role === "owner",
  );
  if (!ownerMembership) {
    throw new Error("Only owners can view invite links");
  }

  return data.inviteLinks
    .filter((link) => link.campaignId === campaignId)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function getCampaignInviteLinkByToken(token: string): Promise<CampaignInviteLink | null> {
  const data = await readCampaignsFile();
  return data.inviteLinks.find((link) => link.token === token) ?? null;
}

export async function joinCampaignByInviteLink(token: string, userId: string): Promise<Campaign | null> {
  const data = await readCampaignsFile();
  const link = data.inviteLinks.find((item) => item.token === token);
  if (!link || link.revoked || isInviteLinkExpired(link)) {
    return null;
  }

  const campaign = data.campaigns.find((item) => item.id === link.campaignId);
  if (!campaign) {
    return null;
  }

  ensureOwnerMembership(data, campaign.id, campaign.ownerUserId);

  const existingMember = data.members.find(
    (member) => member.campaignId === campaign.id && member.userId === userId,
  );

  if (!existingMember) {
    data.members.push({
      campaignId: campaign.id,
      userId,
      role: "player",
      joinedAt: new Date().toISOString(),
    });
    await writeCampaignsFile(data);
  }

  return campaign;
}

export async function createCampaignEmailInvite(
  campaignId: string,
  ownerUserId: string,
  invitedEmailInput: string,
): Promise<CampaignEmailInvite> {
  const invitedEmail = normalizeEmail(invitedEmailInput);
  if (!invitedEmail) {
    throw new Error("Email is required");
  }

  const data = await readCampaignsFile();
  const campaign = data.campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }
  ensureOwnerMembership(data, campaign.id, campaign.ownerUserId);

  const ownerMembership = data.members.find(
    (member) => member.campaignId === campaignId && member.userId === ownerUserId && member.role === "owner",
  );
  if (!ownerMembership) {
    throw new Error("Only owners can send email invites");
  }

  const existing = data.emailInvites.find(
    (invite) =>
      invite.campaignId === campaignId &&
      invite.invitedEmail === invitedEmail &&
      invite.status === "pending",
  );
  if (existing) {
    return existing;
  }

  const invite: CampaignEmailInvite = {
    id: randomUUID(),
    campaignId,
    invitedEmail,
    createdByUserId: ownerUserId,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  data.emailInvites.push(invite);
  await writeCampaignsFile(data);
  return invite;
}

export async function listCampaignEmailInvites(
  campaignId: string,
  userId: string,
): Promise<CampaignEmailInvite[]> {
  const data = await readCampaignsFile();
  const campaign = data.campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }
  ensureOwnerMembership(data, campaign.id, campaign.ownerUserId);

  const ownerMembership = data.members.find(
    (member) => member.campaignId === campaignId && member.userId === userId && member.role === "owner",
  );
  if (!ownerMembership) {
    throw new Error("Only owners can view email invites");
  }

  return data.emailInvites
    .filter((invite) => invite.campaignId === campaignId)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function listPendingEmailInvitesForEmail(emailInput: string): Promise<CampaignEmailInvite[]> {
  const email = normalizeEmail(emailInput);
  const data = await readCampaignsFile();
  return data.emailInvites
    .filter((invite) => invite.invitedEmail === email && invite.status === "pending")
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function acceptCampaignEmailInvite(
  inviteId: string,
  userId: string,
  emailInput: string,
): Promise<Campaign | null> {
  const email = normalizeEmail(emailInput);
  const data = await readCampaignsFile();
  const inviteIndex = data.emailInvites.findIndex((invite) => invite.id === inviteId);
  if (inviteIndex < 0) {
    return null;
  }

  const invite = data.emailInvites[inviteIndex];
  if (invite.status !== "pending" || invite.invitedEmail !== email) {
    return null;
  }

  const campaign = data.campaigns.find((item) => item.id === invite.campaignId);
  if (!campaign) {
    return null;
  }

  ensureOwnerMembership(data, campaign.id, campaign.ownerUserId);

  const existingMember = data.members.find(
    (member) => member.campaignId === campaign.id && member.userId === userId,
  );
  if (!existingMember) {
    data.members.push({
      campaignId: campaign.id,
      userId,
      role: "player",
      joinedAt: new Date().toISOString(),
    });
  }

  data.emailInvites[inviteIndex] = {
    ...invite,
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  };
  await writeCampaignsFile(data);

  return campaign;
}

export async function listCampaignMembers(
  campaignId: string,
  requesterUserId: string,
): Promise<CampaignMemberWithUser[]> {
  const data = await readCampaignsFile();
  const campaign = data.campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }
  ensureOwnerMembership(data, campaign.id, campaign.ownerUserId);

  const requesterMembership = data.members.find(
    (member) => member.campaignId === campaignId && member.userId === requesterUserId,
  );
  if (!requesterMembership) {
    throw new Error("Only campaign members can view members");
  }

  const members = data.members.filter((member) => member.campaignId === campaignId);
  const users = await listUsersByIds(members.map((member) => member.userId));
  const usersById = new Map(users.map((user) => [user.id, user]));

  return members
    .map((member) => {
      const user = usersById.get(member.userId);
      if (!user) {
        return null;
      }
      return {
        ...member,
        email: user.email,
        displayName: user.displayName,
      };
    })
    .filter((member): member is CampaignMemberWithUser => Boolean(member));
}

export async function updateCampaignMemberRole(
  campaignId: string,
  ownerUserId: string,
  targetUserId: string,
  role: AssignableCampaignRole,
): Promise<CampaignMemberWithUser | null> {
  const data = await readCampaignsFile();
  const campaign = data.campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    throw new Error("Campaign not found");
  }
  ensureOwnerMembership(data, campaign.id, campaign.ownerUserId);

  const ownerMembership = data.members.find(
    (member) => member.campaignId === campaignId && member.userId === ownerUserId && member.role === "owner",
  );
  if (!ownerMembership) {
    throw new Error("Only owners can set roles");
  }

  if (targetUserId === campaign.ownerUserId) {
    throw new Error("Owner role cannot be reassigned");
  }

  const memberIndex = data.members.findIndex(
    (member) => member.campaignId === campaignId && member.userId === targetUserId,
  );
  if (memberIndex < 0) {
    return null;
  }

  data.members[memberIndex] = {
    ...data.members[memberIndex],
    role,
  };
  await writeCampaignsFile(data);

  const [user] = await listUsersByIds([targetUserId]);
  if (!user) {
    return null;
  }

  return {
    ...data.members[memberIndex],
    email: user.email,
    displayName: user.displayName,
  };
}

export async function getSessionModeSnapshot(
  campaignId: string,
  requesterUserId: string,
): Promise<SessionModeSnapshot | null> {
  const data = await readCampaignsFile();
  const campaign = data.campaigns.find((item) => item.id === campaignId);
  if (!campaign) {
    return null;
  }

  ensureOwnerMembership(data, campaign.id, campaign.ownerUserId);

  const requesterMembership = data.members.find(
    (member) => member.campaignId === campaignId && member.userId === requesterUserId,
  );
  if (!requesterMembership) {
    return null;
  }

  const members = data.members.filter((member) => member.campaignId === campaignId);
  const users = await listUsersByIds(members.map((member) => member.userId));
  const usersById = new Map(users.map((user) => [user.id, user]));

  const role = requesterMembership.role;
  const canRunSession = role === "owner" || role === "dm";

  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      partyList: campaign.partyList,
    },
    currentUser: {
      userId: requesterUserId,
      role,
      permissions: {
        canRunSession,
        canManageInvites: role === "owner",
        canManageRoles: role === "owner",
        canManageHouseRules: role === "owner" || role === "dm",
      },
    },
    members: members
      .map((member) => {
        const user = usersById.get(member.userId);
        if (!user) {
          return null;
        }
        return {
          userId: member.userId,
          displayName: user.displayName,
          role: member.role,
        };
      })
      .filter((member): member is SessionModeSnapshot["members"][number] => Boolean(member)),
  };
}
