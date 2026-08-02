"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAdmin } from "@/services/auth.service";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginAdmin(username, password);
      const next = searchParams.get("next") || "/dashboard";
      router.push(next);
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-8"
    >
      <h1 className="text-xl font-semibold text-white">BlazeLine Admin Login</h1>

      {error && (
        <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm text-neutral-400">Username / Email</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white outline-none focus:border-orange-500"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-neutral-400">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-white outline-none focus:border-orange-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-orange-500 px-3 py-2 font-medium text-white hover:bg-orange-600 disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}