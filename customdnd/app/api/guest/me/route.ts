import { NextResponse } from "next/server";
import { getCurrentGuestSession } from "@/lib/current-guest";
import { validateGuestLink } from "@/lib/guest-link-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const guestSession = await getCurrentGuestSession();

  if (!token || !guestSession || guestSession.token !== token) {
    return NextResponse.json({ guest: null }, { status: 200 });
  }

  const link = await validateGuestLink(token);
  if (!link) {
    return NextResponse.json({ guest: null }, { status: 200 });
  }

  return NextResponse.json(
    {
      guest: {
        guestName: guestSession.guestName,
        sessionName: guestSession.sessionName,
        expiresAt: link.expiresAt,
      },
    },
    { status: 200 },
  );
}
