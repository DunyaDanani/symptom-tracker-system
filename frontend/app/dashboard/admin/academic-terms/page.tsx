"use client";

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import BackButton from "@/components/BackButton";
import { TERMS, useAcademicTerms, type AcademicTermEntry } from "@/lib/academicTerms";
import { API_BASE } from "@/lib/config";

const blankForm = () => ({
  academicYear: String(new Date().getFullYear()),
  term: TERMS[0] as string,
  startDate: "",
  endDate: "",
});

export default function AdminAcademicTermsPage() {
  const { terms, loading, error, reload } = useAcademicTerms();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const updateField = (field: keyof ReturnType<typeof blankForm>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const startEdit = (t: AcademicTermEntry) => {
    setEditingId(t._id);
    setForm({
      academicYear: t.academicYear,
      term: t.term,
      startDate: t.startDate.slice(0, 10),
      endDate: t.endDate.slice(0, 10),
    });
    setFormError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm());
    setFormError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.academicYear.trim() || !form.startDate || !form.endDate) {
      setFormError("Academic year, start date, and end date are all required.");
      return;
    }
    if (form.startDate >= form.endDate) {
      setFormError("Start date must be before end date.");
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `${API_BASE}/academic-terms/${editingId}`
        : `${API_BASE}/academic-terms`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        cancelEdit();
        await reload();
      } else {
        setFormError(data.message || "Could not save this term.");
      }
    } catch (err) {
      console.error("Failed to save academic term", err);
      setFormError("Unable to reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/academic-terms/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) await reload();
    } catch (err) {
      console.error("Failed to delete academic term", err);
    }
  };

  return (
    <DashboardLayout>
      <BackButton />
      <h1 className="text-2xl font-semibold text-blue-900 mt-2 mb-1">
        Academic Terms
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        Define each term&apos;s start and end date. Every symptom log, emotion
        check-in, and module upload is tagged against this calendar, so
        reports can be pulled per term instead of just a rolling date range.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white rounded-md shadow-sm p-6 lg:col-span-1 h-fit">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            {editingId ? "Edit Term" : "Add Term"}
          </h2>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Academic Year
              </label>
              <input
                type="text"
                value={form.academicYear}
                onChange={(e) => updateField("academicYear", e.target.value)}
                placeholder="e.g. 2026"
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Term
              </label>
              <select
                value={form.term}
                onChange={(e) => updateField("term", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400"
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => updateField("endDate", e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400"
              />
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}

            <div className="flex gap-2 mt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Add Term"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-md shadow-sm overflow-hidden lg:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 p-6 pb-0">
            Configured Terms
          </h2>
          {loading ? (
            <p className="px-6 py-4 text-sm text-gray-400">Loading...</p>
          ) : error ? (
            <p className="px-6 py-4 text-sm text-red-500">{error}</p>
          ) : terms.length === 0 ? (
            <p className="px-6 py-4 text-sm text-gray-400">
              No terms configured yet — add the first one to the left.
            </p>
          ) : (
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 font-semibold text-gray-700">
                    Academic Year
                  </th>
                  <th className="px-6 py-3 font-semibold text-gray-700">
                    Term
                  </th>
                  <th className="px-6 py-3 font-semibold text-gray-700">
                    Start Date
                  </th>
                  <th className="px-6 py-3 font-semibold text-gray-700">
                    End Date
                  </th>
                  <th className="px-6 py-3 font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {terms.map((t) => (
                  <tr key={t._id} className="border-b border-gray-50">
                    <td className="px-6 py-3 text-gray-800">{t.academicYear}</td>
                    <td className="px-6 py-3 text-gray-800">{t.term}</td>
                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(t.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(t.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => startEdit(t)}
                          className="text-gray-300 hover:text-blue-600 transition-colors"
                          aria-label="Edit term"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t._id)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                          aria-label="Delete term"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
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
