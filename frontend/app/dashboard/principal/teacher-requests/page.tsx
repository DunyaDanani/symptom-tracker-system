"use client";

import { useEffect, useState } from "react";
import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";

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
  status:
    | "pending"
    | "forwarded"
    | "approved"
    | "accepted"
    | "denied"
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
  createdAt: string;
  reviewedBy?: { _id: string; name: string } | null;
  reviewedAt?: string | null;
  denialReason?: string;
  currentStudents: CurrentStudent[];
  previousStudents: CurrentStudent[];
}

const COMMUNICATION_LABEL: Record<string, string> = {
  "non-verbal": "Non-verbal",
  "partially-verbal": "Partially verbal",
  verbal: "Verbal",
};

// Admin requests to place an existing shadow teacher with a new child
// joining this branch. The principal either sends the request on to the
// teacher (with a message, which also lands in the teacher's inbox) or
// denies it. The teacher then accepts or declines, and only then can the
// admin assign them. See backend/models/TeacherAssignmentRequest.js.
export default function PrincipalTeacherRequestsPage() {
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [forwardingId, setForwardingId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState("");
  const [forwardError, setForwardError] = useState("");

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

  const review = async (
    id: string,
    action: "forward" | "cancel",
    extra: { reason?: string; message?: string } = {}
  ) => {
    setActingId(id);
    setError("");
    const token = localStorage.getItem("token");
    // Cancelling works at any stage before the teacher is assigned, and
    // tells the admin (and the teacher, if it had reached them).
    const url =
      action === "cancel"
        ? `${API_BASE}/principal/teacher-requests/${id}/cancel`
        : `${API_BASE}/principal/teacher-requests/${id}`;
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to update request");
      } else {
        setDenyingId(null);
        setDenyReason("");
        setForwardingId(null);
        setForwardMessage("");
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
    const styles: Record<TeacherRequest["status"], [string, string]> = {
      pending: ["bg-amber-100 text-amber-700", "Needs your review"],
      forwarded: ["bg-sky-100 text-sky-700", "Sent to teacher"],
      approved: ["bg-sky-100 text-sky-700", "Sent to teacher"],
      accepted: ["bg-emerald-100 text-emerald-700", "Teacher accepted"],
      denied: ["bg-red-100 text-red-700", "Denied"],
      declined: ["bg-red-100 text-red-700", "Teacher declined"],
      cancelled: ["bg-gray-100 text-gray-600", "Cancelled"],
      fulfilled: ["bg-blue-100 text-blue-700", "Teacher assigned"],
    };
    const [cls, label] = styles[status];
    return (
      <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${cls}`}>
        {label}
      </span>
    );
  };

  return (
    <PrincipalDashboardLayout>
      <div className="flex items-center justify-between mt-2 mb-1">
        <h1 className="text-2xl font-semibold text-blue-900">
          Shadow Teacher Assignment Requests
        </h1>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-blue-600 hover:underline"
        >
          {showAll ? "Show pending only" : "Show all"}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Admin requests to place an existing shadow teacher with a new child
        joining your branch. Send a request on to the teacher with a
        message, or deny it. The teacher then accepts or declines.
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
              {r.currentStudents.length > 0 ? (
                <p className="text-xs text-gray-600 mt-3">
                  Currently assigned to:{" "}
                  {r.currentStudents.map((s) => `${s.name} (${s.branch})`).join(", ")}
                </p>
              ) : (
                <p className="text-xs text-gray-600 mt-3">
                  No student at the moment.
                </p>
              )}
              {r.previousStudents.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Previously with:{" "}
                  {r.previousStudents.map((s) => `${s.name} (${s.branch})`).join(", ")}
                </p>
              )}

              {r.note && (
                <p className="text-xs text-gray-600 mt-2 italic">
                  &ldquo;{r.note}&rdquo;
                </p>
              )}

              {(r.status === "denied" || r.status === "cancelled") && r.denialReason && (
                <p className="text-xs text-red-500 mt-2">
                  Reason: {r.denialReason}
                </p>
              )}
              {r.principalMessage && r.status !== "pending" && (
                <p className="text-xs text-gray-600 mt-2">
                  Your message to the teacher: &ldquo;{r.principalMessage}&rdquo;
                </p>
              )}
              {r.status === "declined" && r.declineReason && (
                <p className="text-xs text-red-500 mt-2">
                  Teacher&apos;s reason: {r.declineReason}
                </p>
              )}

              {["pending", "forwarded", "approved", "accepted"].includes(r.status) && (
                <div className="mt-4">
                  {forwardingId === r._id ? (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-500">
                        Message to {r.teacher?.name || "the teacher"}
                      </label>
                      <textarea
                        rows={3}
                        className={`w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none focus:border-blue-400 ${forwardError ? "border-red-400!" : ""}`}
                        value={forwardMessage}
                        onChange={(e) => {
                          setForwardMessage(e.target.value);
                          setForwardError("");
                        }}
                      />
                      {forwardError && (
                        <p className="text-xs text-red-500">{forwardError}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (!forwardMessage.trim()) {
                              setForwardError("Message is required");
                              return;
                            }
                            review(r._id, "forward", { message: forwardMessage });
                          }}
                          disabled={actingId === r._id}
                          className="text-xs font-medium px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-60"
                        >
                          {actingId === r._id ? "Sending..." : "Send to teacher"}
                        </button>
                        <button
                          onClick={() => {
                            setForwardingId(null);
                            setForwardMessage("");
                            setForwardError("");
                          }}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  ) : denyingId === r._id ? (
                    <div className="flex items-center gap-2">
                      <input
                        className="flex-1 min-w-0 text-sm border border-gray-200 rounded px-3 py-2 outline-none focus:border-blue-400"
                        placeholder="Reason for cancelling (optional)"
                        value={denyReason}
                        onChange={(e) => setDenyReason(e.target.value)}
                      />
                      <button
                        onClick={() => review(r._id, "cancel", { reason: denyReason })}
                        disabled={actingId === r._id}
                        className="text-xs font-medium px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-60 whitespace-nowrap"
                      >
                        Confirm cancel
                      </button>
                      <button
                        onClick={() => {
                          setDenyingId(null);
                          setDenyReason("");
                        }}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Back
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {r.status === "pending" && (
                      <button
                        onClick={() => {
                          setDenyingId(null);
                          setForwardingId(r._id);
                          setForwardError("");
                          setForwardMessage(
                            `Hello ${r.teacher?.name || ""}, we have a child${r.studentName ? `, ${r.studentName},` : ""} joining our branch and would like you to be their shadow teacher. Please let us know if you can take this on.`
                          );
                        }}
                        disabled={actingId === r._id}
                        className="text-xs font-medium px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-60"
                      >
                        Send to teacher
                      </button>
                      )}
                      <button
                        onClick={() => {
                          setForwardingId(null);
                          setDenyingId(r._id);
                        }}
                        disabled={actingId === r._id}
                        className="text-xs font-medium px-4 py-2 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        Cancel request
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
