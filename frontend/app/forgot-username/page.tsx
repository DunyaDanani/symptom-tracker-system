"use client";

import { useState } from "react";
import AuthCard from "@/components/AuthCard";
import { API_BASE } from "@/lib/config";

export default function ForgotUsernamePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-username`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Something went wrong");
      } else {
        setMessage(data.message);
      }
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      left={
        <div className="text-center md:text-left">
          <h1 className="text-xl font-medium text-gray-800">
            Forgot your username?
          </h1>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            Please enter your e-mail address linked with your profile and
            we&apos;ll send you your username to that e-mail.
          </p>
          <p className="mt-4 text-xs text-gray-400 leading-relaxed">
            <span className="font-semibold text-gray-500">NOTE:</span> If you
            do not receive an e-mail, it&apos;s possible you used a
            different e-mail address which is not linked with your profile.
            We suggest you contact the School System Admin for further
            assistance.
          </p>
        </div>
      }
      right={
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center bg-slate-100 rounded-sm px-3 py-3">
            <svg className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.94 6.94a2 2 0 012.12-.45L10 9.28l4.94-2.79a2 2 0 012.12.45 2 2 0 01.45 2.12L17 10.7V14a2 2 0 01-2 2H5a2 2 0 01-2-2v-3.3l-.5-1.64a2 2 0 01.45-2.12z" />
              <path d="M18 8.12l-8 4.5-8-4.5V6a2 2 0 012-2h12a2 2 0 012 2v2.12z" />
            </svg>
            <input
              type="email"
              placeholder="Enter Valid Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent outline-none w-full text-sm text-gray-700 placeholder-gray-400"
            />
          </div>

          {message && <p className="text-sm text-emerald-600 text-center">{message}</p>}
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
