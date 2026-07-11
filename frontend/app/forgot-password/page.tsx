"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import { API_BASE } from "@/lib/config";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Something went wrong");
        setLoading(false);
        return;
      }
      router.push(`/reset-password?username=${encodeURIComponent(username)}`);
    } catch {
      setError("Unable to reach the server. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthCard
      left={
        <div className="text-center md:text-left">
          <h1 className="text-xl font-medium text-gray-800">
            Forgot your password?
          </h1>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            Enter your Username and we will send you a Password Reset Code
            to the e-mail linked with your profile.
          </p>
          <p className="mt-4 text-xs text-gray-400 leading-relaxed">
            <span className="font-semibold text-gray-500">NOTE:</span> If you
            do not receive an e-mail with your reset code, it&apos;s
            possible you used a different e-mail address which is not
            linked with your profile. We suggest you contact the School
            System Admin for further assistance.
          </p>
        </div>
      }
      right={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center bg-slate-100 rounded-sm px-3 py-3">
            <svg className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            <input
              type="text"
              placeholder="Enter Valid Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-transparent outline-none w-full text-sm text-gray-700 placeholder-gray-400"
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 transition-colors text-white font-semibold tracking-wide py-3 rounded-sm disabled:opacity-60"
          >
            {loading ? "SENDING..." : "SUBMIT"}
          </button>

          <p className="text-center text-sm">
            <a href="/login" className="text-blue-500 hover:underline">
              Back to Sign-In Page
            </a>
          </p>
        </form>
      }
    />
  );
}
