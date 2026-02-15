import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { listCampaignsForUser } from "@/lib/campaign-store";
import { ACTIVE_CAMPAIGN_COOKIE, ACTIVE_CAMPAIGN_COOKIE_MAX_AGE } from "@/lib/active-campaign";

export const runtime = "nodejs";

type SetActiveCampaignRequest = {
  campaignId?: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await listCampaignsForUser(user.id);
  const campaignIds = new Set(campaigns.map((campaign) => campaign.id));
  const cookieStore = await cookies();
  const current = cookieStore.get(ACTIVE_CAMPAIGN_COOKIE)?.value;

  const activeCampaignId =
    current && campaignIds.has(current) ? current : campaigns.length > 0 ? campaigns[0].id : null;

  if (!activeCampaignId) {
    return NextResponse.json({ activeCampaignId: null }, { status: 200 });
  }

  cookieStore.set(ACTIVE_CAMPAIGN_COOKIE, activeCampaignId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACTIVE_CAMPAIGN_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ activeCampaignId }, { status: 200 });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as SetActiveCampaignRequest;
  const campaignId = body.campaignId?.trim() ?? "";
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
  }

  const campaigns = await listCampaignsForUser(user.id);
  if (!campaigns.some((campaign) => campaign.id === campaignId)) {
    return NextResponse.json({ error: "Campaign unavailable for this user." }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CAMPAIGN_COOKIE, campaignId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACTIVE_CAMPAIGN_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ activeCampaignId: campaignId }, { status: 200 });
}
