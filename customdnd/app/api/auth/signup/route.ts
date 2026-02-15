import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { createSessionToken, getSessionMaxAgeSeconds, SESSION_COOKIE } from "@/lib/session";
import { createUserWithProfile, findUserByEmail } from "@/lib/user-store";

export const runtime = "nodejs";

type AuthRequest = {
  email?: string;
  password?: string;
  displayName?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AuthRequest;
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const displayName = body.displayName ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
    );
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = hashPassword(password);
  const user = await createUserWithProfile(email, passwordHash, displayName);
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
    { status: 201 },
  );
}
