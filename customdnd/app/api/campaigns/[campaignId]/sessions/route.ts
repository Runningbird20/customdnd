import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { createCampaignSession, listCampaignSessions } from "@/lib/campaign-session-store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

type CreateSessionRequest = {
  title?: string;
  scheduledFor?: string;
  notes?: string;
};

export async function GET(_: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await context.params;
  try {
    const result = await listCampaignSessions(campaignId, user.id);
    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Campaign unavailable." }, { status: 403 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await context.params;
  const body = (await request.json()) as CreateSessionRequest;

  try {
    const session = await createCampaignSession(campaignId, user.id, {
      title: body.title ?? "",
      scheduledFor: body.scheduledFor ?? "",
      notes: body.notes,
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create session.";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
