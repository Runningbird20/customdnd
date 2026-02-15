"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type GuestDetails = {
  guestName: string;
  sessionName: string;
  expiresAt: string;
};

type Props = {
  token: string;
};

export function GuestJoinClient({ token }: Props) {
  const [guestName, setGuestName] = useState("");
  const [guest, setGuest] = useState<GuestDetails | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function loadGuestState() {
      try {
        const response = await fetch(`/api/guest/me?token=${encodeURIComponent(token)}`);
        const result = (await response.json()) as { guest?: GuestDetails | null };
        setGuest(result.guest ?? null);
      } catch {
        setMessage("Could not verify guest state.");
      } finally {
        setLoading(false);
      }
    }

    void loadGuestState();
  }, [token]);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoining(true);
    setMessage("");

    try {
      const response = await fetch("/api/guest/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, guestName }),
      });

      const result = (await response.json()) as { error?: string; guest?: GuestDetails };
      if (!response.ok || !result.guest) {
        setMessage(result.error ?? "Unable to join session.");
        return;
      }

      setGuest(result.guest);
      setGuestName("");
      setMessage("Joined as guest.");
    } catch {
      setMessage("Unable to join session.");
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return <p className="text-sm">Loading guest session...</p>;
  }

  if (guest) {
    return (
      <section className="mt-6 space-y-3 rounded border p-4 text-sm">
        <p>
          Joined <strong>{guest.sessionName}</strong> as <strong>{guest.guestName}</strong>.
        </p>
        <p>Access expires: {new Date(guest.expiresAt).toLocaleString()}</p>
        <p>This verifies guest access is active for this browser.</p>
      </section>
    );
  }

  return (
    <section className="mt-6 space-y-3 rounded border p-4">
      <p className="text-sm">Enter a display name to join this session as a guest.</p>
      <form onSubmit={handleJoin} className="space-y-3">
        <label className="block text-sm">
          Guest Name
          <input
            type="text"
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            maxLength={30}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </label>
        <button type="submit" disabled={joining} className="rounded border px-3 py-2 text-sm">
          {joining ? "Joining..." : "Join Session"}
        </button>
      </form>

      {message ? <p className="text-sm">{message}</p> : null}
      <Link href="/auth" className="inline-block rounded border px-3 py-2 text-sm">
        Sign In Instead
      </Link>
    </section>
  );
}
