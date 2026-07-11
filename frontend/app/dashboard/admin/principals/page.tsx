"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function AdminPrincipalsPage() {
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
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
    };

    load();
  }, []);

  return (
    <DashboardLayout>
      <BackButton />
      <div className="flex items-center justify-between mt-2 mb-8">
        <h1 className="text-2xl font-semibold text-blue-900">
          Branch Principals
        </h1>
        <Link
          href="/dashboard/admin/principals/new"
          className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded"
        >
          + Add Branch Principal
        </Link>
      </div>

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
                    {p.username}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {p.email || (
                      <span className="text-gray-300">Not set</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/dashboard/admin/principals/${p._id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
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
