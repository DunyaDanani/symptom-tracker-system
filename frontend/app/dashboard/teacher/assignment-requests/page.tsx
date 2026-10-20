"use client";

import { useEffect, useState } from "react";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import { API_BASE } from "@/lib/config";

interface AssignmentRequest {
  _id: string;
  branch: string;
  status:
    | "forwarded"
    | "approved"
    | "accepted"
    | "declined"
    | "cancelled"
    | "fulfilled";
  principalMessage?: string;
  declineReason?: string;
  studentName?: string;
  studentGrade?: string;
  studentProgramCategory?: string;
  studentDiagnosis?: string;
  studentCommunicationLevel?: string;
  reviewedBy?: { _id: string; name: string } | null;
  reviewedAt?: string | null;
  teacherRespondedAt?: string | null;
  createdAt: string;
}

const COMMUNICATION_LABEL: Record<string, string> = {
  "non-verbal": "Non-verbal",
  "partially-verbal": "Partially verbal",
  verbal: "Verbal",
};

const STATUS_STYLE: Record<AssignmentRequest["status"], [string, string]> = {
  forwarded: ["bg-amber-100 text-amber-700", "Waiting for your answer"],
  approved: ["bg-amber-100 text-amber-700", "Waiting for your answer"],
  accepted: ["bg-emerald-100 text-emerald-700", "You accepted"],
  declined: ["bg-red-100 text-red-700", "You declined"],
  cancelled: ["bg-gray-100 text-gray-600", "Cancelled"],
  fulfilled: ["bg-blue-100 text-blue-700", "Assigned"],
};

// Requests from a branch principal to take on a new child. Accepting lets
// the admin assign this teacher to the child; declining closes the
// request. See backend/models/TeacherAssignmentRequest.js.
export default function TeacherAssignmentRequestsPage() {
  const [requests, setRequests] = useState<AssignmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const load = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/teacher/assignment-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setRequests(data.requests);
      else setError(data.message || "Could not load requests");
    } catch (err) {
      console.error("Failed to load assignment requests", err);
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    load();
  }, []);

  const respond = async (id: string, action: "accept" | "decline") => {
    setActingId(id);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/teacher/assignment-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          reason: action === "decline" ? declineReason : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) setError(data.message || "Could not update the request");
      setDecliningId(null);
      setDeclineReason("");
      await load();
    } catch (err) {
      console.error("Failed to respond to request", err);
      setError("Unable to reach the server");
    } finally {
      setActingId(null);
    }
  };

  return (
    <TeacherDashboardLayout>
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
        Shadow Teacher Assignment Requests
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Requests from a branch principal to be the shadow teacher for a new
        child. Once you accept, the admin can assign you.
      </p>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-md shadow-sm p-8 text-center text-gray-400 text-sm">
          No requests yet.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const [cls, label] = STATUS_STYLE[r.status];
            const awaiting = r.status === "forwarded" || r.status === "approved";
            return (
              <div key={r._id} className="bg-white rounded-md shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-800">
                      {r.studentName
                        ? `${r.studentName} — joining ${r.branch}`
                        : `New child joining ${r.branch}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      From {r.reviewedBy?.name || "the branch principal"}
                      {r.reviewedAt
                        ? ` · ${new Date(r.reviewedAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${cls}`}>
                    {label}
                  </span>
                </div>

                {r.studentName && (
                  <div className="mt-3 bg-slate-50 border border-slate-100 rounded p-3 text-xs text-gray-700 space-y-1">
                    <p>
                      <span className="text-gray-500">Student:</span>{" "}
                      <span className="font-medium">{r.studentName}</span>
                      {r.studentGrade ? ` · ${r.studentGrade}` : ""}
                      {r.studentProgramCategory
                        ? ` (${r.studentProgramCategory === "cambridge" ? "Cambridge" : "National"})`
                        : ""}
                    </p>
                    {r.studentDiagnosis && (
                      <p>
                        <span className="text-gray-500">Condition:</span>{" "}
                        {r.studentDiagnosis}
                      </p>
                    )}
                    {r.studentCommunicationLevel && (
                      <p>
                        <span className="text-gray-500">Communication:</span>{" "}
                        {COMMUNICATION_LABEL[r.studentCommunicationLevel] ||
                          r.studentCommunicationLevel}
                      </p>
                    )}
                  </div>
                )}
                {r.principalMessage && (
                  <p className="text-sm text-gray-700 mt-3 whitespace-pre-line">
                    {r.principalMessage}
                  </p>
                )}
                {r.status === "declined" && r.declineReason && (
                  <p className="text-xs text-gray-500 mt-2">
                    Your reason: {r.declineReason}
                  </p>
                )}

                {awaiting && (
                  <div className="mt-4">
                    {decliningId === r._id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="flex-1 min-w-[200px] text-sm border border-gray-200 rounded px-3 py-2 outline-none focus:border-blue-400"
                          placeholder="Reason (optional)"
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                        />
                        <button
                          onClick={() => respond(r._id, "decline")}
                          disabled={actingId === r._id}
                          className="text-xs font-medium px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-60"
                        >
                          Confirm decline
                        </button>
                        <button
                          onClick={() => {
                            setDecliningId(null);
                            setDeclineReason("");
                          }}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Back
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => respond(r._id, "accept")}
                          disabled={actingId === r._id}
                          className="text-xs font-medium px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-60"
                        >
                          {actingId === r._id ? "Saving..." : "Accept"}
                        </button>
                        <button
                          onClick={() => setDecliningId(r._id)}
                          disabled={actingId === r._id}
                          className="text-xs font-medium px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </TeacherDashboardLayout>
  );
}
