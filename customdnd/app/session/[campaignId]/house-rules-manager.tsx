"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type CampaignRule = {
  id: string;
  campaignId: string;
  title: string;
  content: string;
  pinned: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

type RuleDrafts = Record<
  string,
  {
    title: string;
    content: string;
    pinned: boolean;
  }
>;

type Props = {
  campaignId: string;
};

export function HouseRulesManager({ campaignId }: Props) {
  const [rules, setRules] = useState<CampaignRule[]>([]);
  const [drafts, setDrafts] = useState<RuleDrafts>({});
  const [canManageRules, setCanManageRules] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newPinned, setNewPinned] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRules = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/rules`);
      const result = (await response.json()) as {
        rules?: CampaignRule[];
        canManageRules?: boolean;
        error?: string;
      };

      if (!response.ok || !result.rules) {
        setMessage(result.error ?? "Unable to load house rules.");
        return;
      }

      setRules(result.rules);
      setCanManageRules(Boolean(result.canManageRules));
      setDrafts(
        Object.fromEntries(
          result.rules.map((rule) => [
            rule.id,
            {
              title: rule.title,
              content: rule.content,
              pinned: rule.pinned,
            },
          ]),
        ),
      );
    } catch {
      setMessage("Unable to load house rules.");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageRules) {
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          pinned: newPinned,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Unable to create house rule.");
        return;
      }

      setNewTitle("");
      setNewContent("");
      setNewPinned(true);
      setMessage("House rule pinned.");
      await loadRules();
    } catch {
      setMessage("Unable to create house rule.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRule(ruleId: string) {
    if (!canManageRules) {
      return;
    }

    const draft = drafts[ruleId];
    if (!draft) {
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Unable to save house rule.");
        return;
      }

      setMessage("House rule updated.");
      await loadRules();
    } catch {
      setMessage("Unable to save house rule.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRule(ruleId: string) {
    if (!canManageRules) {
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/rules/${ruleId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Unable to delete house rule.");
        return;
      }

      setMessage("House rule removed.");
      await loadRules();
    } catch {
      setMessage("Unable to delete house rule.");
    } finally {
      setSaving(false);
    }
  }

  const pinnedRules = rules.filter((rule) => rule.pinned);
  const unpinnedRules = rules.filter((rule) => !rule.pinned);

  return (
    <section className="mt-6 space-y-4 rounded border p-4">
      <h2 className="text-lg font-semibold">House Rules</h2>
      <p className="text-sm">Pinned rulings everyone should follow during this campaign.</p>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Pinned Rules</h3>
        {loading ? <p className="text-sm">Loading rules...</p> : null}
        {!loading && pinnedRules.length === 0 ? <p className="text-sm">No pinned rules yet.</p> : null}
        {pinnedRules.map((rule) => (
          <article key={rule.id} className="space-y-1 rounded border p-3">
            <p className="text-sm font-semibold">{rule.title}</p>
            <p className="whitespace-pre-wrap text-sm">{rule.content}</p>
          </article>
        ))}
      </div>

      {!loading && unpinnedRules.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Other Rules</h3>
          {unpinnedRules.map((rule) => (
            <article key={rule.id} className="space-y-1 rounded border p-3">
              <p className="text-sm font-semibold">{rule.title}</p>
              <p className="whitespace-pre-wrap text-sm">{rule.content}</p>
            </article>
          ))}
        </div>
      ) : null}

      {canManageRules ? (
        <form onSubmit={createRule} className="space-y-2 rounded border p-3">
          <h3 className="text-sm font-semibold">Pin New Rule</h3>
          <input
            type="text"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            maxLength={120}
            placeholder="Rule title"
            className="w-full rounded border px-2 py-1 text-sm"
            required
          />
          <textarea
            value={newContent}
            onChange={(event) => setNewContent(event.target.value)}
            rows={3}
            placeholder="Rule details"
            className="w-full rounded border px-2 py-1 text-sm"
            required
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newPinned}
              onChange={(event) => setNewPinned(event.target.checked)}
            />
            Pinned
          </label>
          <button type="submit" disabled={saving} className="rounded border px-3 py-1 text-sm">
            Add Rule
          </button>
        </form>
      ) : (
        <p className="text-sm">Only DM/owner can manage house rules.</p>
      )}

      {canManageRules && rules.length > 0 ? (
        <div className="space-y-2 rounded border p-3">
          <h3 className="text-sm font-semibold">Manage Existing Rules</h3>
          {rules.map((rule) => {
            const draft = drafts[rule.id];
            if (!draft) {
              return null;
            }
            return (
              <article key={rule.id} className="space-y-2 rounded border p-2">
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [rule.id]: { ...current[rule.id], title: event.target.value },
                    }))
                  }
                  className="w-full rounded border px-2 py-1 text-sm"
                />
                <textarea
                  value={draft.content}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [rule.id]: { ...current[rule.id], content: event.target.value },
                    }))
                  }
                  rows={3}
                  className="w-full rounded border px-2 py-1 text-sm"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.pinned}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [rule.id]: { ...current[rule.id], pinned: event.target.checked },
                      }))
                    }
                  />
                  Pinned
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void saveRule(rule.id)}
                    disabled={saving}
                    className="rounded border px-3 py-1 text-sm"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeRule(rule.id)}
                    disabled={saving}
                    className="rounded border px-3 py-1 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {message ? <p className="text-sm">{message}</p> : null}
    </section>
  );
}
