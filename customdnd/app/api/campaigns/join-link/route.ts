import { NextResponse } from "next/server";
import { joinCampaignByInviteLink } from "@/lib/campaign-store";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

type JoinLinkRequest = {
  token?: string;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as JoinLinkRequest;
  const token = body.token?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ error: "Invite token is required." }, { status: 400 });
  }

  const campaign = await joinCampaignByInviteLink(token, user.id);
  if (!campaign) {
    return NextResponse.json({ error: "Invite link is invalid or expired." }, { status: 404 });
  }

  return NextResponse.json({ campaign }, { status: 200 });
}
