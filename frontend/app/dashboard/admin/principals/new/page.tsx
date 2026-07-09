"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

interface Credentials {
  username: string;
  password: string;
}

const API_BASE = "http://localhost:5000/api";

export default function CreatePrincipalPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  useEffect(() => {
    const loadBranches = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE}/students/branches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setBranches(data.branches);
          if (data.branches.length > 0) setBranch(data.branches[0]);
        }
      } catch (err) {
        console.error("Failed to load branches", err);
      }
    };

    loadBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !branch) {
      setError("Name and branch are required");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      const res = await fetch(`${API_BASE}/staff/principals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, branch }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Failed to create principal account");
        setSubmitting(false);
        return;
      }

      setCredentials(data.credentials);
      setSuccess(true);
    } catch (err) {
      console.error("Failed to create principal", err);
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setBranch(branches[0] || "");
    setCredentials(null);
    setSuccess(false);
  };

  if (success) {
    return (
      <DashboardLayout>
        <div className="max-w-xl">
          <h1 className="text-xl font-semibold text-gray-800 mb-6">
            Create Branch Principal
          </h1>

          <div className="bg-white rounded-md shadow-sm p-6">
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded p-4 mb-6">
              Principal account for {name} ({branch}) created successfully.
            </div>

            <h2 className="font-semibold text-gray-700 mb-4">Login credentials</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Username</span>
                <span className="text-gray-800 font-mono">
                  {credentials?.username}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Password</span>
                <span className="text-gray-800 font-mono">
                  {credentials?.password}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => router.push("/dashboard/admin")}
                className="border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded hover:bg-gray-50"
              >
                Back to dashboard
              </button>
              <button
                onClick={resetForm}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
              >
                + Add another principal
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-xl">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">
          Create Branch Principal
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-md shadow-sm p-6"
        >
          {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

          <label className="block text-xs font-medium text-gray-500 mb-1">
            Full Name
          </label>
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm mb-4 outline-none focus:border-sky-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nadeesha Perera"
          />

          <label className="block text-xs font-medium text-gray-500 mb-1">
            Branch
          </label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm mb-6 outline-none focus:border-sky-400"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <p className="text-xs text-gray-400 mb-6">
            Login credentials will be auto-generated and shown after you
            confirm.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create Principal Account"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
