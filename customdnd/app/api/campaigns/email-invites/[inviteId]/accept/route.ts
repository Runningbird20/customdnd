import { NextResponse } from "next/server";
import { acceptCampaignEmailInvite } from "@/lib/campaign-store";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    inviteId: string;
  }>;
};

export async function POST(_: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteId } = await context.params;
  const campaign = await acceptCampaignEmailInvite(inviteId, user.id, user.email);

  if (!campaign) {
    return NextResponse.json({ error: "Invite not found or unavailable." }, { status: 404 });
  }

  return NextResponse.json({ campaign }, { status: 200 });
}
