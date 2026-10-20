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

          {/* Section 1 — the child's records, each its own clear tile */}
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Student records
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <RecordTile
              href={`/dashboard/teacher/students/${studentId}/symptoms/history`}
              title="Symptom History"
              description="Symptoms and medication you've logged, with dates and notes."
              tint="bg-rose-50 text-rose-600"
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />}
            />
            <RecordTile
              href={`/dashboard/teacher/students/${studentId}/emotion/history`}
              title="Emotion History"
              description="Past emotion check-ins, scores and the suggested activities."
              tint="bg-amber-50 text-amber-600"
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
            />
            <RecordTile
              href={`/dashboard/teacher/students/${studentId}/doctor-documents`}
              title="Doctor's Recommendation"
              description="Documents from the child's doctor and their review status."
              tint="bg-sky-50 text-sky-600"
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
            />
          </div>

          {/* Section 2 — flagging, separate so it isn't mistaken for a record */}
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Flag for the principal&apos;s attention
          </h2>
          <div
            className={`bg-white rounded-md shadow-sm p-6 border-l-4 ${
              student?.flagged ? "border-red-500" : "border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <p className="text-sm text-gray-600 max-w-2xl">
                {student?.flagged
                  ? "This student is currently flagged. The branch principal can see it on their Needs Attention list. Clear the flag once the concern is resolved."
                  : "Raise a concern you want the branch principal to look at. It appears on their Needs Attention list and in their alerts."}
              </p>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  student?.flagged ? "text-red-600 bg-red-50" : "text-gray-500 bg-gray-100"
                }`}
              >
                {student?.flagged ? "Flagged" : "Not flagged"}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr_auto] gap-3 items-start">
              <select
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                aria-label="Reason"
                className="w-full min-h-10 text-sm border border-gray-200 rounded px-3 outline-none focus:border-blue-400 bg-white"
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
                className="w-full text-sm border border-gray-200 rounded px-3 py-2 outline-none focus:border-blue-400"
              />
              <button
                onClick={toggleFlag}
                disabled={savingFlag}
                className={student?.flagged ? BTN_SECONDARY : BTN_DANGER}
              >
                {savingFlag
                  ? "Saving..."
                  : student?.flagged
                  ? "Clear Flag"
                  : "Flag for Attention"}
              </button>
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

// One of the child's record pages, shown as a tile with its own icon and
// colour so the three are easy to tell apart at a glance.
function RecordTile({
  href,
  title,
  description,
  tint,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  tint: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group bg-white rounded-md shadow-sm p-6 flex flex-col h-full border border-transparent hover:border-blue-200 hover:shadow-md transition"
    >
      <span className={`w-11 h-11 rounded-full flex items-center justify-center ${tint}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
          {icon}
        </svg>
      </span>
      <p className="font-semibold text-gray-800 mt-4">{title}</p>
      <p className="text-sm text-gray-500 mt-1 flex-1">{description}</p>
      <p className="text-sm font-medium text-blue-700 mt-4 group-hover:underline">Open →</p>
    </Link>
  );
}
