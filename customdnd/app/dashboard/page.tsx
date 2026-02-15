import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { GuestLinkManager } from "./guest-link-manager";
import { CampaignManager } from "./campaign-manager";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth");
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-sm">
        Welcome, <strong>{user.displayName}</strong>.
      </p>
      <p className="text-sm">Account email: {user.email}</p>
      <p className="mt-4 text-sm">
        This is where your characters and campaigns APIs/pages will connect next.
      </p>

      <div className="mt-6 flex gap-3">
        <Link href="/" className="rounded border px-3 py-2 text-sm">
          Back Home
        </Link>
        <Link href="/profile" className="rounded border px-3 py-2 text-sm">
          Manage Profile
        </Link>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="rounded border px-3 py-2 text-sm">
            Log Out
          </button>
        </form>
      </div>

      <GuestLinkManager />
      <CampaignManager />
    </main>
  );
}
