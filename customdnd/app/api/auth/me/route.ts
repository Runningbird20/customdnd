import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { findUserById } from "@/lib/user-store";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json(
    { user: { id: user.id, email: user.email, displayName: user.displayName } },
    { status: 200 },
  );
}
