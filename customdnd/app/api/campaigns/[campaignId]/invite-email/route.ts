import { NextResponse } from "next/server";
import { createCampaignEmailInvite, listCampaignEmailInvites } from "@/lib/campaign-store";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

type InviteEmailRequest = {
  email?: string;
};

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
    const invites = await listCampaignEmailInvites(campaignId, user.id);
    return NextResponse.json({ invites }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Only campaign owners can view email invites." }, { status: 403 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await context.params;
  const body = (await request.json()) as InviteEmailRequest;
  const email = body.email?.trim().toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json({ error: "Invite email is required." }, { status: 400 });
  }

  try {
    const invite = await createCampaignEmailInvite(campaignId, user.id, email);
    return NextResponse.json(
      {
        invite,
        note: "Email sending is mocked locally. Invited users can accept from their pending invites list.",
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Only campaign owners can send email invites." }, { status: 403 });
  }
}
