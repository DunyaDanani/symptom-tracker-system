"use client";

import { ReactNode, useEffect, useState } from "react";

const API_BASE = "http://localhost:5000/api";

export default function PinGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const [pin, setPinInput] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/pin-status`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (data.success) setHasPin(data.hasPin);
      } catch (err) {
        console.error("Failed to check PIN status", err);
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, []);

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/set-pin`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        setHasPin(true);
        setUnlocked(true);
      } else {
        setError(data.message || "Could not save PIN.");
      }
    } catch (err) {
      console.error("Failed to set PIN", err);
      setError("Unable to reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-pin`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        setUnlocked(true);
      } else {
        setError(data.message || "Incorrect PIN.");
      }
    } catch (err) {
      console.error("Failed to verify PIN", err);
      setError("Unable to reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return <p className="text-gray-400 text-sm">Loading...</p>;
  }

  if (unlocked) {
    return <>{children}</>;
  }

  if (!hasPin) {
    return (
      <div className="bg-white rounded-md shadow-sm p-6 max-w-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Set a 4-digit PIN
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          This protects your child&apos;s emotion and symptom history.
          You&apos;ll enter it each time you view this page.
        </p>
        <form onSubmit={handleSetPin}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
            placeholder="New PIN"
            className="w-full text-center tracking-[0.5em] bg-slate-50 border border-slate-200 rounded p-2.5 text-sm mb-3 outline-none focus:border-sky-400"
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(e) =>
              setConfirmPin(e.target.value.replace(/\D/g, ""))
            }
            placeholder="Confirm PIN"
            className="w-full text-center tracking-[0.5em] bg-slate-50 border border-slate-200 rounded p-2.5 text-sm mb-3 outline-none focus:border-sky-400"
          />
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2.5 rounded disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Set PIN"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow-sm p-6 max-w-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">
        Enter your PIN
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Confirm your 4-digit PIN to view this history.
      </p>
      <form onSubmit={handleVerifyPin}>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
          placeholder="PIN"
          className="w-full text-center tracking-[0.5em] bg-slate-50 border border-slate-200 rounded p-2.5 text-sm mb-3 outline-none focus:border-sky-400"
        />
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium py-2.5 rounded disabled:opacity-60"
        >
          {submitting ? "Checking..." : "Unlock"}
        </button>
      </form>
    </div>
  );
}
