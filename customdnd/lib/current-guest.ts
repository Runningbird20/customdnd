import { cookies } from "next/headers";
import { GUEST_SESSION_COOKIE, verifyGuestSessionToken } from "@/lib/guest-session";

export async function getCurrentGuestSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_SESSION_COOKIE)?.value;
  return verifyGuestSessionToken(token);
}
