"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type CampaignSession = {
  id: string;
  campaignId: string;
  title: string;
  scheduledFor: string;
  notes: string;
  status: "scheduled" | "completed" | "canceled";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  campaignId: string;
};

type SessionDrafts = Record<
  string,
  {
    notes: string;
    status: "scheduled" | "completed" | "canceled";
    title: string;
    scheduledForLocal: string;
  }
>;

function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

function localInputToIso(value: string): string {
  return new Date(value).toISOString();
}

export function SessionLogManager({ campaignId }: Props) {
  const [sessions, setSessions] = useState<CampaignSession[]>([]);
  const [drafts, setDrafts] = useState<SessionDrafts>({});
  const [canManageSessions, setCanManageSessions] = useState(false);
  const [title, setTitle] = useState("");
  const [scheduledForLocal, setScheduledForLocal] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/sessions`);
      const result = (await response.json()) as {
        error?: string;
        sessions?: CampaignSession[];
        canManageSessions?: boolean;
      };
      if (!response.ok || !result.sessions) {
        setMessage(result.error ?? "Unable to load campaign sessions.");
        return;
      }

      setSessions(result.sessions);
      setCanManageSessions(Boolean(result.canManageSessions));
      setDrafts(
        Object.fromEntries(
          result.sessions.map((session) => [
            session.id,
            {
              notes: session.notes,
              status: session.status,
              title: session.title,
              scheduledForLocal: isoToLocalInput(session.scheduledFor),
            },
          ]),
        ),
      );
    } catch {
      setMessage("Unable to load campaign sessions.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  async function handleCreateSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageSessions) {
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          scheduledFor: localInputToIso(scheduledForLocal),
          notes,
        }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Unable to create session.");
        return;
      }

      setTitle("");
      setScheduledForLocal("");
      setNotes("");
      setMessage("Session scheduled.");
      await loadSessions();
    } catch {
      setMessage("Unable to create session.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSession(sessionId: string) {
    if (!canManageSessions) {
      return;
    }

    const draft = drafts[sessionId];
    if (!draft) {
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          scheduledFor: localInputToIso(draft.scheduledForLocal),
          notes: draft.notes,
          status: draft.status,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Unable to save session.");
        return;
      }
      setMessage("Session updated.");
      await loadSessions();
    } catch {
      setMessage("Unable to save session.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 space-y-4 rounded border p-4">
      <h2 className="text-lg font-semibold">Session Schedule & Notes</h2>
      <p className="text-sm">Track upcoming sessions and what happened each session.</p>

      {canManageSessions ? (
        <form onSubmit={handleCreateSession} className="space-y-2 rounded border p-3">
          <h3 className="text-sm font-semibold">Schedule Session</h3>
          <label className="block text-sm">
            Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded border px-2 py-1"
              required
            />
          </label>
          <label className="block text-sm">
            Date & Time
            <input
              type="datetime-local"
              value={scheduledForLocal}
              onChange={(event) => setScheduledForLocal(event.target.value)}
              className="mt-1 w-full rounded border px-2 py-1"
              required
            />
          </label>
          <label className="block text-sm">
            Prep / Starting Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
          <button type="submit" disabled={saving} className="rounded border px-3 py-1 text-sm">
            Schedule
          </button>
        </form>
      ) : (
        <p className="text-sm">Read-only view. Only the owner or DM can schedule and edit session notes.</p>
      )}

      <div className="space-y-3">
        {loading ? <p className="text-sm">Loading sessions...</p> : null}
        {!loading && sessions.length === 0 ? <p className="text-sm">No sessions yet.</p> : null}
        {sessions.map((session) => {
          const draft = drafts[session.id];
          return (
            <article key={session.id} className="space-y-2 rounded border p-3">
              {canManageSessions && draft ? (
                <>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [session.id]: { ...current[session.id], title: event.target.value },
                      }))
                    }
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                  <input
                    type="datetime-local"
                    value={draft.scheduledForLocal}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [session.id]: { ...current[session.id], scheduledForLocal: event.target.value },
                      }))
                    }
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [session.id]: {
                          ...current[session.id],
                          status: event.target.value as "scheduled" | "completed" | "canceled",
                        },
                      }))
                    }
                    className="rounded border px-2 py-1 text-sm"
                  >
                    <option value="scheduled">scheduled</option>
                    <option value="completed">completed</option>
                    <option value="canceled">canceled</option>
                  </select>
                  <textarea
                    value={draft.notes}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [session.id]: { ...current[session.id], notes: event.target.value },
                      }))
                    }
                    rows={4}
                    className="w-full rounded border px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void saveSession(session.id)}
                    disabled={saving}
                    className="rounded border px-3 py-1 text-sm"
                  >
                    Save Session
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold">{session.title}</h3>
                  <p className="text-sm">When: {new Date(session.scheduledFor).toLocaleString()}</p>
                  <p className="text-sm">Status: {session.status}</p>
                  <p className="whitespace-pre-wrap text-sm">{session.notes || "No notes yet."}</p>
                </>
              )}
            </article>
          );
        })}
      </div>

      {message ? <p className="text-sm">{message}</p> : null}
    </section>
  );
}
