"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  description: string;
  partyList: string[];
  ownerUserId: string;
  createdAt: string;
  role: "owner" | "dm" | "player" | "spectator";
};

type CampaignInviteLink = {
  id: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  isExpired: boolean;
  joinPath: string;
  joinUrl: string;
};

type CampaignEmailInvite = {
  id: string;
  campaignId: string;
  invitedEmail: string;
  createdByUserId: string;
  createdAt: string;
  status: "pending" | "accepted";
  acceptedAt?: string;
};

type CampaignMember = {
  campaignId: string;
  userId: string;
  role: "owner" | "dm" | "player" | "spectator";
  joinedAt: string;
  email: string;
  displayName: string;
};

export function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState("");
  const [pendingEmailInvites, setPendingEmailInvites] = useState<CampaignEmailInvite[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [campaignPartyListText, setCampaignPartyListText] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLinks, setInviteLinks] = useState<CampaignInviteLink[]>([]);
  const [campaignEmailInvites, setCampaignEmailInvites] = useState<CampaignEmailInvite[]>([]);
  const [campaignMembers, setCampaignMembers] = useState<CampaignMember[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const ownerCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.role === "owner"),
    [campaigns],
  );

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === activeCampaignId) ?? null,
    [activeCampaignId, campaigns],
  );

  const loadCampaigns = useCallback(async () => {
    const response = await fetch("/api/campaigns");
    const result = (await response.json()) as { error?: string; campaigns?: Campaign[] };
    if (!response.ok || !result.campaigns) {
      throw new Error(result.error ?? "Unable to load campaigns.");
    }
    setCampaigns(result.campaigns);
    if (!selectedCampaignId) {
      const firstOwnerCampaign = result.campaigns.find((campaign) => campaign.role === "owner");
      if (firstOwnerCampaign) {
        setSelectedCampaignId(firstOwnerCampaign.id);
      }
    }
  }, [selectedCampaignId]);

  const loadPendingEmailInvites = useCallback(async () => {
    const response = await fetch("/api/campaigns/email-invites/me");
    const result = (await response.json()) as { error?: string; invites?: CampaignEmailInvite[] };
    if (!response.ok || !result.invites) {
      throw new Error(result.error ?? "Unable to load pending email invites.");
    }
    setPendingEmailInvites(result.invites);
  }, []);

  const loadActiveCampaign = useCallback(async () => {
    const response = await fetch("/api/campaigns/active");
    const result = (await response.json()) as { activeCampaignId?: string | null; error?: string };
    if (!response.ok) {
      throw new Error(result.error ?? "Unable to load active campaign.");
    }

    setActiveCampaignId(result.activeCampaignId ?? "");
  }, []);

  const loadOwnerInviteData = useCallback(async (campaignId: string) => {
    if (!campaignId) {
      setInviteLinks([]);
      setCampaignEmailInvites([]);
      return;
    }

    const [linksResponse, emailResponse] = await Promise.all([
      fetch(`/api/campaigns/${campaignId}/invite-link`),
      fetch(`/api/campaigns/${campaignId}/invite-email`),
    ]);

    const linksResult = (await linksResponse.json()) as { links?: CampaignInviteLink[]; error?: string };
    const emailResult = (await emailResponse.json()) as { invites?: CampaignEmailInvite[]; error?: string };

    if (!linksResponse.ok || !linksResult.links) {
      throw new Error(linksResult.error ?? "Unable to load invite links.");
    }

    if (!emailResponse.ok || !emailResult.invites) {
      throw new Error(emailResult.error ?? "Unable to load email invites.");
    }

    setInviteLinks(linksResult.links);
    setCampaignEmailInvites(emailResult.invites);
  }, []);

  const loadCampaignMembers = useCallback(async (campaignId: string) => {
    if (!campaignId) {
      setCampaignMembers([]);
      return;
    }

    const response = await fetch(`/api/campaigns/${campaignId}/members`);
    const result = (await response.json()) as { members?: CampaignMember[]; error?: string };
    if (!response.ok || !result.members) {
      throw new Error(result.error ?? "Unable to load campaign members.");
    }

    setCampaignMembers(result.members);
  }, []);

  const refreshAll = useCallback(async (campaignId?: string) => {
    setLoading(true);
    try {
      await loadCampaigns();
      await loadPendingEmailInvites();
      await loadActiveCampaign();
      const currentCampaignId = campaignId ?? selectedCampaignId;
      if (currentCampaignId) {
        await loadOwnerInviteData(currentCampaignId);
        await loadCampaignMembers(currentCampaignId);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load campaign data.");
    } finally {
      setLoading(false);
    }
  }, [loadActiveCampaign, loadCampaignMembers, loadCampaigns, loadOwnerInviteData, loadPendingEmailInvites, selectedCampaignId]);

  useEffect(() => {
    async function initialLoad() {
      setLoading(true);
      try {
        await loadCampaigns();
        await loadPendingEmailInvites();
        await loadActiveCampaign();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to load campaign data.");
      } finally {
        setLoading(false);
      }
    }

    void initialLoad();
  }, [loadActiveCampaign, loadCampaigns, loadPendingEmailInvites]);

  useEffect(() => {
    if (!selectedCampaignId) {
      return;
    }
    void Promise.all([loadOwnerInviteData(selectedCampaignId), loadCampaignMembers(selectedCampaignId)]).catch(() => {
      setMessage("Unable to load owner campaign data.");
    });
  }, [loadCampaignMembers, loadOwnerInviteData, selectedCampaignId]);

  async function handleCreateCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName,
          description: campaignDescription,
          partyList: campaignPartyListText
            .split("\n")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0),
        }),
      });
      const result = (await response.json()) as { error?: string; campaign?: Campaign };
      if (!response.ok || !result.campaign) {
        setMessage(result.error ?? "Unable to create campaign.");
        return;
      }

      setCampaignName("");
      setCampaignDescription("");
      setCampaignPartyListText("");
      setSelectedCampaignId(result.campaign.id);
      setMessage("Campaign created.");
      await refreshAll(result.campaign.id);
    } catch {
      setMessage("Unable to create campaign.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateInviteLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampaignId) {
      setMessage("Select an owner campaign first.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/campaigns/${selectedCampaignId}/invite-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInHours }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Unable to create invite link.");
        return;
      }

      setMessage("Campaign invite link created.");
      await refreshAll(selectedCampaignId);
    } catch {
      setMessage("Unable to create invite link.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateEmailInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCampaignId) {
      setMessage("Select an owner campaign first.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/campaigns/${selectedCampaignId}/invite-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Unable to create email invite.");
        return;
      }

      setInviteEmail("");
      setMessage("Campaign email invite queued.");
      await refreshAll(selectedCampaignId);
    } catch {
      setMessage("Unable to create email invite.");
    } finally {
      setSaving(false);
    }
  }

  async function acceptEmailInvite(inviteId: string) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/campaigns/email-invites/${inviteId}/accept`, {
        method: "POST",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Unable to accept invite.");
        return;
      }
      setMessage("Joined campaign from email invite.");
      await refreshAll(selectedCampaignId);
    } catch {
      setMessage("Unable to accept invite.");
    } finally {
      setSaving(false);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied invite link.");
    } catch {
      setMessage("Unable to copy link.");
    }
  }

  async function updateMemberRole(memberUserId: string, role: "dm" | "player" | "spectator") {
    if (!selectedCampaignId) {
      setMessage("Select an owner campaign first.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/campaigns/${selectedCampaignId}/members/${memberUserId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Unable to update role.");
        return;
      }

      setMessage("Member role updated.");
      await refreshAll(selectedCampaignId);
    } catch {
      setMessage("Unable to update role.");
    } finally {
      setSaving(false);
    }
  }

  async function setActiveCampaign(campaignId: string) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/campaigns/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const result = (await response.json()) as { error?: string; activeCampaignId?: string };
      if (!response.ok || !result.activeCampaignId) {
        setMessage(result.error ?? "Unable to switch active campaign.");
        return;
      }
      setActiveCampaignId(result.activeCampaignId);
      setMessage("Active campaign switched.");
    } catch {
      setMessage("Unable to switch active campaign.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 space-y-4 rounded border p-4">
      <h2 className="text-lg font-semibold">Campaign Invites</h2>
      <p className="text-sm">Campaign owners can invite players by link or email.</p>

      <form onSubmit={handleCreateCampaign} className="space-y-3">
        <h3 className="text-sm font-semibold">Create Campaign</h3>
        <label className="block text-sm">
          Campaign Name
          <input
            type="text"
            value={campaignName}
            onChange={(event) => setCampaignName(event.target.value)}
            maxLength={80}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm">
          Description
          <textarea
            value={campaignDescription}
            onChange={(event) => setCampaignDescription(event.target.value)}
            maxLength={1000}
            rows={3}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="Campaign summary, tone, or setting notes"
          />
        </label>
        <label className="block text-sm">
          Party List (one per line)
          <textarea
            value={campaignPartyListText}
            onChange={(event) => setCampaignPartyListText(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder={"Aldric the Paladin\nNyx the Rogue\nMira the Cleric"}
          />
        </label>
        <button type="submit" disabled={saving} className="rounded border px-3 py-2 text-sm">
          Create Campaign
        </button>
      </form>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Your Campaigns</h3>
        {activeCampaign ? (
          <p className="text-sm">
            Active campaign: <strong>{activeCampaign.name}</strong>
          </p>
        ) : null}
        {campaigns.length > 0 ? (
          <label className="block text-sm">
            Switch Active Campaign
            <select
              value={activeCampaignId}
              onChange={(event) => void setActiveCampaign(event.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="">Select campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.role})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {loading ? <p className="text-sm">Loading campaigns...</p> : null}
        {!loading && campaigns.length === 0 ? <p className="text-sm">No campaigns yet.</p> : null}
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <div>
              <p>
                {campaign.name} ({campaign.role}){campaign.id === activeCampaignId ? " [active]" : ""}
              </p>
              {campaign.description ? <p className="text-xs">{campaign.description}</p> : null}
              {campaign.partyList.length > 0 ? (
                <p className="text-xs">Party: {campaign.partyList.join(", ")}</p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void setActiveCampaign(campaign.id)}
                disabled={saving || campaign.id === activeCampaignId}
                className="rounded border px-2 py-1 text-xs"
              >
                Set Active
              </button>
              <Link href={`/session/${campaign.id}`} className="rounded border px-2 py-1 text-xs">
                Session Mode
              </Link>
            </div>
          </div>
        ))}
        {activeCampaignId ? (
          <Link href={`/session/${activeCampaignId}`} className="inline-block rounded border px-3 py-2 text-sm">
            Open Active Session Mode
          </Link>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Owner Invite Controls</h3>
        <label className="block text-sm">
          Active Owner Campaign
          <select
            value={selectedCampaignId}
            onChange={(event) => setSelectedCampaignId(event.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="">Select campaign</option>
            {ownerCampaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>

        <form onSubmit={handleCreateInviteLink} className="space-y-2">
          <label className="block text-sm">
            Link expiry (hours)
            <input
              type="number"
              min={1}
              max={168}
              value={expiresInHours}
              onChange={(event) => setExpiresInHours(Number(event.target.value))}
              className="mt-1 w-full rounded border px-3 py-2"
              required
            />
          </label>
          <button type="submit" disabled={saving || !selectedCampaignId} className="rounded border px-3 py-2 text-sm">
            Create Campaign Invite Link
          </button>
        </form>

        <form onSubmit={handleCreateEmailInvite} className="space-y-2">
          <label className="block text-sm">
            Invite by Email
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="friend@example.com"
              required
            />
          </label>
          <button type="submit" disabled={saving || !selectedCampaignId} className="rounded border px-3 py-2 text-sm">
            Queue Email Invite
          </button>
        </form>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Invite Links</h3>
        {inviteLinks.length === 0 ? <p className="text-sm">No invite links created.</p> : null}
        {inviteLinks.map((link) => (
          <div key={link.id} className="rounded border p-3 text-sm">
            <p>Expires: {new Date(link.expiresAt).toLocaleString()}</p>
            <p>Status: {link.isExpired ? "Expired" : "Active"}</p>
            <p className="break-all">{link.joinUrl}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => void copyText(link.joinUrl)}
                className="rounded border px-2 py-1 text-xs"
              >
                Copy
              </button>
              <Link href={link.joinPath} className="rounded border px-2 py-1 text-xs">
                Open
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Email Invites (Owner View)</h3>
        {campaignEmailInvites.length === 0 ? <p className="text-sm">No email invites for selected campaign.</p> : null}
        {campaignEmailInvites.map((invite) => (
          <p key={invite.id} className="text-sm">
            {invite.invitedEmail} ({invite.status})
          </p>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Pending Email Invites For You</h3>
        {pendingEmailInvites.length === 0 ? <p className="text-sm">No pending invites.</p> : null}
        {pendingEmailInvites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between rounded border p-2 text-sm">
            <span>Campaign ID: {invite.campaignId}</span>
            <button
              type="button"
              onClick={() => void acceptEmailInvite(invite.id)}
              disabled={saving}
              className="rounded border px-2 py-1 text-xs"
            >
              Accept
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Campaign Roles</h3>
        {!selectedCampaignId ? <p className="text-sm">Select an owner campaign to manage roles.</p> : null}
        {selectedCampaignId && campaignMembers.length === 0 ? <p className="text-sm">No members yet.</p> : null}
        {campaignMembers.map((member) => (
          <div key={member.userId} className="flex items-center justify-between rounded border p-2 text-sm">
            <span>
              {member.displayName} ({member.email})
            </span>
            {member.role === "owner" ? (
              <span>owner</span>
            ) : (
              <select
                value={member.role}
                onChange={(event) =>
                  void updateMemberRole(
                    member.userId,
                    event.target.value as "dm" | "player" | "spectator",
                  )
                }
                disabled={saving}
                className="rounded border px-2 py-1 text-xs"
              >
                <option value="dm">dm</option>
                <option value="player">player</option>
                <option value="spectator">spectator</option>
              </select>
            )}
          </div>
        ))}
      </div>

      {message ? <p className="text-sm">{message}</p> : null}
    </section>
  );
}
