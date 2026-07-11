"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import BackButton from "@/components/BackButton";
import { GRADE_TAXONOMY, getCategory } from "@/lib/gradeTaxonomy";
import { isValidEmail } from "@/lib/validation";
import { API_BASE } from "@/lib/config";

interface Teacher {
  _id: string;
  name: string;
  username: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
}

interface Credentials {
  student?: { username: string; password: string };
  parent?: { username: string; password: string };
  teacher?: { username: string; password: string; emailSent?: boolean };
}

const REQUIRED_LABELS: Record<string, string> = {
  admissionNumber: "Admission Number",
  firstName: "First Name",
  lastName: "Last Name",
  dateOfBirth: "Date of Birth",
  gender: "Gender",
  grade: "Grade / Class",
  diagnosis: "Primary diagnosis",
  parentFirstName: "Parent First Name",
  parentRelationship: "Relationship",
  parentEmail: "Parent Email",
  parentPhone: "Parent Phone",
};

const steps = ["Student info", "Parent info", "Assign Teacher", "Review & confirm"];

export default function AdmitStudentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [credentials, setCredentials] = useState<Credentials>({});
  const [emailSent, setEmailSent] = useState(false);

  // Teacher list + search
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [showAddTeacher, setShowAddTeacher] = useState(false);

  // Branch list
  const [branches, setBranches] = useState<string[]>([]);

  const [form, setForm] = useState({
    branch: "",
    admissionNumber: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    categorySlug: "",
    grade: "",
    section: "",
    diagnosis: "",
    communicationLevel: "non-verbal",
    additionalNotes: "",
    parentFirstName: "",
    parentRelationship: "",
    parentEmail: "",
    parentPhone: "",
    homeCity: "",
    assignedTeacherId: "",
    newTeacher: {
      name: "",
      age: "",
      qualification: "",
      specialization: "",
      experienceYears: "",
      email: "",
    },
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (step === 3) fetchTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const fetchBranches = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/students/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBranches(data.branches);
        setForm((prev) => ({ ...prev, branch: prev.branch || data.branches[0] }));
      }
    } catch (err) {
      console.error("Failed to load branches", err);
    }
  };

  const fetchTeachers = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/students/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setTeachers(data.teachers);
    } catch (err) {
      console.error("Failed to load teachers", err);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateNewTeacherField = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      newTeacher: { ...prev.newTeacher, [field]: value },
    }));
  };

  // Returns an error message if the given step is missing required fields,
  // or "" if the step is complete. Keeps the wizard from letting someone
  // click through to Review with blank name/grade/DOB etc.
  const validateStep = (stepNum: number): string => {
    if (stepNum === 1) {
      const missing: string[] = [];
      if (!form.admissionNumber.trim()) missing.push(REQUIRED_LABELS.admissionNumber);
      if (!form.firstName.trim()) missing.push(REQUIRED_LABELS.firstName);
      if (!form.lastName.trim()) missing.push(REQUIRED_LABELS.lastName);
      if (!form.dateOfBirth) missing.push(REQUIRED_LABELS.dateOfBirth);
      if (!form.gender) missing.push(REQUIRED_LABELS.gender);
      if (!form.grade) missing.push(REQUIRED_LABELS.grade);
      if (!form.diagnosis.trim()) missing.push(REQUIRED_LABELS.diagnosis);
      if (missing.length > 0) {
        return `Please fill in: ${missing.join(", ")}`;
      }
    }
    if (stepNum === 2) {
      const missing: string[] = [];
      if (!form.parentFirstName.trim()) missing.push(REQUIRED_LABELS.parentFirstName);
      if (!form.parentRelationship) missing.push(REQUIRED_LABELS.parentRelationship);
      if (!form.parentEmail.trim()) missing.push(REQUIRED_LABELS.parentEmail);
      if (!form.parentPhone.trim()) missing.push(REQUIRED_LABELS.parentPhone);
      if (missing.length > 0) {
        return `Please fill in: ${missing.join(", ")}`;
      }
      if (!isValidEmail(form.parentEmail)) {
        return "Please enter a valid email address (e.g. name@example.com)";
      }
    }
    return "";
  };

  const goNext = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, 4));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSelectTeacher = (id: string) => {
    setForm((prev) => ({
      ...prev,
      assignedTeacherId: id,
      newTeacher: { name: "", age: "", qualification: "", specialization: "", experienceYears: "", email: "" },
    }));
  };

  const handleConfirm = async () => {
    // Re-validate every step before the final submit — someone could have
    // reached step 4 via Back/Next without ever tripping goNext's checks
    // (e.g. browser back/forward), so don't rely solely on per-step gating.
    const step1Error = validateStep(1);
    if (step1Error) {
      setError(step1Error);
      setStep(1);
      return;
    }
    const step2Error = validateStep(2);
    if (step2Error) {
      setError(step2Error);
      setStep(2);
      return;
    }

    setSubmitting(true);
    setError("");
    const token = localStorage.getItem("token");

    const payload: any = {
      branch: form.branch,
      admissionNumber: form.admissionNumber,
      firstName: form.firstName,
      lastName: form.lastName,
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      grade: form.grade,
      section: form.section,
      diagnosis: form.diagnosis,
      communicationLevel: form.communicationLevel,
      additionalNotes: form.additionalNotes,
      parentFirstName: form.parentFirstName,
      parentRelationship: form.parentRelationship,
      parentEmail: form.parentEmail,
      parentPhone: form.parentPhone,
      homeCity: form.homeCity,
    };

    if (form.assignedTeacherId) {
      payload.assignedTeacherId = form.assignedTeacherId;
    } else if (form.newTeacher.name) {
      payload.newTeacher = {
        name: form.newTeacher.name,
        age: form.newTeacher.age ? Number(form.newTeacher.age) : undefined,
        qualification: form.newTeacher.qualification,
        specialization: form.newTeacher.specialization,
        experienceYears: form.newTeacher.experienceYears
          ? Number(form.newTeacher.experienceYears)
          : 0,
        email: form.newTeacher.email.trim(),
      };
    }

    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        const message = data.message || "Failed to register student";
        setError(message);
        // If the backend rejected on a missing student-side field, jump
        // back to step 1 so the person isn't left staring at step 4
        // wondering what's wrong.
        if (/missing required/i.test(message)) {
          setStep(1);
        }
        setSubmitting(false);
        return;
      }

      setCredentials(data.credentials);
      setEmailSent(Boolean(data.emailSent));
      setSuccess(true);
    } catch (err) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      branch: branches[0] || "",
      admissionNumber: "",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      categorySlug: "",
      grade: "",
      section: "",
      diagnosis: "",
      communicationLevel: "non-verbal",
      additionalNotes: "",
      parentFirstName: "",
      parentRelationship: "",
      parentEmail: "",
      parentPhone: "",
      homeCity: "",
      assignedTeacherId: "",
      newTeacher: { name: "", age: "", qualification: "", specialization: "", experienceYears: "", email: "" },
    });
    setCredentials({});
    setEmailSent(false);
    setSuccess(false);
    setStep(1);
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      t.specialization.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const selectedTeacher = teachers.find((t) => t._id === form.assignedTeacherId);

  if (success) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl">
          <h1 className="text-xl font-semibold text-gray-800 mb-6">
            Admit new student
          </h1>

          <div className="bg-white rounded-md shadow-sm p-6">
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded p-4 mb-6">
              {form.firstName} {form.lastName} has been admitted successfully.{" "}
              {emailSent
                ? `Credentials emailed to ${form.parentEmail}.`
                : `Could not email credentials to ${form.parentEmail} — please share the credentials below with the parent directly.`}
              {selectedTeacher ? ` Shadow teacher ${selectedTeacher.name} assigned.` : ""}
            </div>
            {!emailSent && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded p-3 mb-6">
                Email delivery failed or is not configured. The account was
                still created — copy the credentials below and share them
                with the parent yourself.
              </div>
            )}

            <h2 className="font-semibold text-gray-700 mb-4">
              Student profile created
            </h2>

            <div className="space-y-3 text-sm">
              <CredentialRow
                label="Admission Number"
                value={form.admissionNumber}
              />
              <CredentialRow
                label="Student Username"
                value={credentials.student?.username}
              />
              <CredentialRow
                label="Student Password"
                value={credentials.student?.password}
              />
              <CredentialRow
                label="Parent Username"
                value={credentials.parent?.username}
              />
              <CredentialRow
                label="Parent Password"
                value={credentials.parent?.password}
              />
              {credentials.teacher && (
                <>
                  <CredentialRow
                    label="New Teacher Username"
                    value={credentials.teacher.username}
                  />
                  <CredentialRow
                    label="New Teacher Password"
                    value={credentials.teacher.password}
                  />
                  {form.newTeacher.email.trim() && (
                    <div className="flex justify-between border-b border-gray-100 pb-2">
                      <span className="text-gray-500">Teacher email</span>
                      <span
                        className={
                          credentials.teacher.emailSent
                            ? "text-green-600 font-medium"
                            : "text-amber-600 font-medium"
                        }
                      >
                        {credentials.teacher.emailSent
                          ? "Sent"
                          : "Not sent — share manually"}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-500">Status</span>
                <span className="text-green-600 font-medium">Active</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => router.push("/dashboard/admin")}
                className="border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded hover:bg-gray-50"
              >
                View all students
              </button>
              <button
                onClick={resetForm}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
              >
                + Admit another student
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <BackButton />
      <div className="max-w-3xl mt-2">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">
          Admit new student
        </h1>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          {steps.map((label, idx) => {
            const num = idx + 1;
            const isActive = num === step;
            const isDone = num < step;
            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                    isActive || isDone
                      ? "bg-sky-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {num}
                </div>
                <span
                  className={isActive ? "text-gray-800 font-medium" : "text-gray-400"}
                >
                  {label}
                </span>
                {idx < steps.length - 1 && (
                  <span className="w-8 h-px bg-gray-300 mx-1" />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-md shadow-sm p-6">
          {error && (
            <p className="text-sm text-red-500 mb-4">{error}</p>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4">
                Student Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Branch" className="col-span-2">
                  <select
                    className="input"
                    value={form.branch}
                    onChange={(e) => updateField("branch", e.target.value)}
                  >
                    {branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Admission Number">
                  <input
                    className="input"
                    placeholder="e.g. OKI2026045"
                    value={form.admissionNumber}
                    onChange={(e) => updateField("admissionNumber", e.target.value)}
                  />
                </Field>
                <Field label="First Name">
                  <input
                    className="input"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                  />
                </Field>
                <Field label="Last Name">
                  <input
                    className="input"
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                  />
                </Field>
                <Field label="Date of Birth">
                  <input
                    type="date"
                    className="input"
                    value={form.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  />
                </Field>
                <Field label="Gender">
                  <select
                    className="input"
                    value={form.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field label="Education Stage">
                  <select
                    className="input"
                    value={form.categorySlug}
                    onChange={(e) => {
                      const categorySlug = e.target.value;
                      setForm((prev) => ({ ...prev, categorySlug, grade: "" }));
                    }}
                  >
                    <option value="">Select</option>
                    {GRADE_TAXONOMY.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Grade / Class">
                  <select
                    className="input"
                    value={form.grade}
                    disabled={!form.categorySlug}
                    onChange={(e) => updateField("grade", e.target.value)}
                  >
                    <option value="">
                      {form.categorySlug ? "Select" : "Choose education stage first"}
                    </option>
                    {getCategory(form.categorySlug)?.grades.map((g) => (
                      <option key={g.slug} value={g.label}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Section">
                  <input
                    className="input"
                    placeholder="e.g. A"
                    value={form.section}
                    onChange={(e) => updateField("section", e.target.value)}
                  />
                </Field>
              </div>

              <p className="text-xs font-semibold text-gray-400 mt-6 mb-3 tracking-wide">
                SPECIAL NEEDS PROFILE
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Primary diagnosis">
                  <input
                    className="input"
                    placeholder="e.g. ASD"
                    value={form.diagnosis}
                    onChange={(e) => updateField("diagnosis", e.target.value)}
                  />
                </Field>
                <Field label="Communication level">
                  <select
                    className="input"
                    value={form.communicationLevel}
                    onChange={(e) =>
                      updateField("communicationLevel", e.target.value)
                    }
                  >
                    <option value="non-verbal">Non-verbal</option>
                    <option value="partially-verbal">Partially verbal</option>
                    <option value="verbal">Verbal</option>
                  </select>
                </Field>
              </div>

              <Field label="Additional notes" className="mt-4">
                <textarea
                  className="input h-20"
                  placeholder="Behavioral patterns, sensory needs, medical alerts..."
                  value={form.additionalNotes}
                  onChange={(e) => updateField("additionalNotes", e.target.value)}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4">
                Parent / Guardian Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name">
                  <input
                    className="input"
                    value={form.parentFirstName}
                    onChange={(e) => updateField("parentFirstName", e.target.value)}
                  />
                </Field>
                <Field label="Relationship">
                  <select
                    className="input"
                    value={form.parentRelationship}
                    onChange={(e) => updateField("parentRelationship", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="Mother">Mother</option>
                    <option value="Father">Father</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </Field>
                <Field label="Email Address">
                  <input
                    type="email"
                    className="input"
                    value={form.parentEmail}
                    onChange={(e) => updateField("parentEmail", e.target.value)}
                  />
                </Field>
                <Field label="Phone Number">
                  <input
                    className="input"
                    placeholder="94+"
                    value={form.parentPhone}
                    onChange={(e) => updateField("parentPhone", e.target.value)}
                  />
                </Field>
                <Field label="Home City">
                  <input
                    className="input"
                    value={form.homeCity}
                    onChange={(e) => updateField("homeCity", e.target.value)}
                  />
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4">
                Available Shadow teacher
              </h2>

              <input
                className="input mb-4"
                placeholder="Search teacher by name or specialization"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
              />

              <div className="space-y-3 mb-4">
                {filteredTeachers.length === 0 && (
                  <p className="text-sm text-gray-400">
                    No shadow teachers yet — add one below.
                  </p>
                )}
                {filteredTeachers.map((t) => {
                  const isSelected = form.assignedTeacherId === t._id;
                  return (
                    <div
                      key={t._id}
                      className="flex items-center justify-between border border-gray-200 rounded p-3"
                    >
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          {t.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t.specialization || "General"} ·{" "}
                          {t.experienceYears} years experience
                        </p>
                      </div>
                      <button
                        onClick={() => handleSelectTeacher(t._id)}
                        className={`text-xs font-medium px-4 py-1.5 rounded ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-sky-100 text-sky-700 hover:bg-sky-200"
                        }`}
                      >
                        {isSelected ? "Selected" : "Available"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setShowAddTeacher((v) => !v)}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium py-2.5 rounded mb-4"
              >
                Add new shadow teacher {showAddTeacher ? "▲" : "▼"}
              </button>

              {showAddTeacher && (
                <div className="grid grid-cols-2 gap-4 border border-gray-100 rounded p-4">
                  <Field label="Name">
                    <input
                      className="input"
                      value={form.newTeacher.name}
                      onChange={(e) =>
                        updateNewTeacherField("name", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Age">
                    <input
                      type="number"
                      className="input"
                      value={form.newTeacher.age}
                      onChange={(e) =>
                        updateNewTeacherField("age", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Qualification">
                    <input
                      className="input"
                      value={form.newTeacher.qualification}
                      onChange={(e) =>
                        updateNewTeacherField("qualification", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Experience (years)">
                    <input
                      type="number"
                      className="input"
                      value={form.newTeacher.experienceYears}
                      onChange={(e) =>
                        updateNewTeacherField("experienceYears", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Specialization" className="col-span-2">
                    <input
                      className="input"
                      placeholder="e.g. Autism Specialist"
                      value={form.newTeacher.specialization}
                      onChange={(e) =>
                        updateNewTeacherField("specialization", e.target.value)
                      }
                    />
                  </Field>
                  <Field label="Email (optional)" className="col-span-2">
                    <input
                      type="email"
                      className="input"
                      placeholder="teacher@example.com"
                      value={form.newTeacher.email}
                      onChange={(e) =>
                        updateNewTeacherField("email", e.target.value)
                      }
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4">
                Student Summary
              </h2>
              <SummaryRow label="Branch" value={form.branch} />
              <SummaryRow label="Admission Number" value={form.admissionNumber} />
              <SummaryRow label="Name" value={`${form.firstName} ${form.lastName}`} />
              <SummaryRow label="Grade" value={form.grade} />
              <SummaryRow label="Section" value={form.section} />
              <SummaryRow label="Diagnosis" value={form.diagnosis} />
              <SummaryRow label="Communication" value={form.communicationLevel} />

              <h2 className="font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4 mt-6">
                Parent Summary
              </h2>
              <SummaryRow label="Parent" value={form.parentFirstName} />
              <SummaryRow label="Phone" value={form.parentPhone} />
              <SummaryRow label="Email" value={form.parentEmail} />

              <h2 className="font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4 mt-6">
                Shadow teacher assigned
              </h2>
              {selectedTeacher ? (
                <>
                  <SummaryRow label="Teacher" value={selectedTeacher.name} />
                  <SummaryRow
                    label="Qualification"
                    value={selectedTeacher.qualification || "—"}
                  />
                </>
              ) : form.newTeacher.name ? (
                <>
                  <SummaryRow label="Teacher (new)" value={form.newTeacher.name} />
                  <SummaryRow
                    label="Qualification"
                    value={form.newTeacher.qualification || "—"}
                  />
                  <SummaryRow
                    label="Email"
                    value={form.newTeacher.email || "—"}
                  />
                </>
              ) : (
                <p className="text-sm text-gray-400">No teacher assigned yet</p>
              )}

              <p className="text-xs text-gray-400 mt-6">
                Login credentials for the student and parent will be
                auto-generated and shown after you confirm.
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
            <button
              onClick={goBack}
              disabled={step === 1}
              className="border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded disabled:opacity-40"
            >
              ← Back
            </button>

            {step < 4 ? (
              <button
                onClick={goNext}
                className="bg-sky-500 hover:bg-sky-600 text-white text-sm px-5 py-2 rounded"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-5 py-2 rounded disabled:opacity-60"
              >
                {submitting ? "Confirming..." : "Confirm"}
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #334155;
          outline: none;
        }
        .input:focus {
          border-color: #38bdf8;
        }
      `}</style>
    </DashboardLayout>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-50">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium">{value || "—"}</span>
    </div>
  );
}

function CredentialRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-mono">{value || "—"}</span>
    </div>
  );
}
