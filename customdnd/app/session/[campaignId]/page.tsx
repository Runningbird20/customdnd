import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { SessionModeClient } from "./session-mode-client";
import { SessionLogManager } from "./session-log-manager";
import { HouseRulesManager } from "./house-rules-manager";

type SessionModePageProps = {
  params: Promise<{
    campaignId: string;
  }>;
};

export default async function SessionModePage({ params }: SessionModePageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  const { campaignId } = await params;

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Session Mode</h1>
      <p className="mt-2 text-sm">Focused table view with only active session essentials.</p>
      <SessionModeClient campaignId={campaignId} />
      <HouseRulesManager campaignId={campaignId} />
      <SessionLogManager campaignId={campaignId} />
    </main>
  );
}
