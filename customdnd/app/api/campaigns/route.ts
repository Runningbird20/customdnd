import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { createCampaign, listCampaignsForUser } from "@/lib/campaign-store";

export const runtime = "nodejs";

type CreateCampaignRequest = {
  name?: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await listCampaignsForUser(user.id);
  return NextResponse.json({ campaigns }, { status: 200 });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateCampaignRequest;
  const name = body.name ?? "";

  if (!name.trim()) {
    return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });
  }

  if (name.trim().length > 80) {
    return NextResponse.json({ error: "Campaign name must be 80 characters or fewer." }, { status: 400 });
  }

  try {
    const campaign = await createCampaign(user.id, name);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create campaign." }, { status: 400 });
  }
}
