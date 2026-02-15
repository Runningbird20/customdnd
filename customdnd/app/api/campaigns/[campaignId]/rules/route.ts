import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { createCampaignRule, listCampaignRules } from "@/lib/campaign-rules-store";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    campaignId: string;
  }>;
};

type CreateRuleRequest = {
  title?: string;
  content?: string;
  pinned?: boolean;
};

export async function GET(_: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaignId } = await context.params;
  try {
    const result = await listCampaignRules(campaignId, user.id);
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
  const body = (await request.json()) as CreateRuleRequest;
  try {
    const rule = await createCampaignRule(campaignId, user.id, {
      title: body.title ?? "",
      content: body.content ?? "",
      pinned: body.pinned,
    });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create rule.";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
