import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createGuestSessionToken, GUEST_SESSION_COOKIE } from "@/lib/guest-session";
import { validateGuestLink } from "@/lib/guest-link-store";

export const runtime = "nodejs";

type JoinGuestRequest = {
  token?: string;
  guestName?: string;
};

function sanitizeGuestName(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 30);
}

export async function POST(request: Request) {
  const body = (await request.json()) as JoinGuestRequest;
  const token = body.token?.trim() ?? "";
  const guestName = sanitizeGuestName(body.guestName ?? "");

  if (!token) {
    return NextResponse.json({ error: "Guest link token is required." }, { status: 400 });
  }

  if (!guestName) {
    return NextResponse.json({ error: "Guest name is required." }, { status: 400 });
  }

  const link = await validateGuestLink(token);
  if (!link) {
    return NextResponse.json({ error: "Guest link is invalid or expired." }, { status: 404 });
  }

  const expiresAtMs = new Date(link.expiresAt).getTime();
  const maxAge = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
  if (maxAge <= 0) {
    return NextResponse.json({ error: "Guest link is expired." }, { status: 410 });
  }

  const sessionToken = createGuestSessionToken({
    token: link.token,
    sessionId: link.sessionId,
    sessionName: link.sessionName,
    guestName,
    expiresAt: expiresAtMs,
  });

  const cookieStore = await cookies();
  cookieStore.set(GUEST_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return NextResponse.json(
    {
      guest: {
        guestName,
        sessionName: link.sessionName,
        expiresAt: link.expiresAt,
      },
    },
    { status: 200 },
  );
}
