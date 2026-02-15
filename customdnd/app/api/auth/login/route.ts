import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";
import { createSessionToken, getSessionMaxAgeSeconds, SESSION_COOKIE } from "@/lib/session";
import { findUserByEmail } from "@/lib/user-store";

export const runtime = "nodejs";

type AuthRequest = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AuthRequest;
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = createSessionToken(user.id, user.email);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });

  return NextResponse.json(
    { user: { id: user.id, email: user.email, displayName: user.displayName } },
    { status: 200 },
  );
}
