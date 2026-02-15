import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Custom DnD</h1>
      <p className="mt-2 text-sm">Backend-first auth foundation for your campaign platform.</p>

      {user ? (
        <section className="mt-8 space-y-3">
          <p className="text-sm">
            Logged in as <strong>{user.displayName}</strong> ({user.email})
          </p>
          <div className="flex gap-3">
            <Link href="/dashboard" className="rounded border px-3 py-2 text-sm">
              Go to Dashboard
            </Link>
            <Link href="/profile" className="rounded border px-3 py-2 text-sm">
              Profile
            </Link>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="rounded border px-3 py-2 text-sm">
                Log Out
              </button>
            </form>
          </div>
        </section>
      ) : (
        <section className="mt-8">
          <Link href="/auth" className="rounded border px-3 py-2 text-sm">
            Sign Up / Login
          </Link>
        </section>
      )}
    </main>
  );
}
