import { findGuestLinkByToken, isLinkExpired } from "@/lib/guest-link-store";
import { GuestJoinClient } from "./guest-join-client";

type GuestPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function GuestJoinPage({ params }: GuestPageProps) {
  const { token } = await params;
  const link = await findGuestLinkByToken(token);

  if (!link || link.revoked || isLinkExpired(link)) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-bold">Guest Link Unavailable</h1>
        <p className="mt-3 text-sm">This guest link is invalid, revoked, or expired.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">Join Session as Guest</h1>
      <p className="mt-2 text-sm">
        Session: <strong>{link.sessionName}</strong>
      </p>
      <p className="text-sm">Link expires: {new Date(link.expiresAt).toLocaleString()}</p>

      <GuestJoinClient token={token} />
    </main>
  );
}
