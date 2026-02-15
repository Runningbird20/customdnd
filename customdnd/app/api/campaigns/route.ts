import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { createCampaign, listCampaignsForUser } from "@/lib/campaign-store";

export const runtime = "nodejs";

type CreateCampaignRequest = {
  name?: string;
  description?: string;
  partyList?: string[];
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
  const description = body.description ?? "";
  const partyList = Array.isArray(body.partyList) ? body.partyList : [];

  if (!name.trim()) {
    return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });
  }

  if (name.trim().length > 80) {
    return NextResponse.json({ error: "Campaign name must be 80 characters or fewer." }, { status: 400 });
  }

  if (description.trim().length > 1000) {
    return NextResponse.json({ error: "Description must be 1000 characters or fewer." }, { status: 400 });
  }

  if (partyList.length > 50) {
    return NextResponse.json({ error: "Party list must be 50 entries or fewer." }, { status: 400 });
  }

  try {
    const campaign = await createCampaign(user.id, name, description, partyList);
    return NextResponse.json({ campaign }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create campaign." }, { status: 400 });
  }
}
