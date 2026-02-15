import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { updateUserDisplayName } from "@/lib/user-store";

export const runtime = "nodejs";

type UpdateProfileRequest = {
  displayName?: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ profile: user }, { status: 200 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as UpdateProfileRequest;
  const displayName = body.displayName ?? "";

  if (!displayName.trim()) {
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }

  if (displayName.trim().length > 30) {
    return NextResponse.json({ error: "Display name must be 30 characters or fewer." }, { status: 400 });
  }

  try {
    const updatedUser = await updateUserDisplayName(user.id, displayName);
    if (!updatedUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        profile: {
          id: updatedUser.id,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
        },
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ error: "Display name is required." }, { status: 400 });
  }
}
