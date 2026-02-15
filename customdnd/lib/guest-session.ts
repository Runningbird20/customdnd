import { createHmac, timingSafeEqual } from "node:crypto";

export const GUEST_SESSION_COOKIE = "customdnd_guest_session";

export type GuestSessionPayload = {
  token: string;
  sessionId: string;
  sessionName: string;
  guestName: string;
  expiresAt: number;
};

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-only-session-secret-change-me";
}

function toBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(input: string): string {
  return createHmac("sha256", getSessionSecret()).update(input).digest("base64url");
}

export function createGuestSessionToken(payload: GuestSessionPayload): string {
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyGuestSessionToken(token: string | undefined): GuestSessionPayload | null {
  if (!token) {
    return null;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = sign(encoded);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as GuestSessionPayload;
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
