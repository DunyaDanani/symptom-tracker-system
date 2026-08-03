"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import BackButton from "@/components/BackButton";
import { categoryForGrade, gradeSlugForValue } from "@/lib/gradeTaxonomy";
import { TERMS, useAcademicTerms } from "@/lib/academicTerms";

import { API_BASE } from "@/lib/config";
interface MedicationEntry {
  name: string;
  dosage?: string;
  time?: string;
}

interface SymptomLogEntry {
  _id: string;
  symptoms: string[];
  additionalNotes?: string;
  medications?: MedicationEntry[];
  medicationNotes?: string;
  createdAt: string;
  teacher?: { name: string; role: string } | null;
  academicYear?: string;
  term?: string;
}

// A symptom log can be recorded by either a shadow teacher or an admin.
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  shadow_teacher: "Shadow Teacher",
  cao: "CAO",
  principal: "Principal",
};

function formatRecordedBy(teacher?: { name: string; role: string } | null) {
  if (!teacher?.name) return "—";
  const roleLabel = ROLE_LABELS[teacher.role] || teacher.role || "";
  return roleLabel ? `${teacher.name} (${roleLabel})` : teacher.name;
}

interface EmotionCheckinEntry {
  _id: string;
  childEmoji?: string;
  teacherEmoji?: string;
  compositeScore: number;
  createdAt: string;
  academicYear?: string;
  term?: string;
}

// Common reasons an admin flags a student for the principal's attention —
// covers the majority of cases with one click; "Other" plus the free-text
// details box handles everything else.
const FLAG_REASONS = [
  "Behavioral concern",
  "Academic concern",
  "Attendance issue",
  "Health / Medical concern",
  "Family / Home situation",
  "Other",
];

const EMOJI_OPTIONS: { value: string; icon: string; label: string }[] = [
  { value: "very_sad", icon: "😢", label: "Very sad" },
  { value: "sad", icon: "🙁", label: "Sad" },
  { value: "neutral", icon: "😐", label: "Neutral" },
  { value: "happy", icon: "🙂", label: "Happy" },
  { value: "very_happy", icon: "😄", label: "Very happy" },
];

const EMOJI_ICON: Record<string, string> = Object.fromEntries(
  EMOJI_OPTIONS.map((o) => [o.value, o.icon])
);

interface StudentRecord {
  _id: string;
  branch: string;
  admissionNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  grade: string;
  section?: string;
  diagnosis: string;
  communicationLevel: string;
  additionalNotes?: string;
  parentTitle?: string;
  parentFirstName: string;
  parentRelationship?: string;
  parentEmail: string;
  parentPhone: string;
  homeCity?: string;
  flagged?: boolean;
  flagNote?: string;
  assignedTeacher?: {
    _id: string;
    name: string;
    username: string;
    email?: string | null;
    phone?: string | null;
  } | null;
}

type ProfileForm = {
  branch: string;
  admissionNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  grade: string;
  section: string;
  diagnosis: string;
  communicationLevel: string;
  additionalNotes: string;
  parentTitle: string;
  parentFirstName: string;
  parentRelationship: string;
  parentEmail: string;
  parentPhone: string;
  homeCity: string;
};

const blankProfileForm: ProfileForm = {
  branch: "",
  admissionNumber: "",
  fullName: "",
  dateOfBirth: "",
  gender: "",
  grade: "",
  section: "",
  diagnosis: "",
  communicationLevel: "non-verbal",
  additionalNotes: "",
  parentTitle: "",
  parentFirstName: "",
  parentRelationship: "",
  parentEmail: "",
  parentPhone: "",
  homeCity: "",
};

const profileFromStudent = (s: StudentRecord): ProfileForm => ({
  branch: s.branch || "",
  admissionNumber: s.admissionNumber || "",
  fullName: s.fullName || "",
  dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : "",
  gender: s.gender || "",
  grade: s.grade || "",
  section: s.section || "",
  diagnosis: s.diagnosis || "",
  communicationLevel: s.communicationLevel || "non-verbal",
  additionalNotes: s.additionalNotes || "",
  parentTitle: s.parentTitle || "",
  parentFirstName: s.parentFirstName || "",
  parentRelationship: s.parentRelationship || "",
  parentEmail: s.parentEmail || "",
  parentPhone: s.parentPhone || "",
  homeCity: s.homeCity || "",
});

