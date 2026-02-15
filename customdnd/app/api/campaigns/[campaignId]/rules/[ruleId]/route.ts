import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { deleteCampaignRule, updateCampaignRule } from "@/lib/campaign-rules-store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    campaignId: string;
    ruleId: string;
  }>;
};

type UpdateRuleRequest = {
  title?: string;
  content?: string;
  pinned?: boolean;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId, ruleId } = await context.params;
  const body = (await request.json()) as UpdateRuleRequest;

  try {
    const rule = await updateCampaignRule(campaignId, ruleId, user.id, body);
    if (!rule) {
      return NextResponse.json({ error: "Rule not found." }, { status: 404 });
    }
    return NextResponse.json({ rule }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update rule.";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId, ruleId } = await context.params;
  try {
    const deleted = await deleteCampaignRule(campaignId, ruleId, user.id);
    if (!deleted) {
      return NextResponse.json({ error: "Rule not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete rule.";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
