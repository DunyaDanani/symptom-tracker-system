// Builds the printable Symptom & Emotion report as a single self-contained
// HTML string (inline CSS, inline SVG chart — no external assets, no
// network calls) so Puppeteer can render it deterministically via
// page.setContent() without depending on the frontend dev/prod server
// being reachable from the backend.
//
// Mirrors the layout of frontend/app/dashboard/print-report/[studentId]/page.tsx
// so parents/admins see the same report whether they hit "Print" in the
// browser or download the server-generated PDF.

const EMOJI_ICON = {
  very_sad: "😢 Very sad",
  sad: "🙁 Sad",
  neutral: "😐 Neutral",
  happy: "🙂 Happy",
  very_happy: "😄 Very happy",
};

const RANGE_LABEL = {
  weekly: "Last 7 Days",
  monthly: "Last 5 Weeks (35 Days)",
  quarterly: "3-Month Final Conclusion (Last 92 Days)",
};

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString();
}

// Small dependency-free inline SVG line chart, standing in for the
// Recharts <SymptomTrendChart> used on the live page (Recharts needs a
// React render pass in a browser tab; Puppeteer is rendering static HTML,
// so we draw the same shape by hand).
function renderTrendSvg(trend) {
  const width = 640;
  const height = 220;
  const padding = { top: 16, right: 20, bottom: 32, left: 32 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(5, ...trend.map((d) => d.count));
  const stepX = trend.length > 1 ? plotWidth / (trend.length - 1) : 0;

  const points = trend.map((d, i) => {
    const x = padding.left + (trend.length > 1 ? i * stepX : plotWidth / 2);
    const y =
      padding.top + plotHeight - (d.count / maxCount) * plotHeight;
    return { x, y, label: d.label, count: d.count };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  // Horizontal gridlines at 0%, 50%, 100%
  const gridLines = [0, 0.5, 1]
    .map((frac) => {
      const y = padding.top + plotHeight * (1 - frac);
      const value = Math.round(maxCount * frac);
      return `
        <line x1="${padding.left}" y1="${y.toFixed(1)}" x2="${width - padding.right}" y2="${y.toFixed(1)}" stroke="#eef2f7" stroke-width="1" />
        <text x="${padding.left - 8}" y="${(y + 3).toFixed(1)}" font-size="10" fill="#6b7280" text-anchor="end">${value}</text>
      `;
    })
    .join("");

  const dots = points
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#0ea5e9" />`
    )
    .join("");

  const labels = points
    .map(
      (p) =>
        `<text x="${p.x.toFixed(1)}" y="${height - 8}" font-size="10" fill="#6b7280" text-anchor="middle">${escapeHtml(p.label)}</text>`
    )
    .join("");

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${gridLines}
      <path d="${linePath}" fill="none" stroke="#0ea5e9" stroke-width="2" />
      ${dots}
      ${labels}
    </svg>
  `;
}

function renderSymptomLogsTable(symptomLogs) {
  if (symptomLogs.length === 0) {
    return `<p class="muted">No symptom logs recorded in this period.</p>`;
  }
  const rows = symptomLogs
    .map((log) => {
      const meds =
        log.medications && log.medications.length > 0
          ? log.medications
              .map(
                (m) =>
                  `${escapeHtml(m.name)}${m.dosage ? ` (${escapeHtml(m.dosage)})` : ""}`
              )
              .join("; ")
          : "—";
      return `
        <tr>
          <td class="nowrap">${formatDate(log.createdAt)}</td>
          <td>
            ${escapeHtml(log.symptoms.join("; "))}
            ${log.additionalNotes ? `<div class="muted small">Note: ${escapeHtml(log.additionalNotes)}</div>` : ""}
          </td>
          <td>
            ${meds}
            ${log.medicationNotes ? `<div class="muted small">${escapeHtml(log.medicationNotes)}</div>` : ""}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table>
      <thead>
        <tr>
          <th class="nowrap">Date</th>
          <th>Symptoms Observed</th>
          <th>Medication</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderEmotionTable(emotionCheckins) {
  if (emotionCheckins.length === 0) {
    return `<p class="muted">No emotion check-ins recorded in this period.</p>`;
  }
  const rows = emotionCheckins
    .map(
      (c) => `
        <tr>
          <td class="nowrap">${formatDate(c.createdAt)}</td>
          <td>${c.childEmoji ? escapeHtml(EMOJI_ICON[c.childEmoji] || c.childEmoji) : "Not yet"}</td>
          <td>${c.teacherEmoji ? escapeHtml(EMOJI_ICON[c.teacherEmoji] || c.teacherEmoji) : "Not yet"}</td>
          <td>${c.compositeScore} / 5</td>
        </tr>
      `
    )
    .join("");

  return `
    <table>
      <thead>
        <tr>
          <th class="nowrap">Date</th>
          <th>Child</th>
          <th>Teacher</th>
          <th>Score</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

/**
 * @param {Object} params
 * @param {Object} params.student - populated Student document (assignedTeacher, parentUser populated)
 * @param {Array} params.symptomLogs
 * @param {Array} params.emotionCheckins
 * @param {Array} params.trend - [{ label, count }]
 * @param {"weekly"|"monthly"|"quarterly"} params.range
 * @param {string} params.generatedBy - display name of the user who requested the report
 */
export function buildReportHtml({
  student,
  symptomLogs,
  emotionCheckins,
  trend,
  range,
  generatedBy,
}) {
  const generatedAt = new Date().toLocaleDateString();
  const reportTitle =
    range === "quarterly"
      ? "3-Month Final Conclusion Report"
      : "Symptom & Emotion Report";

  const studentName = `${student.firstName} ${student.lastName}`;
  const admissionNumber = student.admissionNumber || "—";
  const gradeSection = `${student.grade}${student.section ? ` · ${student.section}` : ""}`;
  const teacherName = student.assignedTeacher?.name || "Unassigned";
  const parentName = student.parentUser?.name || "—";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(studentName)} — ${escapeHtml(reportTitle)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #1f2937;
    margin: 0;
    padding: 32px;
    font-size: 13px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .school-block { display: flex; align-items: center; gap: 12px; }
  .school-badge {
    width: 40px; height: 40px; border-radius: 8px;
    background: #1e3a8a; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px;
  }
  .school-name { color: #1e3a8a; font-weight: 700; }
  .branch { color: #9ca3af; font-size: 11px; }
  .report-title { font-size: 13px; font-weight: 600; text-align: right; }
  .generated { color: #9ca3af; font-size: 11px; text-align: right; margin-top: 2px; }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 32px;
    margin-bottom: 24px;
  }
  .info-row .label { color: #6b7280; display: inline-block; min-width: 9rem; }
  .info-row .value { color: #1f2937; font-weight: 500; text-transform: capitalize; }

  section { margin-bottom: 24px; page-break-inside: avoid; }
  h2 {
    font-size: 13px; font-weight: 600; color: #1f2937;
    border-bottom: 1px solid #f3f4f6;
    padding-bottom: 8px; margin: 0 0 12px;
  }

  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th {
    text-align: left; border-bottom: 1px solid #e5e7eb;
    padding: 6px 10px 6px 0; color: #4b5563; font-weight: 600;
  }
  td {
    border-bottom: 1px solid #f3f4f6;
    padding: 8px 10px 8px 0; vertical-align: top; color: #1f2937;
  }
  .nowrap { white-space: nowrap; }
  .muted { color: #9ca3af; }
  .small { font-size: 10px; margin-top: 2px; }

  .doctor-box {
    height: 70px; border: 1px dashed #d1d5db; border-radius: 6px;
  }
  .signature-line {
    display: flex; justify-content: space-between;
    margin-top: 20px; font-size: 11px; color: #9ca3af;
  }
</style>
</head>
<body>

  <div class="header">
    <div class="school-block">
      <div class="school-badge">OKI</div>
      <div>
        <div class="school-name">OKI International School</div>
        <div class="branch">${escapeHtml(student.branch || "")} Branch</div>
      </div>
    </div>
    <div>
      <div class="report-title">${escapeHtml(reportTitle)}</div>
      <div class="generated">Generated ${generatedAt} by ${escapeHtml(generatedBy || "—")}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-row"><span class="label">Student Name:</span> <span class="value">${escapeHtml(studentName)}</span></div>
    <div class="info-row"><span class="label">Admission No.:</span> <span class="value">${escapeHtml(admissionNumber)}</span></div>
    <div class="info-row"><span class="label">Grade:</span> <span class="value">${escapeHtml(gradeSection)}</span></div>
    <div class="info-row"><span class="label">Diagnosis:</span> <span class="value">${escapeHtml(student.diagnosis || "—")}</span></div>
    <div class="info-row"><span class="label">Communication Level:</span> <span class="value">${escapeHtml(student.communicationLevel || "—")}</span></div>
    <div class="info-row"><span class="label">Shadow Teacher:</span> <span class="value">${escapeHtml(teacherName)}</span></div>
    <div class="info-row"><span class="label">Parent / Guardian:</span> <span class="value">${escapeHtml(parentName)}</span></div>
    <div class="info-row"><span class="label">Report Period:</span> <span class="value">${escapeHtml(RANGE_LABEL[range] || RANGE_LABEL.weekly)}</span></div>
  </div>

  <section>
    <h2>Symptom Trend</h2>
    ${renderTrendSvg(trend)}
  </section>

  <section>
    <h2>Symptom Logs (${symptomLogs.length})</h2>
    ${renderSymptomLogsTable(symptomLogs)}
  </section>

  <section>
    <h2>Emotion Check-ins (${emotionCheckins.length})</h2>
    ${renderEmotionTable(emotionCheckins)}
  </section>

  <section>
    <h2>Doctor's Notes</h2>
    <div class="doctor-box"></div>
    <div class="signature-line">
      <span>Doctor's Signature: ______________________</span>
      <span>Date: ______________________</span>
    </div>
  </section>

</body>
</html>`;
}
