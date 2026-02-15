"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "signup" | "login";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Auth request failed.");
        return;
      }

      setMessage(mode === "signup" ? "Sign up successful." : "Login successful.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setMessage("Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">Authentication</h1>
      <p className="mt-2 text-sm">Use this page to test sign up and login locally.</p>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded border px-3 py-2 text-sm ${mode === "signup" ? "font-bold" : ""}`}
        >
          Sign Up
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded border px-3 py-2 text-sm ${mode === "login" ? "font-bold" : ""}`}
        >
          Login
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        {mode === "signup" ? (
          <label className="block text-sm">
            Display Name
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              maxLength={30}
              required
            />
          </label>
        ) : null}

        <label className="block text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </label>

        <label className="block text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            minLength={8}
            required
          />
        </label>

        <button type="submit" disabled={loading} className="rounded border px-3 py-2 text-sm">
          {loading ? "Submitting..." : mode === "signup" ? "Create Account" : "Login"}
        </button>
      </form>

      {message ? <p className="mt-4 text-sm">{message}</p> : null}
    </main>
  );
}
