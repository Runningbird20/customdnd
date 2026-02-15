import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getSessionModeSnapshot } from "@/lib/campaign-store";

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
  const snapshot = await getSessionModeSnapshot(campaignId, user.id);
  if (!snapshot) {
    return NextResponse.json({ error: "Campaign not found or unavailable." }, { status: 404 });
  }

  return NextResponse.json({ session: snapshot }, { status: 200 });
}
