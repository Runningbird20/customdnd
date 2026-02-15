"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type SessionSnapshot = {
  campaign: {
    id: string;
    name: string;
    description: string;
    partyList: string[];
  };
  currentUser: {
    userId: string;
    role: "owner" | "dm" | "player" | "spectator";
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
    role: "owner" | "dm" | "player" | "spectator";
  }>;
};

type Props = {
  campaignId: string;
};

export function SessionModeClient({ campaignId }: Props) {
  const [session, setSession] = useState<SessionSnapshot | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-mode`, { method: "GET" });
      const result = (await response.json()) as { error?: string; session?: SessionSnapshot };

      if (!response.ok || !result.session) {
        setMessage(result.error ?? "Unable to load session mode.");
        return;
      }

      setSession(result.session);
      setMessage("");
    } catch {
      setMessage("Unable to load session mode.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const timer = setInterval(() => {
      void loadSession();
    }, 10000);

    return () => clearInterval(timer);
  }, [autoRefresh, loadSession]);

  if (loading) {
    return <p className="text-sm">Loading session mode...</p>;
  }

  if (!session) {
    return (
      <section className="mt-4 space-y-3">
        <p className="text-sm">{message || "Session unavailable."}</p>
        <Link href="/dashboard" className="rounded border px-3 py-2 text-sm">
          Back to Dashboard
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void loadSession()} className="rounded border px-3 py-2 text-sm">
          Refresh Now
        </button>
        <button
          type="button"
          onClick={() => setAutoRefresh((value) => !value)}
          className="rounded border px-3 py-2 text-sm"
        >
          Auto Refresh: {autoRefresh ? "On" : "Off"}
        </button>
        <Link href="/dashboard" className="rounded border px-3 py-2 text-sm">
          Dashboard
        </Link>
      </div>

      <div className="rounded border p-4">
        <p className="text-sm">
          <strong>Campaign:</strong> {session.campaign.name}
        </p>
        {session.campaign.description ? (
          <p className="text-sm">
            <strong>Description:</strong> {session.campaign.description}
          </p>
        ) : null}
        {session.campaign.partyList.length > 0 ? (
          <p className="text-sm">
            <strong>Party List:</strong> {session.campaign.partyList.join(", ")}
          </p>
        ) : null}
        <p className="text-sm">
          <strong>Your Role:</strong> {session.currentUser.role}
        </p>
      </div>

      <div className="rounded border p-4">
        <h2 className="text-base font-semibold">Table Permissions</h2>
        <p className="text-sm">Run session tools: {session.currentUser.permissions.canRunSession ? "Yes" : "No"}</p>
        <p className="text-sm">
          Manage invites: {session.currentUser.permissions.canManageInvites ? "Yes" : "No"}
        </p>
        <p className="text-sm">Manage roles: {session.currentUser.permissions.canManageRoles ? "Yes" : "No"}</p>
        <p className="text-sm">
          Manage house rules: {session.currentUser.permissions.canManageHouseRules ? "Yes" : "No"}
        </p>
      </div>

      <div className="rounded border p-4">
        <h2 className="text-base font-semibold">Party</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {session.members.map((member) => (
            <li key={member.userId}>
              {member.displayName} ({member.role})
            </li>
          ))}
        </ul>
      </div>

      {message ? <p className="text-sm">{message}</p> : null}
    </section>
  );
}
