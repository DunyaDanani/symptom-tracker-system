"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import Modal from "@/components/Modal";
import { API_BASE } from "@/lib/config";
import { BTN_SECONDARY, BTN_DANGER, BTN_DANGER_OUTLINE } from "@/lib/ui";
import FieldError from "@/components/FieldError";
import LoadingSkeleton from "@/components/Skeleton";
import { toast } from "@/lib/toast";
import { formatCommunication, formatText } from "@/lib/format";

// Common reasons a shadow teacher (or admin) flags a student for the
// principal's attention — covers the majority of cases with one click;
// "Other" plus the free-text details box handles everything else.
const FLAG_REASONS = [
  "Behavioral concern",
  "Academic concern",
  "Attendance issue",
  "Health / Medical concern",
  "Family / Home situation",
  "Other",
];

interface StudentSummary {
  _id: string;
  fullName: string;
  grade: string;
  section?: string;
  diagnosis: string;
  communicationLevel: string;
  flagged?: boolean;
  flagNote?: string;
  admissionNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  parentFirstName?: string;
  parentRelationship?: string;
  parentPhone?: string;
  parentEmail?: string;
  homeCity?: string;
}

export default function TeacherStudentHubPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flagReason, setFlagReason] = useState("");
  const [flagNote, setFlagNote] = useState("");
  const [savingFlag, setSavingFlag] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // "Remove student" — the child is leaving the school, or the parents
  // asked for a different shadow teacher.
  const router = useRouter();
  const [isShadowTeacher, setIsShadowTeacher] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only value
    setIsShadowTeacher(localStorage.getItem("role") === "shadow_teacher");
  }, []);
  const [showRelease, setShowRelease] = useState(false);
  const [releaseReason, setReleaseReason] = useState("");
  const [releaseNote, setReleaseNote] = useState("");
  const [releaseErrors, setReleaseErrors] = useState<{ reason?: string; note?: string }>({});
  const [releasing, setReleasing] = useState(false);

  const closeRelease = () => {
    setShowRelease(false);
    setReleaseReason("");
    setReleaseNote("");
    setReleaseErrors({});
  };

  const submitRelease = async () => {
    const errors: { reason?: string; note?: string } = {};
    if (!releaseReason) errors.reason = "Reason is required";
    if (releaseReason === "other" && !releaseNote.trim())
      errors.note = "Please explain the reason";
    setReleaseErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setReleasing(true);
    try {
      const res = await fetch(`${API_BASE}/teacher/students/${studentId}/release`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: releaseReason, note: releaseNote }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "Could not remove the student");
        return;
      }
      toast.success(data.message || "Student removed");
      closeRelease();
      router.push("/dashboard/teacher/students");
    } catch (err) {
      console.error("Failed to remove student", err);
      toast.error("Unable to reach the server");
    } finally {
      setReleasing(false);
    }
  };

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/teacher/students`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        const found = data.students.find(
          (s: StudentSummary) => s._id === studentId
        );
        if (!found) {
          setError("This student is not assigned to you");
        } else {
          setStudent(found);
          setFlagNote(found.flagNote || "");
        }
      } else {
        setError(data.message || "Could not load this student");
      }
    } catch (err) {
      console.error("Failed to load student", err);
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initial load / sync from browser storage or loaded data
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Combines the selected reason with the free-text details into the
  // single string the backend stores as flagNote — e.g.
  // "Behavioral concern: keeps leaving the classroom without notice".
  const composeFlagNote = () => {
    const details = flagNote.trim();
    if (flagReason && details) return `${flagReason}: ${details}`;
    if (flagReason) return flagReason;
    return details;
  };

  const toggleFlag = async () => {
    if (!student) return;
    setSavingFlag(true);
    try {
      const res = await fetch(
        `${API_BASE}/teacher/students/${studentId}/flag`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            flagged: !student.flagged,
            flagNote: composeFlagNote(),
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        toast.success(student.flagged ? "Flag cleared" : "Student flagged for attention");
        await load();
      } else {
        toast.error(data.message || "Could not update the flag");
      }
    } catch (err) {
      console.error("Failed to update flag", err);
    } finally {
      setSavingFlag(false);
    }
  };

  return (
    <TeacherDashboardLayout
      breadcrumbLabels={
        student
          ? { [studentId]: student.fullName }
          : undefined
      }
    >
      {loading ? (
        <LoadingSkeleton className="mt-4" />
      ) : error ? (
        <p className="text-red-500 text-sm mt-4">{error}</p>
      ) : (
        <>

          <div className="flex items-start justify-between gap-4 flex-wrap mt-2 mb-6">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-blue-900">
                  {student?.fullName}
                </h1>
                {student?.flagged && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                    Flagged
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {student?.grade}
                {student?.section ? ` · ${student.section}` : ""}
                {student?.diagnosis ? ` · ${formatText(student.diagnosis)}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className={BTN_SECONDARY}
              >
                View Profile
              </button>
              {isShadowTeacher && (
                <button
                  type="button"
                  onClick={() => setShowRelease(true)}
                  className={BTN_DANGER_OUTLINE}
                >
                  Remove student
                </button>
              )}
            </div>
          </div>

          <Modal
            open={showRelease}
            onClose={closeRelease}
            title="Remove student from your list"
            maxWidthClassName="max-w-lg"
          >
            <p className="text-sm text-gray-600 mb-4">
              {student?.fullName} will no longer be assigned to you. The admin
              and your branch principal are told, so they can update the
              record or find a new shadow teacher. Their history (symptoms,
              check-ins, reports) is kept.
            </p>

            <p className="text-xs font-medium text-gray-500 mb-2">Reason</p>
            <div className="space-y-2" role="radiogroup">
              {[
                { value: "leaving_school", label: "The student is leaving the school" },
                { value: "parent_request", label: "The parents asked to change the shadow teacher" },
                { value: "other", label: "Other reason" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 min-h-10 px-3 rounded border cursor-pointer text-sm ${
                    releaseReason === opt.value
                      ? "border-blue-900 bg-blue-50 text-gray-900"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="release-reason"
                    value={opt.value}
                    checked={releaseReason === opt.value}
                    onChange={() => {
                      setReleaseReason(opt.value);
                      setReleaseErrors({});
                    }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            <FieldError message={releaseErrors.reason} />

            <label className="block text-xs font-medium text-gray-500 mt-4 mb-1">
              Details {releaseReason === "other" ? "" : "(optional)"}
            </label>
            <textarea
              rows={3}
              value={releaseNote}
              onChange={(e) => {
                setReleaseNote(e.target.value);
                setReleaseErrors((prev) => ({ ...prev, note: undefined }));
              }}
              placeholder="e.g. Last day is 30 October"
              className={`w-full text-sm border rounded px-3 py-2 outline-none focus:border-blue-400 ${
                releaseErrors.note ? "border-red-400" : "border-gray-200"
              }`}
            />
            <FieldError message={releaseErrors.note} />

            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={closeRelease} className={BTN_SECONDARY}>
                Keep student
              </button>
              <button
                type="button"
                onClick={submitRelease}
                disabled={releasing}
                className={BTN_DANGER}
              >
                {releasing ? "Removing..." : "Remove student"}
              </button>
            </div>
          </Modal>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  href={`/dashboard/teacher/students/${studentId}/symptoms/history`}
                  className="bg-white rounded-md shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <p className="font-semibold text-gray-800">Symptom History</p>
                  <p className="text-sm text-gray-500 mt-1">
                    View logged symptoms over time
                  </p>
                </Link>

                <Link
                  href={`/dashboard/teacher/students/${studentId}/emotion/history`}
                  className="bg-white rounded-md shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <p className="font-semibold text-gray-800">Emotion History</p>
                  <p className="text-sm text-gray-500 mt-1">
                    View emotion check-ins over time
                  </p>
                </Link>

                <Link
                  href={`/dashboard/teacher/students/${studentId}/doctor-documents`}
                  className="bg-white rounded-md shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <p className="font-semibold text-gray-800">
                    Doctor&apos;s Recommendation
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    View uploaded documents and review status
                  </p>
                </Link>
              </div>
            </div>

            {/* Sidebar column */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-md shadow-sm p-6 lg:sticky lg:top-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Needs Attention Flag
                  </p>
                  {student?.flagged && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                      Flagged
                    </span>
                  )}
                </div>
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-md p-2 mb-2 outline-none focus:border-blue-400"
                >
                  <option value="">Select a reason (optional)</option>
                  {FLAG_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
                <textarea
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  placeholder="Further clarification for the principal (optional)"
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-md p-2 mb-3 outline-none focus:border-blue-400"
                />
                <button
                  onClick={toggleFlag}
                  disabled={savingFlag}
                  className={`w-full text-sm font-medium px-5 py-2.5 rounded transition-colors disabled:opacity-60 ${
                    student?.flagged
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {savingFlag
                    ? "Saving..."
                    : student?.flagged
                    ? "Clear Flag"
                    : "Flag for Attention"}
                </button>
              </div>
            </div>
          </div>

          <Modal
            open={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            title="Student Profile"
            maxWidthClassName="max-w-xl"
          >
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <ProfileRow
                label="Admission No."
                value={student?.admissionNumber || "—"}
              />
              <ProfileRow
                label="Date of Birth"
                value={
                  student?.dateOfBirth
                    ? new Date(student.dateOfBirth).toLocaleDateString()
                    : "—"
                }
              />
              <ProfileRow
                label="Gender"
                value={student?.gender || "—"}
                capitalize
              />
              <ProfileRow
                label="Communication"
                value={formatCommunication(student?.communicationLevel) || "—"}
                capitalize
              />
              <ProfileRow
                label="Parent/Guardian"
                value={student?.parentFirstName || "—"}
              />
              <ProfileRow
                label="Relationship"
                value={student?.parentRelationship || "—"}
              />
              <ProfileRow
                label="Parent Phone"
                value={student?.parentPhone || "—"}
              />
              <ProfileRow
                label="Parent Email"
                value={student?.parentEmail || "—"}
              />
              <ProfileRow
                label="Address"
                value={student?.homeCity || "—"}
                className="sm:col-span-2"
              />
            </dl>
          </Modal>
        </>
      )}
    </TeacherDashboardLayout>
  );
}

function ProfileRow({
  label,
  value,
  capitalize,
  className = "",
}: {
  label: string;
  value: string;
  capitalize?: boolean;
  className?: string;
}) {
  return (
    <div className={`border-b border-gray-50 pb-2 min-w-0 ${className}`}>
      <dt className="text-gray-500 text-xs">{label}</dt>
      <dd
        className={`text-gray-800 font-medium mt-0.5 break-words ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
