"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BackButton from "@/components/BackButton";
import Avatar from "@/components/Avatar";
import AddPrincipalModal from "@/components/AddPrincipalModal";

import { API_BASE } from "@/lib/config";

interface Principal {
  _id: string;
  name: string;
  username: string;
  branch: string;
  branchId?: string;
  email?: string | null;
  createdAt: string;
}

export default function AdminPrincipalsPage() {
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPrincipals = useCallback(async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/staff/principals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPrincipals(data.principals);
      } else {
        setError(data.message || "Could not load principals");
      }
    } catch (err) {
      console.error("Failed to load principals", err);
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrincipals();
  }, [loadPrincipals]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}'s principal account? This can't be undone.`))
      return;

    setDeletingId(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/staff/principals/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPrincipals((prev) => prev.filter((p) => p._id !== id));
      } else {
        alert(data.message || "Could not delete principal");
      }
    } catch (err) {
      console.error("Failed to delete principal", err);
      alert("Unable to reach the server");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <BackButton />
      <div className="flex items-center justify-between mt-2 mb-8">
        <h1 className="text-2xl font-semibold text-blue-900">
          Branch Principals
        </h1>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded"
        >
          + Add Branch Principal
        </button>
      </div>

      <AddPrincipalModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={loadPrincipals}
      />

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : principals.length === 0 ? (
        <div className="bg-white rounded-md shadow-sm p-8 text-center text-gray-400 text-sm">
          No branch principals yet.
        </div>
      ) : (
        <div className="bg-white rounded-md shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 font-semibold text-gray-700">
                  Principal
                </th>
                <th className="px-5 py-3 font-semibold text-gray-700">
                  Branch
                </th>
                <th className="px-5 py-3 font-semibold text-gray-700">
                  Branch ID
                </th>
                <th className="px-5 py-3 font-semibold text-gray-700">
                  Username
                </th>
                <th className="px-5 py-3 font-semibold text-gray-700">
                  Email
                </th>
                <th className="px-5 py-3 font-semibold text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {principals.map((p) => (
                <tr key={p._id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} size="sm" />
                      <span className="text-gray-800 font-medium">
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{p.branch}</td>
                  <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                    {p.branchId || "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600 font-mono text-xs">
                    {p.username}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.email || (
                      <span className="text-gray-300">Not set</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="inline-flex items-center gap-3">
                      <Link
                        href={`/dashboard/admin/principals/${p._id}`}
                        className="inline-flex text-gray-300 hover:text-blue-600 transition-colors"
                        aria-label="Edit principal"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(p._id, p.name)}
                        disabled={deletingId === p._id}
                        className="inline-flex text-gray-300 hover:text-red-600 transition-colors disabled:opacity-50"
                        aria-label="Delete principal"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 4.5l3.75 3.75" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}
