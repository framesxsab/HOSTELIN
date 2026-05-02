"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UiIcon } from "@/components/ui-icon";
import { apiFetchJson, toUiMessage } from "@/lib/api-client";
import { useAuthStore, type User } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (isHydrated && token) router.push("/");
  }, [isHydrated, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetchJson<{ access_token: string; user: User }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      setAuth(res.access_token, res.user);
      router.push("/");
    } catch (err) {
      setError(toUiMessage(err, "Invalid credentials. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  if (!isHydrated) return null;

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center p-4 selection:bg-primary/25 font-mono">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(163,230,53,0.3)] border border-primary/80">
            <UiIcon name="terminal" className="text-void w-7 h-7" />
          </div>
        </div>

        <h1 className="text-2xl text-white text-center mb-2 font-display uppercase tracking-wider font-bold">
          Identify Yourself
        </h1>
        <p className="text-text-muted text-center mb-8 text-sm">
          Enter your credentials to access HostelOS
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 bg-void-panel/50 p-8 rounded-2xl border border-void-border shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-text-muted text-xs mb-2 uppercase tracking-widest pl-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-void border-2 border-void-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="e.g. jdoe99"
            />
          </div>

          <div>
            <label className="block text-text-muted text-xs mb-2 uppercase tracking-widest pl-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-void border-2 border-void-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/85 text-void font-bold py-3 rounded-xl transition-all uppercase tracking-wider disabled:opacity-50 mt-4 shadow-lg shadow-primary/15"
          >
            {loading ? "Authenticating..." : "Login"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-text-dim">
          Unregistered protocol?{" "}
          <Link href="/register" className="text-primary hover:text-primary/80 underline underline-offset-4 decoration-primary/30">
            Initialize Here
          </Link>
        </p>
      </div>
    </div>
  );
}
