"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  email: string;
  displayName: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", { method: "GET" });
        const result = (await response.json()) as { error?: string; profile?: Profile };

        if (response.status === 401) {
          router.push("/auth");
          return;
        }

        if (!response.ok || !result.profile) {
          setMessage(result.error ?? "Unable to load profile.");
          return;
        }

        setProfile(result.profile);
        setDisplayName(result.profile.displayName);
      } catch {
        setMessage("Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const result = (await response.json()) as { error?: string; profile?: Profile };

      if (!response.ok || !result.profile) {
        setMessage(result.error ?? "Profile update failed.");
        return;
      }

      setProfile(result.profile);
      setDisplayName(result.profile.displayName);
      setMessage("Profile updated.");
      router.refresh();
    } catch {
      setMessage("Profile update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-2xl p-8 text-sm">Loading profile...</main>;
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="mt-2 text-sm">Manage the name your party sees.</p>

      <div className="mt-6 space-y-3">
        <label className="block text-sm">
          Display Name
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={30}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <p className="text-sm">Email: {profile?.email}</p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded border px-3 py-2 text-sm"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          <Link href="/dashboard" className="rounded border px-3 py-2 text-sm">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {message ? <p className="mt-4 text-sm">{message}</p> : null}
    </main>
  );
}
