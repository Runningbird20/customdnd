import { NextResponse } from "next/server";
import { listPendingEmailInvitesForEmail } from "@/lib/campaign-store";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invites = await listPendingEmailInvitesForEmail(user.email);
  return NextResponse.json({ invites }, { status: 200 });
}
