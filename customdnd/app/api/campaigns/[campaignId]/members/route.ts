import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { listCampaignMembers } from "@/lib/campaign-store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await context.params;
  try {
    const members = await listCampaignMembers(campaignId, user.id);
    return NextResponse.json({ members }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Unable to load campaign members." }, { status: 403 });
  }
}
