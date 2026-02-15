"use client";

import { FormEvent, useEffect, useState } from "react";

type GuestLink = {
  token: string;
  sessionName: string;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  joinPath: string;
  joinUrl: string;
};

export function GuestLinkManager() {
  const [sessionName, setSessionName] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [links, setLinks] = useState<GuestLink[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function loadLinks() {
    setLoading(true);
    try {
      const response = await fetch("/api/sessions/guest-link");
      const result = (await response.json()) as { error?: string; links?: GuestLink[] };

      if (!response.ok || !result.links) {
        setMessage(result.error ?? "Unable to load guest links.");
        return;
      }

      setLinks(result.links);
    } catch {
      setMessage("Unable to load guest links.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLinks();
  }, []);

  async function handleCreateLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setMessage("");

    try {
      const response = await fetch("/api/sessions/guest-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionName, expiresInHours }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(result.error ?? "Unable to create guest link.");
        return;
      }

      setSessionName("");
      setExpiresInHours(24);
      setMessage("Guest link created.");
      await loadLinks();
    } catch {
      setMessage("Unable to create guest link.");
    } finally {
      setCreating(false);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied guest link.");
    } catch {
      setMessage("Could not copy link.");
    }
  }

  return (
    <section className="mt-8 space-y-4 rounded border p-4">
      <h2 className="text-lg font-semibold">Guest Links</h2>
      <p className="text-sm">Create a shareable link so friends can join without an account.</p>

      <form onSubmit={handleCreateLink} className="space-y-3">
        <label className="block text-sm">
          Session Name
          <input
            type="text"
            value={sessionName}
            onChange={(event) => setSessionName(event.target.value)}
            maxLength={60}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="Friday Night Campaign"
            required
          />
        </label>

        <label className="block text-sm">
          Link expires in (hours)
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

        <button type="submit" disabled={creating} className="rounded border px-3 py-2 text-sm">
          {creating ? "Creating..." : "Create Guest Link"}
        </button>
      </form>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Active and recent links</h3>
        {loading ? <p className="text-sm">Loading...</p> : null}
        {!loading && links.length === 0 ? <p className="text-sm">No guest links yet.</p> : null}
        {links.map((link) => (
          <div key={link.token} className="rounded border p-3 text-sm">
            <p>
              <strong>{link.sessionName}</strong>
            </p>
            <p>Expires: {new Date(link.expiresAt).toLocaleString()}</p>
            <p>Status: {link.isExpired ? "Expired" : "Active"}</p>
            <p className="break-all">{link.joinUrl}</p>
            <button
              type="button"
              onClick={() => void copyText(link.joinUrl)}
              className="mt-2 rounded border px-2 py-1 text-xs"
            >
              Copy Link
            </button>
          </div>
        ))}
      </div>

      {message ? <p className="text-sm">{message}</p> : null}
    </section>
  );
}
