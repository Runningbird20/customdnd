import { NextResponse } from "next/server";
import {
  CampaignSessionStatus,
  updateCampaignSession,
} from "@/lib/campaign-session-store";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    campaignId: string;
    sessionId: string;
  }>;
};

type UpdateSessionRequest = {
  title?: string;
  scheduledFor?: string;
  notes?: string;
  status?: CampaignSessionStatus;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId, sessionId } = await context.params;
  const body = (await request.json()) as UpdateSessionRequest;

  try {
    const session = await updateCampaignSession(campaignId, sessionId, user.id, body);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    return NextResponse.json({ session }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update session.";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
