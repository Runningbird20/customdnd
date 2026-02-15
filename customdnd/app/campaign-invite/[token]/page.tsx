import { getCampaignInviteLinkByToken, isInviteLinkExpired } from "@/lib/campaign-store";
import { JoinCampaignClient } from "./join-campaign-client";

type CampaignInvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function CampaignInvitePage({ params }: CampaignInvitePageProps) {
  const { token } = await params;
  const invite = await getCampaignInviteLinkByToken(token);

  if (!invite || invite.revoked || isInviteLinkExpired(invite)) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-bold">Campaign Invite Unavailable</h1>
        <p className="mt-2 text-sm">This campaign invite is invalid, revoked, or expired.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">Campaign Invitation</h1>
      <p className="mt-2 text-sm">Invite expires: {new Date(invite.expiresAt).toLocaleString()}</p>
      <JoinCampaignClient token={token} />
    </main>
  );
}