export default function AdminStudentHistoryPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const { academicYears, currentTerm } = useAcademicTerms();

  const [symptomOptions, setSymptomOptions] = useState<string[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLogEntry[]>([]);
  const [emotionCheckins, setEmotionCheckins] = useState<
    EmotionCheckinEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Flag state
  const [flagged, setFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagNote, setFlagNote] = useState("");
  const [savingFlag, setSavingFlag] = useState(false);

  // Student profile edit state
  const [branches, setBranches] = useState<string[]>([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>(blankProfileForm);
  const [profileStatus, setProfileStatus] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(
    null
  );

  // Add-symptom form state
  const [newSymptoms, setNewSymptoms] = useState<string[]>([]);
  const [newNotes, setNewNotes] = useState("");
  const [newSymptomAcademicYear, setNewSymptomAcademicYear] = useState("");
  const [newSymptomTerm, setNewSymptomTerm] = useState("");
  const [symptomStatus, setSymptomStatus] = useState("");
  const [savingSymptom, setSavingSymptom] = useState(false);

  // Add-emotion form state
  const [newChildEmoji, setNewChildEmoji] = useState("");
  const [newTeacherEmoji, setNewTeacherEmoji] = useState("");
  const [newEmotionAcademicYear, setNewEmotionAcademicYear] = useState("");
  const [newEmotionTerm, setNewEmotionTerm] = useState("");
  const [emotionStatus, setEmotionStatus] = useState("");
  const [savingEmotion, setSavingEmotion] = useState(false);

  // Symptom edit state
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editSymptoms, setEditSymptoms] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editSymptomAcademicYear, setEditSymptomAcademicYear] = useState("");
  const [editSymptomTerm, setEditSymptomTerm] = useState("");

  // Emotion edit state
  const [editingCheckinId, setEditingCheckinId] = useState<string | null>(
    null
  );
  const [editChildEmoji, setEditChildEmoji] = useState("");
  const [editTeacherEmoji, setEditTeacherEmoji] = useState("");
  const [editEmotionAcademicYear, setEditEmotionAcademicYear] = useState("");
  const [editEmotionTerm, setEditEmotionTerm] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const loadHistory = async () => {
    const res = await fetch(`${API_BASE}/students/${studentId}/history`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      setSymptomLogs(data.symptomLogs);
      setEmotionCheckins(data.emotionCheckins);
    } else {
      setError(data.message || "Could not load history");
    }
  };

  const loadStudent = async () => {
    const res = await fetch(`${API_BASE}/students`, {
      headers: authHeaders(),
    });
    const data = await res.json();
    if (data.success) {
      const found = data.students.find(
        (s: StudentRecord) => s._id === studentId
      );
      if (found) {
        setFlagged(!!found.flagged);
        setFlagNote(found.flagNote || "");
        setStudentRecord(found);
        // Don't clobber the form if the admin currently has it open —
        // only re-sync it into the form when not actively mid-edit.
        setProfileForm((prev) =>
          editingProfile ? prev : profileFromStudent(found)
        );
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [optionsRes, branchesRes] = await Promise.all([
          fetch(`${API_BASE}/students/symptom-options`, {
            headers: authHeaders(),
          }),
          fetch(`${API_BASE}/students/branches`, { headers: authHeaders() }),
        ]);
        const optionsData = await optionsRes.json();
        if (optionsData.success) setSymptomOptions(optionsData.options);

        const branchesData = await branchesRes.json();
        if (branchesData.success) setBranches(branchesData.branches);

        await Promise.all([loadHistory(), loadStudent()]);
      } catch (err) {
        console.error("Failed to load history", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Default both "add" forms to whichever term today's date falls into,
  // once the academic calendar has loaded — still fully editable, this
  // just saves a click on the common case.
  useEffect(() => {
    if (!currentTerm) return;
    setNewSymptomAcademicYear((prev) => prev || currentTerm.academicYear);
    setNewSymptomTerm((prev) => prev || currentTerm.term);
    setNewEmotionAcademicYear((prev) => prev || currentTerm.academicYear);
    setNewEmotionTerm((prev) => prev || currentTerm.term);
  }, [currentTerm]);

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
    setSavingFlag(true);
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/flag`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ flagged: !flagged, flagNote: composeFlagNote() }),
      });
      const data = await res.json();
      if (data.success) await loadStudent();
    } catch (err) {
      console.error("Failed to update flag", err);
    } finally {
      setSavingFlag(false);
    }
  };

  const updateProfileField = (field: keyof ProfileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const startEditProfile = () => {
    if (studentRecord) setProfileForm(profileFromStudent(studentRecord));
    setProfileStatus("");
    setEditingProfile(true);
  };

  const cancelEditProfile = () => {
    if (studentRecord) setProfileForm(profileFromStudent(studentRecord));
    setProfileStatus("");
    setEditingProfile(false);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus("");

    if (
      !profileForm.fullName.trim() ||
      !profileForm.dateOfBirth ||
      !profileForm.gender ||
      !profileForm.grade.trim() ||
      !profileForm.diagnosis.trim() ||
      !profileForm.parentFirstName.trim() ||
      !profileForm.parentEmail.trim() ||
      !profileForm.parentPhone.trim()
    ) {
      setProfileStatus("Please fill in all required fields.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (data.success) {
        setProfileStatus("Profile updated.");
        setEditingProfile(false);
        await loadStudent();
      } else {
        setProfileStatus(data.message || "Could not update profile.");
      }
    } catch (err) {
      console.error("Failed to update student profile", err);
      setProfileStatus("Unable to reach the server.");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleNewSymptom = (symptom: string) => {
    setNewSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const toggleEditSymptom = (symptom: string) => {
    setEditSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  const submitNewSymptomLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setSymptomStatus("");

    if (newSymptoms.length === 0) {
      setSymptomStatus("Select at least one symptom.");
      return;
    }
    if (!newSymptomAcademicYear || !newSymptomTerm) {
      setSymptomStatus("Select an academic year and term.");
      return;
    }

    setSavingSymptom(true);
    try {
      const res = await fetch(`${API_BASE}/students/${studentId}/symptoms`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          symptoms: newSymptoms,
          additionalNotes: newNotes,
          academicYear: newSymptomAcademicYear,
          term: newSymptomTerm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSymptomStatus("Symptom log added.");
        setNewSymptoms([]);
        setNewNotes("");
        await loadHistory();
      } else {
        setSymptomStatus(data.message || "Could not add symptom log.");
      }
    } catch (err) {
      console.error("Failed to add symptom log", err);
      setSymptomStatus("Unable to reach the server.");
    } finally {
      setSavingSymptom(false);
    }
  };

  const submitNewEmotionCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmotionStatus("");

    if (!newChildEmoji || !newTeacherEmoji) {
      setEmotionStatus("Select both emojis.");
      return;
    }
    if (!newEmotionAcademicYear || !newEmotionTerm) {
      setEmotionStatus("Select an academic year and term.");
      return;
    }

    setSavingEmotion(true);
    try {
      const res = await fetch(
        `${API_BASE}/students/${studentId}/emotion-checkin`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            childEmoji: newChildEmoji,
            teacherEmoji: newTeacherEmoji,
            academicYear: newEmotionAcademicYear,
            term: newEmotionTerm,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setEmotionStatus("Emotion check-in added.");
        setNewChildEmoji("");
        setNewTeacherEmoji("");
        await loadHistory();
      } else {
        setEmotionStatus(data.message || "Could not add check-in.");
      }
    } catch (err) {
      console.error("Failed to add emotion check-in", err);
      setEmotionStatus("Unable to reach the server.");
    } finally {
      setSavingEmotion(false);
    }
  };

  const startEditLog = (log: SymptomLogEntry) => {
    setEditingLogId(log._id);
    setEditSymptoms(log.symptoms);
    setEditNotes(log.additionalNotes || "");
    setEditSymptomAcademicYear(log.academicYear || "");
    setEditSymptomTerm(log.term || "");
  };

  const saveEditLog = async (logId: string) => {
    if (editSymptoms.length === 0) return;
    if (!editSymptomAcademicYear || !editSymptomTerm) return;
    try {
      const res = await fetch(`${API_BASE}/students/symptoms/${logId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          symptoms: editSymptoms,
          additionalNotes: editNotes,
          academicYear: editSymptomAcademicYear,
          term: editSymptomTerm,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingLogId(null);
        await loadHistory();
      }
    } catch (err) {
      console.error("Failed to update symptom log", err);
    }
  };

  const deleteLog = async (logId: string) => {
    if (!confirm("Delete this symptom log?")) return;
    try {
      const res = await fetch(`${API_BASE}/students/symptoms/${logId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) await loadHistory();
    } catch (err) {
      console.error("Failed to delete symptom log", err);
    }
  };

  const startEditCheckin = (c: EmotionCheckinEntry) => {
    setEditingCheckinId(c._id);
    setEditChildEmoji(c.childEmoji || "");
    setEditTeacherEmoji(c.teacherEmoji || "");
    setEditEmotionAcademicYear(c.academicYear || "");
    setEditEmotionTerm(c.term || "");
  };

  const saveEditCheckin = async (checkinId: string) => {
    if (!editChildEmoji || !editTeacherEmoji) return;
    if (!editEmotionAcademicYear || !editEmotionTerm) return;
    try {
      const res = await fetch(
        `${API_BASE}/students/emotion-checkin/${checkinId}`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            childEmoji: editChildEmoji,
            teacherEmoji: editTeacherEmoji,
            academicYear: editEmotionAcademicYear,
            term: editEmotionTerm,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setEditingCheckinId(null);
        await loadHistory();
      }
    } catch (err) {
      console.error("Failed to update emotion check-in", err);
    }
  };

  const deleteCheckin = async (checkinId: string) => {
    if (!confirm("Delete this emotion check-in?")) return;
    try {
      const res = await fetch(
        `${API_BASE}/students/emotion-checkin/${checkinId}`,
        { method: "DELETE", headers: authHeaders() }
      );
      const data = await res.json();
      if (data.success) await loadHistory();
    } catch (err) {
      console.error("Failed to delete emotion check-in", err);
    }
  };

  // The history page lives at /dashboard/admin/students/[studentId]/history,
  // but conceptually sits under Branch > Education Stage > Grade — the same
  // folders an admin drilled through on the Branches page to get here. Build
  // that path from the student's actual branch/grade so the breadcrumb
  // reflects it instead of the literal (meaningless) URL segments.
  let middleCrumbs: { href: string; label: string }[] | undefined;
  if (studentRecord?.branch) {
    const branchHref = `/dashboard/admin/students/branch/${encodeURIComponent(
      studentRecord.branch
    )}`;
    middleCrumbs = [{ href: branchHref, label: studentRecord.branch }];

    const stage = categoryForGrade(studentRecord.grade);
    const gradeSlug = gradeSlugForValue(studentRecord.grade);
    if (stage) {
      const stageHref = `${branchHref}/${stage.slug}`;
      middleCrumbs.push({ href: stageHref, label: stage.label });

      if (gradeSlug) {
        middleCrumbs.push({
          href: `${stageHref}/${gradeSlug}`,
          label: studentRecord.grade,
        });
      }
    }
  }

  return (
    <DashboardLayout
      breadcrumbLabels={
        studentRecord
          ? {
              [studentId]: studentRecord.fullName,
            }
          : undefined
      }
      breadcrumbMiddleCrumbs={middleCrumbs}
    >
      <BackButton />

      <div className="flex items-center justify-between mt-2 mb-8">
        <h1 className="text-2xl font-semibold text-blue-900">
          Student History
        </h1>
        <Link
          href={`/dashboard/print-report/${studentId}`}
          target="_blank"
          className="text-sm bg-blue-900 hover:bg-blue-800 text-white rounded-full px-4 py-1.5"
        >
          Print Report
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          <div className="bg-white rounded-md shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                  Needs Attention Flag
                </p>
                {flagged && (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                    Flagged
                  </span>
                )}
              </div>
              <button
                onClick={toggleFlag}
                disabled={savingFlag}
                className={`text-sm font-medium px-5 py-2.5 rounded transition-colors disabled:opacity-60 shrink-0 ${
                  flagged
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {savingFlag ? "Saving..." : flagged ? "Clear Flag" : "Flag for Attention"}
              </button>
            </div>
            <div className="flex gap-3 flex-wrap">
              <select
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="text-sm border border-gray-200 rounded-md p-2 outline-none focus:border-blue-400 min-w-[220px]"
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
                rows={1}
                className="flex-1 min-w-[240px] text-sm border border-gray-200 rounded-md p-2 outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="bg-white rounded-md shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">
                Student Profile
              </h2>
              {!editingProfile && (
                <button
                  onClick={startEditProfile}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {editingProfile ? (
              <form onSubmit={saveProfile}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ProfileField label="Branch">
                    <select
                      className="profile-input"
                      value={profileForm.branch}
                      onChange={(e) =>
                        updateProfileField("branch", e.target.value)
                      }
                    >
                      {branches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </ProfileField>
                  <ProfileField label="Admission Number">
                    <input
                      className="profile-input"
                      value={profileForm.admissionNumber}
                      onChange={(e) =>
                        updateProfileField("admissionNumber", e.target.value)
                      }
                    />
                  </ProfileField>
                  <ProfileField label="Full Name">
                    <input
                      className="profile-input"
                      value={profileForm.fullName}
                      onChange={(e) =>
                        updateProfileField("fullName", e.target.value)
                      }
                    />
                  </ProfileField>
                  <ProfileField label="Date of Birth">
                    <input
                      type="date"
                      className="profile-input"
                      value={profileForm.dateOfBirth}
                      onChange={(e) =>
                        updateProfileField("dateOfBirth", e.target.value)
                      }
                    />
                  </ProfileField>
                  <ProfileField label="Gender">
                    <select
                      className="profile-input"
                      value={profileForm.gender}
                      onChange={(e) =>
                        updateProfileField("gender", e.target.value)
                      }
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </ProfileField>
                  <ProfileField label="Grade / Class">
                    <input
                      className="profile-input"
                      value={profileForm.grade}
                      onChange={(e) =>
                        updateProfileField("grade", e.target.value)
                      }
                    />
                  </ProfileField>
                  <ProfileField label="Section">
                    <select
                      className="profile-input"
                      value={profileForm.section}
                      onChange={(e) =>
                        updateProfileField("section", e.target.value)
                      }
                    >
                      <option value="">Select</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </ProfileField>
                  <ProfileField label="Primary Diagnosis">
                    <input
                      className="profile-input"
                      value={profileForm.diagnosis}
                      onChange={(e) =>
                        updateProfileField("diagnosis", e.target.value)
                      }
                    />
                  </ProfileField>
                  <ProfileField label="Communication Level">
                    <select
                      className="profile-input"
                      value={profileForm.communicationLevel}
                      onChange={(e) =>
                        updateProfileField(
                          "communicationLevel",
                          e.target.value
                        )
                      }
                    >
                      <option value="non-verbal">Non-verbal</option>
                      <option value="partially-verbal">
                        Partially verbal
                      </option>
                      <option value="verbal">Verbal</option>
                    </select>
                  </ProfileField>
                  <ProfileField label="Address">
                    <input
                      className="profile-input"
                      value={profileForm.homeCity}
                      onChange={(e) =>
                        updateProfileField("homeCity", e.target.value)
                      }
                    />
                  </ProfileField>
                </div>

                <ProfileField label="Additional Notes" className="mt-4">
                  <textarea
                    rows={2}
                    className="profile-input"
                    value={profileForm.additionalNotes}
                    onChange={(e) =>
                      updateProfileField("additionalNotes", e.target.value)
                    }
                  />
                </ProfileField>

                <p className="text-xs font-semibold text-gray-400 mt-6 mb-3 tracking-wide">
                  PARENT / GUARDIAN
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ProfileField label="Title">
                    <select
                      className="profile-input"
                      value={profileForm.parentTitle}
                      onChange={(e) =>
                        updateProfileField("parentTitle", e.target.value)
                      }
                    >
                      <option value="">Select</option>
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Miss">Miss</option>
                    </select>
                  </ProfileField>
                  <ProfileField label="Parent Name">
                    <input
                      className="profile-input"
                      value={profileForm.parentFirstName}
                      onChange={(e) =>
                        updateProfileField("parentFirstName", e.target.value)
                      }
                    />
                  </ProfileField>
                  <ProfileField label="Relationship">
                    <input
                      className="profile-input"
                      placeholder="e.g. Mother"
                      value={profileForm.parentRelationship}
                      onChange={(e) =>
                        updateProfileField(
                          "parentRelationship",
                          e.target.value
                        )
                      }
                    />
                  </ProfileField>
                  <ProfileField label="Parent Email">
                    <input
                      type="email"
                      className="profile-input"
                      value={profileForm.parentEmail}
                      onChange={(e) =>
                        updateProfileField("parentEmail", e.target.value)
                      }
                    />
                  </ProfileField>
                  <ProfileField label="Parent Phone">
                    <input
                      className="profile-input"
                      value={profileForm.parentPhone}
                      onChange={(e) =>
                        updateProfileField("parentPhone", e.target.value)
                      }
                    />
                  </ProfileField>
                </div>

                {profileStatus && (
                  <p className="text-xs text-gray-500 mt-4">{profileStatus}</p>
                )}

                <div className="flex gap-2 mt-5">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded disabled:opacity-60"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditProfile}
                    className="text-sm text-gray-500 px-5 py-2.5"
                  >
                    Cancel
                  </button>
                </div>

                <style jsx>{`
                  .profile-input {
                    width: 100%;
                    font-size: 0.875rem;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.375rem;
                    padding: 0.5rem;
                    outline: none;
                  }
                  .profile-input:focus {
                    border-color: #60a5fa;
                  }
                `}</style>
              </form>
            ) : studentRecord ? (
              <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 text-sm">
                <InfoRow label="Branch" value={studentRecord.branch} />
                <InfoRow
                  label="Admission #"
                  value={studentRecord.admissionNumber}
                />
                <InfoRow
                  label="Name"
                  value={studentRecord.fullName}
                />
                <InfoRow
                  label="Date of Birth"
                  value={
                    studentRecord.dateOfBirth
                      ? new Date(
                          studentRecord.dateOfBirth
                        ).toLocaleDateString()
                      : "—"
                  }
                />
                <InfoRow label="Gender" value={studentRecord.gender} />
                <InfoRow
                  label="Grade / Section"
                  value={`${studentRecord.grade}${
                    studentRecord.section ? ` · ${studentRecord.section}` : ""
                  }`}
                />
                <InfoRow label="Diagnosis" value={studentRecord.diagnosis} />
                <InfoRow
                  label="Communication"
                  value={studentRecord.communicationLevel}
                />
                <InfoRow
                  label="Address"
                  value={studentRecord.homeCity || "—"}
                />
                <InfoRow
                  label="Parent"
                  value={`${
                    studentRecord.parentTitle
                      ? `${studentRecord.parentTitle} `
                      : ""
                  }${studentRecord.parentFirstName}${
                    studentRecord.parentRelationship
                      ? ` (${studentRecord.parentRelationship})`
                      : ""
                  }`}
                />
                <InfoRow
                  label="Parent Email"
                  value={studentRecord.parentEmail}
                />
                <InfoRow
                  label="Parent Phone"
                  value={studentRecord.parentPhone}
                />
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-gray-400">Shadow Teacher</p>
                  <p className="text-gray-800 font-medium text-sm">
                    {studentRecord.assignedTeacher?.name || "Unassigned"}
                  </p>
                </div>
                {studentRecord.assignedTeacher && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-400 tracking-wide">
                      Contact Shadow Teacher:
                    </span>
                    {studentRecord.assignedTeacher.phone && (
                      <a
                        href={`tel:${studentRecord.assignedTeacher.phone}`}
                        className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-full font-medium"
                      >
                        📞 {studentRecord.assignedTeacher.phone}
                      </a>
                    )}
                    {studentRecord.assignedTeacher.email && (
                      <a
                        href={`mailto:${studentRecord.assignedTeacher.email}`}
                        className="text-xs bg-sky-50 text-sky-700 hover:bg-sky-100 px-3 py-1.5 rounded-full font-medium"
                      >
                        ✉️ {studentRecord.assignedTeacher.email}
                      </a>
                    )}
                    {!studentRecord.assignedTeacher.phone &&
                      !studentRecord.assignedTeacher.email && (
                        <span className="text-xs text-gray-400">
                          No contact details on file
                        </span>
                      )}
                  </div>
                )}
              </div>
              </>
            ) : (
              <p className="text-gray-400 text-sm">
                Student profile unavailable.
              </p>
            )}
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Symptom logs */}
          <div className="flex flex-col gap-6">
            <form
              onSubmit={submitNewSymptomLog}
              className="bg-white rounded-md shadow-sm p-6"
            >
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Add Symptom Log
              </h2>

              <div className="flex flex-col gap-2 mb-4">
                {symptomOptions.map((symptom) => (
                  <label
                    key={symptom}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={newSymptoms.includes(symptom)}
                      onChange={() => toggleNewSymptom(symptom)}
                      className="mt-0.5 rounded border-gray-300"
                    />
                    {symptom}
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <select
                  value={newSymptomAcademicYear}
                  onChange={(e) => setNewSymptomAcademicYear(e.target.value)}
                  className="text-sm border border-gray-200 rounded-md px-2 py-2 outline-none focus:border-blue-400"
                >
                  <option value="">Academic Year</option>
                  {academicYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value={newSymptomTerm}
                  onChange={(e) => setNewSymptomTerm(e.target.value)}
                  className="text-sm border border-gray-200 rounded-md px-2 py-2 outline-none focus:border-blue-400"
                >
                  <option value="">Term</option>
                  {TERMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Additional notes (optional)"
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-md p-2 mb-4 outline-none focus:border-blue-400"
              />

              {symptomStatus && (
                <p className="text-xs text-gray-500 mb-3">{symptomStatus}</p>
              )}

              <button
                type="submit"
                disabled={savingSymptom}
                className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded disabled:opacity-60"
              >
                {savingSymptom ? "Saving..." : "Add Symptom Log"}
              </button>
            </form>

            <div className="bg-white rounded-md shadow-sm overflow-hidden">
              <h2 className="text-sm font-semibold text-gray-700 p-6 pb-0">
                Symptom Logs
              </h2>
              <div className="divide-y divide-gray-50 mt-4">
                {symptomLogs.length === 0 ? (
                  <p className="px-6 py-4 text-gray-400 text-sm">
                    No symptom logs yet.
                  </p>
                ) : (
                  symptomLogs.map((log) =>
                    editingLogId === log._id ? (
                      <div key={log._id} className="px-6 py-4">
                        <div className="flex flex-col gap-1 mb-3">
                          {symptomOptions.map((symptom) => (
                            <label
                              key={symptom}
                              className="flex items-start gap-2 text-sm text-gray-700"
                            >
                              <input
                                type="checkbox"
                                checked={editSymptoms.includes(symptom)}
                                onChange={() => toggleEditSymptom(symptom)}
                                className="mt-0.5 rounded border-gray-300"
                              />
                              {symptom}
                            </label>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <select
                            value={editSymptomAcademicYear}
                            onChange={(e) => setEditSymptomAcademicYear(e.target.value)}
                            className="text-sm border border-gray-200 rounded-md px-2 py-2 outline-none focus:border-blue-400"
                          >
                            <option value="">Academic Year</option>
                            {academicYears.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editSymptomTerm}
                            onChange={(e) => setEditSymptomTerm(e.target.value)}
                            className="text-sm border border-gray-200 rounded-md px-2 py-2 outline-none focus:border-blue-400"
                          >
                            <option value="">Term</option>
                            {TERMS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={2}
                          className="w-full text-sm border border-gray-200 rounded-md p-2 mb-3 outline-none focus:border-blue-400"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEditLog(log._id)}
                            className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium px-4 py-2 rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingLogId(null)}
                            className="text-xs text-gray-500 px-4 py-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={log._id}
                        className="px-6 py-4 flex items-start justify-between gap-4"
                      >
                        <div>
                          <p className="text-xs text-gray-400">
                            {new Date(log.createdAt).toLocaleString()}
                            {" · Recorded by "}
                            {formatRecordedBy(log.teacher)}
                            {log.academicYear && log.term && (
                              <>
                                {" · "}
                                <span className="text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">
                                  {log.academicYear} {log.term}
                                </span>
                              </>
                            )}
                          </p>
                          <p className="text-sm text-gray-800 mt-1">
                            {log.symptoms.join(", ")}
                          </p>
                          {log.additionalNotes && (
                            <p className="text-xs text-gray-400 mt-1">
                              {log.additionalNotes}
                            </p>
                          )}
                          {log.medications && log.medications.length > 0 && (
                            <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1 inline-block">
                              💊{" "}
                              {log.medications
                                .map(
                                  (m) =>
                                    `${m.name}${m.dosage ? ` (${m.dosage})` : ""}`
                                )
                                .join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button
                            onClick={() => startEditLog(log)}
                            className="text-gray-300 hover:text-blue-600 transition-colors"
                            aria-label="Edit symptom log"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteLog(log._id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                            aria-label="Delete symptom log"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          </div>

          {/* Emotion check-ins */}
          <div className="flex flex-col gap-6">
            <form
              onSubmit={submitNewEmotionCheckin}
              className="bg-white rounded-md shadow-sm p-6"
            >
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Add Emotion Check-in
              </h2>

              <p className="text-xs text-gray-500 mb-2">Child&apos;s emoji</p>
              <div className="flex gap-2 mb-4">
                {EMOJI_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={`new-child-${opt.value}`}
                    onClick={() => setNewChildEmoji(opt.value)}
                    title={opt.label}
                    className={`w-10 h-10 rounded-full text-lg flex items-center justify-center border transition-colors ${
                      newChildEmoji === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500 mb-2">Teacher&apos;s emoji</p>
              <div className="flex gap-2 mb-4">
                {EMOJI_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={`new-teacher-${opt.value}`}
                    onClick={() => setNewTeacherEmoji(opt.value)}
                    title={opt.label}
                    className={`w-10 h-10 rounded-full text-lg flex items-center justify-center border transition-colors ${
                      newTeacherEmoji === opt.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    }`}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <select
                  value={newEmotionAcademicYear}
                  onChange={(e) => setNewEmotionAcademicYear(e.target.value)}
                  className="text-sm border border-gray-200 rounded-md px-2 py-2 outline-none focus:border-blue-400"
                >
                  <option value="">Academic Year</option>
                  {academicYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value={newEmotionTerm}
                  onChange={(e) => setNewEmotionTerm(e.target.value)}
                  className="text-sm border border-gray-200 rounded-md px-2 py-2 outline-none focus:border-blue-400"
                >
                  <option value="">Term</option>
                  {TERMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {emotionStatus && (
                <p className="text-xs text-gray-500 mb-3">{emotionStatus}</p>
              )}

              <button
                type="submit"
                disabled={savingEmotion}
                className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-5 py-2.5 rounded disabled:opacity-60"
              >
                {savingEmotion ? "Saving..." : "Add Check-in"}
              </button>
            </form>

            <div className="bg-white rounded-md shadow-sm overflow-hidden">
              <h2 className="text-sm font-semibold text-gray-700 p-6 pb-0">
                Emotion Check-ins
              </h2>
              <div className="divide-y divide-gray-50 mt-4">
                {emotionCheckins.length === 0 ? (
                  <p className="px-6 py-4 text-gray-400 text-sm">
                    No check-ins yet.
                  </p>
                ) : (
                  emotionCheckins.map((c) =>
                    editingCheckinId === c._id ? (
                      <div key={c._id} className="px-6 py-4">
                        <p className="text-xs text-gray-500 mb-2">Child</p>
                        <div className="flex gap-2 mb-3">
                          {EMOJI_OPTIONS.map((opt) => (
                            <button
                              type="button"
                              key={`edit-child-${opt.value}`}
                              onClick={() => setEditChildEmoji(opt.value)}
                              className={`w-9 h-9 rounded-full text-base flex items-center justify-center border transition-colors ${
                                editChildEmoji === opt.value
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200"
                              }`}
                            >
                              {opt.icon}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mb-2">Teacher</p>
                        <div className="flex gap-2 mb-3">
                          {EMOJI_OPTIONS.map((opt) => (
                            <button
                              type="button"
                              key={`edit-teacher-${opt.value}`}
                              onClick={() => setEditTeacherEmoji(opt.value)}
                              className={`w-9 h-9 rounded-full text-base flex items-center justify-center border transition-colors ${
                                editTeacherEmoji === opt.value
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200"
                              }`}
                            >
                              {opt.icon}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <select
                            value={editEmotionAcademicYear}
                            onChange={(e) => setEditEmotionAcademicYear(e.target.value)}
                            className="text-sm border border-gray-200 rounded-md px-2 py-2 outline-none focus:border-blue-400"
                          >
                            <option value="">Academic Year</option>
                            {academicYears.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editEmotionTerm}
                            onChange={(e) => setEditEmotionTerm(e.target.value)}
                            className="text-sm border border-gray-200 rounded-md px-2 py-2 outline-none focus:border-blue-400"
                          >
                            <option value="">Term</option>
                            {TERMS.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEditCheckin(c._id)}
                            className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium px-4 py-2 rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCheckinId(null)}
                            className="text-xs text-gray-500 px-4 py-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={c._id}
                        className="px-6 py-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-xs text-gray-400">
                            {new Date(c.createdAt).toLocaleString()}
                            {c.academicYear && c.term && (
                              <>
                                {" · "}
                                <span className="text-blue-700 bg-blue-50 rounded px-1.5 py-0.5">
                                  {c.academicYear} {c.term}
                                </span>
                              </>
                            )}
                          </p>
                          <p className="text-lg mt-1">
                            {(c.childEmoji && EMOJI_ICON[c.childEmoji]) || "—"}{" "}
                            {(c.teacherEmoji && EMOJI_ICON[c.teacherEmoji]) || "—"}{" "}
                            <span className="text-sm text-gray-600 align-middle">
                              ({c.compositeScore})
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button
                            onClick={() => startEditCheckin(c)}
                            className="text-gray-300 hover:text-blue-600 transition-colors"
                            aria-label="Edit emotion check-in"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteCheckin(c._id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                            aria-label="Delete emotion check-in"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </DashboardLayout>
  );
}

function ProfileField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-gray-800">{value || "—"}</p>
    </div>
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
