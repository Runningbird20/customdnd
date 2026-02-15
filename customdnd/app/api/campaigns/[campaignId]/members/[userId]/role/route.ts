import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { updateCampaignMemberRole } from "@/lib/campaign-store";

export const runtime = "nodejs";

type UpdateRoleRequest = {
  role?: "dm" | "player" | "spectator";
};

type RouteContext = {
  params: Promise<{
    campaignId: string;
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId, userId } = await context.params;
  const body = (await request.json()) as UpdateRoleRequest;

  if (body.role !== "dm" && body.role !== "player" && body.role !== "spectator") {
    return NextResponse.json({ error: "Role must be dm, player, or spectator." }, { status: 400 });
  }

  try {
    const member = await updateCampaignMemberRole(campaignId, user.id, userId, body.role);
    if (!member) {
      return NextResponse.json({ error: "Campaign member not found." }, { status: 404 });
    }
    return NextResponse.json({ member }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update role.";
    const status = message === "Owner role cannot be reassigned" ? 400 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}
