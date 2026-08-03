"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import TeacherDashboardLayout from "@/components/TeacherDashboardLayout";
import SymptomTrendChart from "@/components/SymptomTrendChart";
import BackButton from "@/components/BackButton";
import { TERMS, useAcademicTerms } from "@/lib/academicTerms";

import { API_BASE } from "@/lib/config";
interface StudentSummary {
  _id: string;
  fullName: string;
  grade: string;
  section?: string;
}

export default function TeacherStudentReportsPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = use(params);

  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [range, setRange] = useState<"weekly" | "monthly" | "term">("weekly");
  const [trend, setTrend] = useState<{ label: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [termAcademicYear, setTermAcademicYear] = useState("");
  const [termTerm, setTermTerm] = useState("");

  const { academicYears, currentTerm } = useAcademicTerms();

  useEffect(() => {
    if (!currentTerm) return;
    setTermAcademicYear((prev) => prev || currentTerm.academicYear);
    setTermTerm((prev) => prev || currentTerm.term);
  }, [currentTerm]);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
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
            setLoading(false);
          } else {
            setStudent(found);
          }
        } else {
          setError(data.message || "Could not load student");
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load student", err);
        setError("Unable to reach the server");
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    if (!student) return;
    if (range === "term" && (!termAcademicYear || !termTerm)) return;

    const loadTrend = async () => {
      setLoading(true);
      try {
        const query =
          range === "term"
            ? `range=term&academicYear=${encodeURIComponent(
                termAcademicYear
              )}&term=${encodeURIComponent(termTerm)}`
            : `range=${range}`;
        const res = await fetch(
          `${API_BASE}/students/${studentId}/symptom-trends?${query}`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (data.success) {
          setTrend(data.trend);
        } else {
          setError(data.message || "Could not load report");
        }
      } catch (err) {
        console.error("Failed to load symptom trends", err);
        setError("Unable to reach the server");
      } finally {
        setLoading(false);
      }
    };

    loadTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, range, termAcademicYear, termTerm]);

  return (
    <TeacherDashboardLayout
      breadcrumbLabels={
        student
          ? { [studentId]: student.fullName }
          : undefined
      }
    >
      <BackButton />

      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-blue-900">Reports</h1>
          {student && (
            <p className="text-sm text-gray-500">
              {student.fullName} · {student.grade}
              {student.section ? ` · ${student.section}` : ""}
            </p>
          )}
        </div>
        <Link
          href={`/dashboard/print-report/${studentId}?range=${range}${
            range === "term"
              ? `&academicYear=${encodeURIComponent(
                  termAcademicYear
                )}&term=${encodeURIComponent(termTerm)}`
              : ""
          }`}
          target="_blank"
          className="text-sm bg-blue-900 hover:bg-blue-800 text-white rounded-full px-4 py-1.5"
        >
          Print Report
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setRange("weekly")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded font-medium text-sm transition-colors ${
            range === "weekly"
              ? "bg-sky-300 text-gray-900"
              : "bg-sky-100 text-gray-700 hover:bg-sky-200"
          }`}
        >
          Weekly Report
        </button>
        <button
          onClick={() => setRange("monthly")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded font-medium text-sm transition-colors ${
            range === "monthly"
              ? "bg-sky-300 text-gray-900"
              : "bg-sky-100 text-gray-700 hover:bg-sky-200"
          }`}
        >
          Monthly Report
        </button>
        <button
          onClick={() => setRange("term")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded font-medium text-sm transition-colors ${
            range === "term"
              ? "bg-sky-300 text-gray-900"
              : "bg-sky-100 text-gray-700 hover:bg-sky-200"
          }`}
        >
          By Term
        </button>
      </div>

      {range === "term" && (
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={termAcademicYear}
            onChange={(e) => setTermAcademicYear(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400 bg-white"
          >
            <option value="">Academic Year</option>
            {academicYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={termTerm}
            onChange={(e) => setTermTerm(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-blue-400 bg-white"
          >
            <option value="">Term</option>
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="bg-white rounded-md shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">
          Symptom Trends{" "}
          <span className="font-normal text-gray-400">
            (
            {range === "weekly"
              ? "Last 7 Days"
              : range === "monthly"
                ? "Last 5 Weeks"
                : termAcademicYear && termTerm
                  ? `${termAcademicYear} ${termTerm}`
                  : "Select a term"}
            )
          </span>
        </h2>

        {loading ? (
          <p className="text-gray-400 text-sm mt-6">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-sm mt-6">{error}</p>
        ) : (
          <SymptomTrendChart data={trend} />
        )}
      </div>
    </TeacherDashboardLayout>
  );
}
