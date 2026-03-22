"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UiIcon } from "@/components/ui-icon";
import { apiFetchJson } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (isHydrated && token) {
      router.push("/");
    }
  }, [isHydrated, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetchJson<{access_token: string, user: any}>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password })
      });
      setAuth(res.access_token, res.user);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed. Try a different username.");
    } finally {
      setLoading(false);
    }
  };

  if (!isHydrated) return null;

  return (
    <div className="min-h-screen bg-[#050510] flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30 font-mono">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="h-14 w-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/50">
            <UiIcon name="terminal" className="text-emerald-400 w-7 h-7" />
          </div>
        </div>
        
        <h1 className="text-2xl text-emerald-50 text-center mb-2 font-display uppercase tracking-wider font-bold">
          Register Protocol
        </h1>
        <p className="text-emerald-500/60 text-center mb-8 text-sm">
          Onboard a new identity to the space
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 bg-emerald-950/20 p-8 rounded-3xl border border-emerald-500/20 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-emerald-500/80 text-xs mb-2 uppercase tracking-widest pl-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#050510] border-2 border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-emerald-500/80 text-xs mb-2 uppercase tracking-widest pl-1">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#050510] border-2 border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="e.g. jdoe99"
            />
          </div>

          <div>
            <label className="block text-emerald-500/80 text-xs mb-2 uppercase tracking-widest pl-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#050510] border-2 border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-50 focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#050510] font-bold py-3 rounded-xl transition-all uppercase tracking-wider disabled:opacity-50 mt-4"
          >
            {loading ? "Joining..." : "Create Identity"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-emerald-500/50">
          Already part of the system?{" "}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-4 decoration-emerald-500/30">
            Login Here
          </Link>
        </p>
      </div>
    </div>
  );
}
