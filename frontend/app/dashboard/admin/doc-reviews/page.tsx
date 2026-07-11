"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BackButton from "@/components/BackButton";
import { openAuthenticatedFile } from "@/lib/fileAccess";

import { API_BASE } from "@/lib/config";

interface DoctorDoc {
  _id: string;
  fileName: string;
  filePath: string;
  fileType: "photo" | "pdf";
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  reviewedBy?: { name: string } | null;
  reviewedAt?: string | null;
  createdAt: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    grade?: string;
    section?: string;
    branch?: string;
  } | null;
}

const STATUS_STYLE: Record<DoctorDoc["status"], string> = {
  pending: "text-amber-700 bg-amber-50",
  approved: "text-green-700 bg-green-50",
  rejected: "text-red-700 bg-red-50",
};

export default function AdminDocReviewsPage() {
  const [documents, setDocuments] = useState<DoctorDoc[]>([]);
  const [status, setStatus] = useState<"pending" | "all">("pending");
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const load = async (nextStatus: "pending" | "all", nextBranch: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: nextStatus === "all" ? "all" : "pending",
      });
      if (nextBranch) params.set("branch", nextBranch);
      const res = await fetch(`${API_BASE}/doctor-documents?${params.toString()}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setDocuments(data.documents);
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/students/branches`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setBranches(data.branches);
      })
      .catch((err) => console.error("Failed to load branches", err));
  }, []);

  useEffect(() => {
    load(status, branch);
  }, [status, branch]);

  const review = async (id: string, decision: "approved" | "rejected") => {
    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/doctor-documents/${id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          status: decision,
          reviewNote: noteDrafts[id] || "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (status === "pending") {
          setDocuments((prev) => prev.filter((d) => d._id !== id));
        } else {
          setDocuments((prev) =>
            prev.map((d) => (d._id === id ? { ...d, ...data.document } : d))
          );
        }
      }
    } catch (err) {
      console.error("Failed to review document", err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout>
      <BackButton />
      <div className="flex items-center justify-between mt-2 mb-8 gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold text-blue-900">Doc Reviews</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 outline-none focus:border-blue-400 bg-white text-gray-700"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <div className="flex gap-2 bg-white rounded-md border border-gray-200 p-1">
            <button
              onClick={() => setStatus("pending")}
              className={`px-4 py-1.5 text-sm rounded ${
                status === "pending"
                  ? "bg-blue-900 text-white"
                  : "text-gray-600 hover:bg-slate-50"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setStatus("all")}
              className={`px-4 py-1.5 text-sm rounded ${
                status === "all"
                  ? "bg-blue-900 text-white"
                  : "text-gray-600 hover:bg-slate-50"
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400">
          {status === "pending"
            ? "No documents waiting for review."
            : "No documents uploaded yet."}
          {branch ? ` for ${branch}.` : ""}
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {documents.map((doc) => (
            <div key={doc._id} className="bg-white rounded-md shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {doc.student
                      ? `${doc.student.firstName} ${doc.student.lastName}`
                      : "Unknown student"}
                    {doc.student?.grade ? ` — Grade ${doc.student.grade}` : ""}
                  </p>
                  {doc.student?.branch && (
                    <p className="text-xs text-gray-400">{doc.student.branch}</p>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      openAuthenticatedFile(
                        `${API_BASE}/doctor-documents/${doc._id}/file`
                      )
                    }
                    className="text-sm text-blue-600 hover:underline break-all text-left"
                  >
                    {doc.fileName}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">
                    Uploaded {new Date(doc.createdAt).toLocaleString()}
                  </p>
                  {doc.reviewedBy?.name && (
                    <p className="text-xs text-gray-400">
                      Reviewed by {doc.reviewedBy.name}
                      {doc.reviewNote ? ` — "${doc.reviewNote}"` : ""}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded shrink-0 ${STATUS_STYLE[doc.status]}`}
                >
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>
              </div>

              {doc.status === "pending" && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <textarea
                    value={noteDrafts[doc._id] || ""}
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({ ...prev, [doc._id]: e.target.value }))
                    }
                    placeholder="Review note (optional)"
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400 resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => review(doc._id, "approved")}
                      disabled={busyId === doc._id}
                      className="px-4 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {busyId === doc._id ? "Saving..." : "Approve"}
                    </button>
                    <button
                      onClick={() => review(doc._id, "rejected")}
                      disabled={busyId === doc._id}
                      className="px-4 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {busyId === doc._id ? "Saving..." : "Reject"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
