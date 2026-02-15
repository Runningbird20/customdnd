import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createCampaignInviteLink, isInviteLinkExpired, listCampaignInviteLinks } from "@/lib/campaign-store";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

type InviteLinkRequest = {
  expiresInHours?: number;
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
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = host ? `${protocol}://${host}` : "";

  try {
    const links = await listCampaignInviteLinks(campaignId, user.id);
    return NextResponse.json(
      {
        links: links.map((link) => ({
          ...link,
          isExpired: isInviteLinkExpired(link),
          joinPath: `/campaign-invite/${link.token}`,
          joinUrl: baseUrl ? `${baseUrl}/campaign-invite/${link.token}` : `/campaign-invite/${link.token}`,
        })),
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Only campaign owners can view invite links." }, { status: 403 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await context.params;
  const body = (await request.json()) as InviteLinkRequest;
  const expiresInHours = Number(body.expiresInHours ?? 24);

  if (!Number.isFinite(expiresInHours) || expiresInHours < 1 || expiresInHours > 168) {
    return NextResponse.json({ error: "Expiry must be between 1 and 168 hours." }, { status: 400 });
  }

  try {
    const link = await createCampaignInviteLink(campaignId, user.id, expiresInHours);
    return NextResponse.json(
      {
        link: {
          ...link,
          joinPath: `/campaign-invite/${link.token}`,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Only campaign owners can create invite links." }, { status: 403 });
  }
}
