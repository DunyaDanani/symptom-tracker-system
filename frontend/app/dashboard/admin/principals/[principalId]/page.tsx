"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import BackButton from "@/components/BackButton";
import Avatar from "@/components/Avatar";

import { API_BASE } from "@/lib/config";

interface Principal {
  _id: string;
  name: string;
  username: string;
  branch: string;
  email?: string | null;
  createdAt: string;
}

export default function EditPrincipalPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const router = useRouter();

  const [branches, setBranches] = useState<string[]>([]);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const [principalsRes, branchesRes] = await Promise.all([
          fetch(`${API_BASE}/staff/principals`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/students/branches`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const principalsData = await principalsRes.json();
        const branchesData = await branchesRes.json();

        if (branchesData.success) setBranches(branchesData.branches);

        if (principalsData.success) {
          const found = principalsData.principals.find(
            (p: Principal) => p._id === principalId
          );
          if (found) {
            setPrincipal(found);
            setName(found.name);
            setBranch(found.branch);
            setEmail(found.email || "");
          } else {
            setError("Principal not found");
          }
        } else {
          setError(principalsData.message || "Could not load principal");
        }
      } catch (err) {
        console.error("Failed to load principal", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [principalId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus(null);

    if (!name.trim() || !branch) {
      setError("Name and branch are required");
      return;
    }

    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/staff/principals/${principalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, branch, email: email.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Failed to update principal");
        setSaving(false);
        return;
      }

      setPrincipal(data.principal);
      setStatus("Saved.");
    } catch (err) {
      console.error("Failed to update principal", err);
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <p className="text-gray-400 text-sm">Loading...</p>
      </DashboardLayout>
    );
  }

  if (!principal) {
    return (
      <DashboardLayout>
        <BackButton />
        <p className="text-red-500 text-sm mt-4">
          {error || "Principal not found"}
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <BackButton />
      <div className="flex items-center gap-4 mt-2 mb-6">
        <Avatar name={principal.name} size="lg" />
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {principal.name}
          </h1>
          <p className="text-sm text-gray-500">
            Branch Principal · {principal.branch}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-md shadow-sm p-6 max-w-xl space-y-4"
      >
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Full Name
          </label>
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Branch
          </label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Email <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="email"
            className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <p className="text-xs text-gray-400 mt-1">
            Used for account recovery (forgot username / password).
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Username
          </label>
          <p className="text-sm text-gray-500 font-mono">
            {principal.username}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {status && <p className="text-xs text-gray-500">{status}</p>}
        </div>
      </form>

      <button
        onClick={() => router.push("/dashboard/admin/principals")}
        className="text-sm text-gray-500 hover:underline mt-4"
      >
        ← Back to all principals
      </button>
    </DashboardLayout>
  );
}
