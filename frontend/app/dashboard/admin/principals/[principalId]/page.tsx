"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import Avatar from "@/components/Avatar";
import {
  isValidEmail,
  isBlank,
  requiredMessage,
  errorBorder,
  INVALID_EMAIL_MESSAGE,
  FieldErrors,
} from "@/lib/validation";
import FieldError from "@/components/FieldError";

import { API_BASE } from "@/lib/config";
import LoadingSkeleton from "@/components/Skeleton";
import { toast } from "@/lib/toast";

interface Principal {
  _id: string;
  title?: string;
  name: string;
  username: string;
  branch: string;
  branchId?: string;
  email?: string | null;
  createdAt: string;
}

export default function EditPrincipalPage() {
  const { principalId } = useParams<{ principalId: string }>();

  const [branches, setBranches] = useState<string[]>([]);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    FieldErrors<"name" | "branch" | "email">
  >({});

  const clearFieldError = (field: "name" | "branch" | "email") =>
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

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
            setTitle(found.title || "");
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

    const errors: FieldErrors<"name" | "branch" | "email"> = {};
    if (isBlank(name)) errors.name = requiredMessage("Full Name");
    if (isBlank(branch)) errors.branch = requiredMessage("Branch");
    if (isBlank(email)) errors.email = requiredMessage("Email");
    else if (!isValidEmail(email.trim())) errors.email = INVALID_EMAIL_MESSAGE;

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/staff/principals/${principalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, name, branch, email: email.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Failed to update principal");
        setSaving(false);
        return;
      }

      setPrincipal(data.principal);
      setStatus("Saved.");
      toast.success("Principal details saved");
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
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (!principal) {
    return (
      <DashboardLayout>
        <p className="text-red-500 text-sm mt-4">
          {error || "Principal not found"}
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbLabels={{ [principalId]: principal.name }}>
      <div className="flex items-center gap-4 mt-2 mb-6">
        <Avatar name={principal.name} size="lg" />
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {principal.name}
          </h1>
          <p className="text-sm text-gray-500">
            Branch Principal · {principal.branch}
            {principal.branchId ? ` (${principal.branchId})` : ""}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        noValidate
        className="bg-white rounded-md shadow-sm p-6 max-w-xl space-y-4"
      >
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Title
          </label>
          <select
            className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          >
            <option value="">Select</option>
            <option value="Mr">Mr</option>
            <option value="Mrs">Mrs</option>
            <option value="Ms">Ms</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Full Name
          </label>
          <input
            className={`w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400 ${errorBorder(fieldErrors.name)}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError("name");
            }}
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Branch
          </label>
          <select
            className={`w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400 ${errorBorder(fieldErrors.branch)}`}
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              clearFieldError("branch");
            }}
          >
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.branch} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Email
          </label>
          <input
            type="email"
            className={`w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-400 ${errorBorder(fieldErrors.email)}`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError("email");
            }}
            placeholder="you@example.com"
          />
          <FieldError message={fieldErrors.email} />
          <p className="text-xs text-gray-400 mt-1">
            Used for account recovery (forgot username / password).
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Branch ID
          </label>
          <p className="text-sm text-gray-500 font-mono">
            {principal.branchId || "—"}
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

    </DashboardLayout>
  );
}
