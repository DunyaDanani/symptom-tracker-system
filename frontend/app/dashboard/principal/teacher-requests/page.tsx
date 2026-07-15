"use client";

import { useEffect, useState } from "react";
import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";
import BackButton from "@/components/BackButton";

import { API_BASE } from "@/lib/config";

interface CurrentStudent {
  _id: string;
  name: string;
  branch: string;
}

interface TeacherRequest {
  _id: string;
  teacher: { _id: string; name: string; username: string } | null;
  requestedBy: { _id: string; name: string } | null;
  note: string;
  status: "pending" | "approved" | "denied" | "fulfilled";
  createdAt: string;
  reviewedBy?: { _id: string; name: string } | null;
  reviewedAt?: string | null;
  denialReason?: string;
  currentStudents: CurrentStudent[];
}

// A shadow teacher is meant to be 1:1 with a single student. This page is
// where a branch principal reviews admin requests to break that rule for a
// specific teacher/second-student situation — approve to let the admin go
// ahead and assign them, or deny to keep the teacher at their current
// student only. See backend/models/TeacherAssignmentRequest.js.
export default function PrincipalTeacherRequestsPage() {
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const load = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `${API_BASE}/principal/teacher-requests?status=${showAll ? "all" : "pending"}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      } else {
        setError(data.message || "Could not load requests");
      }
    } catch (err) {
      console.error("Failed to load teacher requests", err);
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll]);

  const review = async (id: string, action: "approve" | "deny", reason?: string) => {
    setActingId(id);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/principal/teacher-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to update request");
      } else {
        setDenyingId(null);
        setDenyReason("");
        await load();
      }
    } catch (err) {
      console.error("Failed to review request", err);
      setError("Unable to reach the server");
    } finally {
      setActingId(null);
    }
  };

  const statusBadge = (status: TeacherRequest["status"]) => {
    const styles: Record<TeacherRequest["status"], string> = {
      pending: "bg-amber-100 text-amber-700",
      approved: "bg-emerald-100 text-emerald-700",
      denied: "bg-red-100 text-red-700",
      fulfilled: "bg-blue-100 text-blue-700",
    };
    return (
      <span className={`text-xs font-medium px-2.5 py-1 rounded ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <PrincipalDashboardLayout>
      <BackButton />
      <div className="flex items-center justify-between mt-2 mb-1">
        <h1 className="text-2xl font-semibold text-blue-900">
          Teacher Assignment Requests
        </h1>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-blue-600 hover:underline"
        >
          {showAll ? "Show pending only" : "Show all"}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Shadow teachers are meant to be assigned to one student at a time.
        These are admin requests to assign an already-assigned teacher to a
        second student in your branch.
      </p>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-md shadow-sm p-8 text-center text-gray-400 text-sm">
          {showAll ? "No requests yet." : "No pending requests."}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r._id} className="bg-white rounded-md shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-800">
                    {r.teacher?.name || "Unknown teacher"}{" "}
                    <span className="text-xs text-gray-400 font-normal">
                      ({r.teacher?.username})
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Requested by {r.requestedBy?.name || "an admin"} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {statusBadge(r.status)}
              </div>

              {r.currentStudents.length > 0 && (
                <p className="text-xs text-gray-600 mt-3">
                  Currently assigned to:{" "}
                  {r.currentStudents.map((s) => s.name).join(", ")}
                </p>
              )}

              {r.note && (
                <p className="text-xs text-gray-600 mt-2 italic">
                  &ldquo;{r.note}&rdquo;
                </p>
              )}

              {r.status === "denied" && r.denialReason && (
                <p className="text-xs text-red-500 mt-2">
                  Reason: {r.denialReason}
                </p>
              )}

              {r.status === "pending" && (
                <div className="mt-4">
                  {denyingId === r._id ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="input flex-1 text-sm"
                        placeholder="Reason (optional)"
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                      />
                      <button
                        onClick={() => review(r._id, "deny", denyReason)}
                        disabled={actingId === r._id}
                        className="text-xs font-medium px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-60"
                      >
                        Confirm deny
                      </button>
                      <button
                        onClick={() => {
                          setDenyingId(null);
                          setDenyReason("");
                        }}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => review(r._id, "approve")}
                        disabled={actingId === r._id}
                        className="text-xs font-medium px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setDenyingId(r._id)}
                        disabled={actingId === r._id}
                        className="text-xs font-medium px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Deny
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PrincipalDashboardLayout>
  );
}
