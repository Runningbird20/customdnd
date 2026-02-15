"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
};

export function JoinCampaignClient({ token }: Props) {
  const [message, setMessage] = useState("");
  const [joining, setJoining] = useState(false);
  const router = useRouter();

  async function handleJoin() {
    setJoining(true);
    setMessage("");
    try {
      const response = await fetch("/api/campaigns/join-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = (await response.json()) as { error?: string; campaign?: { name: string } };

      if (response.status === 401) {
        setMessage("Sign in first to join this campaign.");
        return;
      }

      if (!response.ok) {
        setMessage(result.error ?? "Unable to join campaign.");
        return;
      }

      setMessage(`Joined campaign: ${result.campaign?.name ?? "Campaign"}`);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setMessage("Unable to join campaign.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <section className="mt-6 space-y-3 rounded border p-4">
      <p className="text-sm">Join this campaign with your existing account.</p>
      <button
        type="button"
        onClick={handleJoin}
        disabled={joining}
        className="rounded border px-3 py-2 text-sm"
      >
        {joining ? "Joining..." : "Join Campaign"}
      </button>
      <div className="flex gap-2">
        <Link href="/auth" className="rounded border px-3 py-2 text-sm">
          Sign In
        </Link>
        <Link href="/dashboard" className="rounded border px-3 py-2 text-sm">
          Dashboard
        </Link>
      </div>
      {message ? <p className="text-sm">{message}</p> : null}
    </section>
  );
}
