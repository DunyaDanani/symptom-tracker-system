"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/config";

// Admin controls for a student's shadow teacher placement:
//  - remove the current teacher (their account and placement history are
//    kept, so they can be requested again for another child later);
//  - for a student with no teacher, request an existing teacher through the
//    branch principal, cancel that request, and assign the teacher once
//    they've accepted.
// See backend/models/TeacherAssignmentRequest.js for the request flow.

type RequestStatus =
  | "pending"
  | "forwarded"
  | "approved"
  | "accepted"
  | "denied"
  | "declined"
  | "cancelled";

interface TeacherOption {
  _id: string;
  name: string;
  specialization: string;
  currentStudents: { _id: string; name: string; branch: string }[];
  lastBranch: string | null;
  request: {
    _id: string;
    status: RequestStatus;
    branch: string;
    isOpen: boolean;
    denialReason?: string;
    declineReason?: string;
  } | null;
}

export interface TeacherHistoryEntry {
  _id?: string;
  teacher: { _id: string; name: string; username?: string } | string | null;
  assignedAt?: string;
  removedAt?: string | null;
}

interface Props {
  studentId: string;
  branch: string;
  hasTeacher: boolean;
  teacherHistory?: TeacherHistoryEntry[];
  onChanged: () => void | Promise<void>;
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
});

export default function StudentTeacherPanel({
  studentId,
  branch,
  hasTeacher,
  teacherHistory = [],
  onChanged,
}: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [search, setSearch] = useState("");

  const loadTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE}/students/teachers`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) setTeachers(data.teachers);
    } catch (err) {
      console.error("Failed to load teachers", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on open
    if (showPicker) loadTeachers();
  }, [showPicker]);

  const call = async (key: string, url: string, method: string, body?: object) => {
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!data.success) setError(data.message || "Something went wrong");
      else if (data.message) setNotice(data.message);
      return data.success as boolean;
    } catch (err) {
      console.error(err);
      setError("Unable to reach the server");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const removeTeacher = async () => {
    const ok = await call("remove", `${API_BASE}/students/${studentId}/teacher`, "PATCH", {
      action: "remove",
    });
    setConfirmRemove(false);
    if (ok) await onChanged();
  };

  const assignTeacher = async (teacherId: string) => {
    const ok = await call(teacherId, `${API_BASE}/students/${studentId}/teacher`, "PATCH", {
      action: "assign",
      teacherId,
    });
    if (ok) {
      setShowPicker(false);
      await onChanged();
    }
  };

  const requestTeacher = async (teacherId: string) => {
    await call(teacherId, `${API_BASE}/students/teachers/${teacherId}/request-assignment`, "POST", {
      branch,
      studentId,
    });
    await loadTeachers();
  };

  const cancelRequest = async (teacherId: string, requestId: string) => {
    await call(teacherId, `${API_BASE}/students/teacher-requests/${requestId}/cancel`, "PATCH");
    await loadTeachers();
  };

  const pastTeachers = teacherHistory.filter((h) => h.removedAt && h.teacher);
  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.specialization.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mt-4">
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      {notice && <p className="text-xs text-emerald-600 mb-2">{notice}</p>}

      {hasTeacher ? (
        confirmRemove ? (
          <div className="flex flex-wrap items-center gap-2 bg-red-50 border border-red-100 rounded p-3">
            <p className="text-xs text-red-700 flex-1 min-w-[200px]">
              Remove this shadow teacher from the student? The teacher&apos;s
              details stay on file so they can be requested for another child.
            </p>
            <button
              onClick={removeTeacher}
              disabled={busy === "remove"}
              className="text-xs font-medium px-4 py-1.5 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-60"
            >
              {busy === "remove" ? "Removing..." : "Remove"}
            </button>
            <button
              onClick={() => setConfirmRemove(false)}
              className="text-xs text-gray-500 hover:underline"
            >
              Back
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRemove(true)}
            className="text-xs text-red-500 hover:underline"
          >
            Remove shadow teacher
          </button>
        )
      ) : (
        <div>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="text-xs font-medium px-4 py-1.5 rounded bg-sky-100 text-sky-700 hover:bg-sky-200"
          >
            {showPicker ? "Hide teachers" : "Find a shadow teacher"}
          </button>

          {showPicker && (
            <div className="mt-3 border border-gray-100 rounded p-3">
              <p className="text-xs text-gray-500 mb-2">
                Request a teacher. The {branch} principal sends it on, and once
                the teacher accepts you can assign them here.
              </p>
              <input
                className="w-full text-sm border border-gray-200 rounded px-3 py-2 mb-3 outline-none focus:border-blue-400"
                placeholder="Search teacher by name or specialization"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="text-xs text-gray-400">No shadow teachers found.</p>
                )}
                {filtered.map((t) => {
                  const open = t.request?.isOpen ? t.request : null;
                  const ready = open?.status === "accepted" && open.branch === branch;
                  const otherBranch = open && open.branch !== branch;
                  const stage = !open
                    ? ""
                    : otherBranch
                    ? `Requested for ${open.branch}`
                    : open.status === "pending"
                    ? "Waiting for principal"
                    : "Waiting for teacher";
                  const isBusy = busy === t._id;
                  return (
                    <div key={t._id} className="border border-gray-100 rounded p-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{t.name}</p>
                          <p className="text-xs text-gray-500">
                            {t.currentStudents.length > 0
                              ? `Currently with ${t.currentStudents.map((c) => c.name).join(", ")}`
                              : t.lastBranch
                              ? `No student now · last worked in ${t.lastBranch}`
                              : t.specialization || "General"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {ready ? (
                            <button
                              onClick={() => assignTeacher(t._id)}
                              disabled={isBusy}
                              className="text-xs font-medium px-3 py-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-60"
                            >
                              {isBusy ? "Assigning..." : "Accepted — assign"}
                            </button>
                          ) : open ? (
                            <span className="text-xs font-medium px-3 py-1.5 rounded bg-amber-100 text-amber-700">
                              {stage}
                            </span>
                          ) : (
                            <button
                              onClick={() => requestTeacher(t._id)}
                              disabled={isBusy}
                              className="text-xs font-medium px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                            >
                              {isBusy ? "Sending..." : "Request teacher"}
                            </button>
                          )}
                          {open && (
                            <button
                              onClick={() => cancelRequest(t._id, open._id)}
                              disabled={isBusy}
                              className="text-xs text-red-500 hover:underline disabled:opacity-60"
                            >
                              Cancel request
                            </button>
                          )}
                        </div>
                      </div>
                      {!open && t.request?.status === "denied" && (
                        <p className="text-xs text-red-500 mt-1">
                          Last request denied
                          {t.request.denialReason ? `: ${t.request.denialReason}` : ""}
                        </p>
                      )}
                      {!open && t.request?.status === "declined" && (
                        <p className="text-xs text-red-500 mt-1">
                          Teacher declined the last request
                          {t.request.declineReason ? `: ${t.request.declineReason}` : ""}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {pastTeachers.length > 0 && (
        <p className="text-xs text-gray-500 mt-3">
          Previous shadow teachers:{" "}
          {pastTeachers
            .map((h) =>
              typeof h.teacher === "object" && h.teacher ? h.teacher.name : "Unknown"
            )
            .join(", ")}
        </p>
      )}
    </div>
  );
}
