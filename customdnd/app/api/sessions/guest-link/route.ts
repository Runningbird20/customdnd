import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/current-user";
import { createGuestLink, isLinkExpired, listGuestLinksByHost } from "@/lib/guest-link-store";

export const runtime = "nodejs";

type CreateGuestLinkRequest = {
  sessionName?: string;
  expiresInHours?: number;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = host ? `${protocol}://${host}` : "";

  const links = await listGuestLinksByHost(user.id);
  return NextResponse.json(
    {
      links: links.map((link) => ({
        token: link.token,
        sessionName: link.sessionName,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt,
        isExpired: isLinkExpired(link),
        joinPath: `/guest/${link.token}`,
        joinUrl: baseUrl ? `${baseUrl}/guest/${link.token}` : `/guest/${link.token}`,
      })),
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as CreateGuestLinkRequest;
  const sessionName = body.sessionName ?? "";
  const expiresInHours = Number(body.expiresInHours ?? 24);

  if (!sessionName.trim()) {
    return NextResponse.json({ error: "Session name is required." }, { status: 400 });
  }

  if (sessionName.trim().length > 60) {
    return NextResponse.json({ error: "Session name must be 60 characters or fewer." }, { status: 400 });
  }

  if (!Number.isFinite(expiresInHours) || expiresInHours < 1 || expiresInHours > 168) {
    return NextResponse.json({ error: "Expiry must be between 1 and 168 hours." }, { status: 400 });
  }

  try {
    const link = await createGuestLink(user.id, sessionName, expiresInHours);
    return NextResponse.json(
      {
        link: {
          token: link.token,
          sessionName: link.sessionName,
          createdAt: link.createdAt,
          expiresAt: link.expiresAt,
          joinPath: `/guest/${link.token}`,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Unable to create guest link." }, { status: 400 });
  }
}
