"use client";

import { use, useEffect, useState } from "react";
import PrincipalDashboardLayout from "@/components/PrincipalDashboardLayout";
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
  createdAt: string;
}

type EligibilityStatus = "pending" | "eligible" | "not_eligible";

interface StudentEligibility {
  _id: string;
  examEligibility?: EligibilityStatus;
  examEligibilityNote?: string;
  examEligibilitySetAt?: string;
}

const STATUS_STYLE: Record<DoctorDoc["status"], string> = {
  pending: "text-amber-700 bg-amber-50",
  approved: "text-green-700 bg-green-50",
  rejected: "text-red-700 bg-red-50",
};

const ELIGIBILITY_STYLE: Record<EligibilityStatus, string> = {
  pending: "text-amber-700 bg-amber-50",
  eligible: "text-green-700 bg-green-50",
  not_eligible: "text-red-700 bg-red-50",
};

const ELIGIBILITY_LABEL: Record<EligibilityStatus, string> = {
  pending: "Not yet decided",
  eligible: "Eligible",
  not_eligible: "Not eligible",
};

// Doctor's documents themselves are read-only for principals — only the
// parent can upload, only the admin can review/approve. Scoped server-side
// to the principal's own branch. Exam eligibility below, however, is the
// principal's own call to make, typically after reviewing these documents.
export default function PrincipalDoctorDocumentsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [documents, setDocuments] = useState<DoctorDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [eligibility, setEligibility] = useState<EligibilityStatus>("pending");
  const [eligibilityNote, setEligibilityNote] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [eligibilityLoading, setEligibilityLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState<EligibilityStatus | null>(
    null
  );
  const [eligibilityError, setEligibilityError] = useState("");

  useEffect(() => {
    const load = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(
          `${API_BASE}/doctor-documents/student/${studentId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) {
          setDocuments(data.documents);
        } else {
          setError(data.message || "Could not load documents");
        }
      } catch (err) {
        console.error("Failed to load doctor documents", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    const loadEligibility = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_BASE}/principal/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          const found = data.students.find(
            (s: StudentEligibility) => s._id === studentId
          );
          if (found) {
            setEligibility(found.examEligibility || "pending");
            setEligibilityNote(found.examEligibilityNote || "");
            setNoteDraft(found.examEligibilityNote || "");
          }
        }
      } catch (err) {
        console.error("Failed to load exam eligibility", err);
      } finally {
        setEligibilityLoading(false);
      }
    };

    load();
    loadEligibility();
  }, [studentId]);

  const handleSetEligibility = async (status: "eligible" | "not_eligible") => {
    setSavingStatus(status);
    setEligibilityError("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(
        `${API_BASE}/principal/students/${studentId}/exam-eligibility`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status, note: noteDraft }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setEligibility(status);
        setEligibilityNote(noteDraft);
      } else {
        setEligibilityError(data.message || "Could not update eligibility");
      }
    } catch (err) {
      console.error("Failed to update exam eligibility", err);
      setEligibilityError("Unable to reach the server");
    } finally {
      setSavingStatus(null);
    }
  };

  return (
    <PrincipalDashboardLayout>
      <BackButton />

      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-8">
        Doctor&apos;s Recommendation
      </h1>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-md shadow-sm p-6 text-sm text-gray-400 max-w-2xl">
          No documents uploaded yet.
        </div>
      ) : (
        <div className="bg-white rounded-md shadow-sm divide-y divide-gray-50 max-w-2xl">
          {documents.map((doc) => (
            <div key={doc._id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() =>
                      openAuthenticatedFile(
                        `${API_BASE}/doctor-documents/${doc._id}/file`
                      )
                    }
                    className="text-sm font-medium text-gray-800 hover:text-blue-700 break-all text-left"
                  >
                    {doc.fileName}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">
                    Uploaded {new Date(doc.createdAt).toLocaleString()}
                  </p>
                  {doc.status !== "pending" && doc.reviewNote && (
                    <p className="text-xs text-gray-500 mt-1">
                      Admin note: {doc.reviewNote}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded shrink-0 ${STATUS_STYLE[doc.status]}`}
                >
                  {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Exam eligibility — the principal's own call, made after reviewing
          the documents above. */}
      <h2 className="text-lg font-semibold text-blue-900 mt-10 mb-4">
        Exam Eligibility
      </h2>

      <div className="bg-white rounded-md shadow-sm p-6 max-w-2xl">
        {eligibilityLoading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded ${ELIGIBILITY_STYLE[eligibility]}`}
              >
                {ELIGIBILITY_LABEL[eligibility]}
              </span>
              {eligibilityNote && (
                <span className="text-sm text-gray-500">
                  Note: {eligibilityNote}
                </span>
              )}
            </div>

            <label className="block text-xs font-medium text-gray-600 mb-1">
              Note (optional)
            </label>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              rows={2}
              placeholder="e.g. Cleared based on the doctor's recommendation on file"
              className="w-full bg-slate-100 rounded-sm px-3 py-2 text-sm outline-none text-gray-700 placeholder-gray-400 mb-4"
            />

            {eligibilityError && (
              <p className="text-sm text-red-500 mb-3">{eligibilityError}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSetEligibility("eligible")}
                disabled={savingStatus !== null}
                className="bg-emerald-500 hover:bg-emerald-600 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-sm disabled:opacity-60"
              >
                {savingStatus === "eligible" ? "Saving..." : "Mark Eligible"}
              </button>
              <button
                type="button"
                onClick={() => handleSetEligibility("not_eligible")}
                disabled={savingStatus !== null}
                className="bg-red-500 hover:bg-red-600 transition-colors text-white text-sm font-semibold px-4 py-2 rounded-sm disabled:opacity-60"
              >
                {savingStatus === "not_eligible"
                  ? "Saving..."
                  : "Mark Not Eligible"}
              </button>
            </div>
          </>
        )}
      </div>
    </PrincipalDashboardLayout>
  );
}
