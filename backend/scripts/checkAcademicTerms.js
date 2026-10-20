/**
 * Audits the academic-term calendar for duplicated or conflicting data and,
 * with --fix, repairs what can be repaired safely.
 *
 * Checks:
 *   1. Duplicate (academicYear, term) rows — possible if rows were inserted
 *      before the unique index existed (Mongo then can't build the index).
 *   2. Academic years not in 4-digit form ("2026/27", "2026 ") that would
 *      look like a different year to the unique index.
 *   3. Terms whose date ranges overlap — a day covered by two terms gets
 *      tagged to whichever one Mongo returns first.
 *   4. Terms not yet assigned to a branch + National/Cambridge calendar.
 *   5. Start/end dates not normalised to whole days (end dates saved before
 *      the fix point at 00:00 and exclude the term's last day).
 *
 * --fix only normalises dates and rebuilds the unique index. It never
 * deletes rows: duplicates and overlaps are listed so an admin can decide
 * which entry is correct and delete/edit it on the Academic Terms page.
 *
 * Usage (run from the backend/ folder):
 *   node scripts/checkAcademicTerms.js          -> report only
 *   node scripts/checkAcademicTerms.js --fix    -> report + normalise dates + sync index
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import AcademicTerm, {
  ACADEMIC_YEAR_REGEX,
  startOfDayUTC,
  endOfDayUTC,
} from "../models/AcademicTerm.js";

dotenv.config();

const fix = process.argv.includes("--fix");
const day = (d) => new Date(d).toISOString().slice(0, 10);
const calendarOf = (t) =>
  t.branch && t.programCategory
    ? `${t.branch} · ${t.programCategory === "cambridge" ? "Cambridge" : "National"}`
    : "Unassigned (no branch/curriculum)";
const label = (t) =>
  `[${calendarOf(t)}] ${t.term} ${t.academicYear} (${day(t.startDate)} to ${day(t.endDate)}) [id ${t._id}]`;

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const terms = await AcademicTerm.find().sort({ startDate: 1 }).lean();
  console.log(`Found ${terms.length} academic term(s).\n`);

  let problems = 0;

  // 1. duplicates
  const byKey = new Map();
  for (const t of terms) {
    const key = `${calendarOf(t)}|${t.academicYear.trim()}|${t.term}`;
    byKey.set(key, [...(byKey.get(key) || []), t]);
  }
  for (const group of byKey.values()) {
    if (group.length > 1) {
      problems++;
      console.log("DUPLICATE year + term:");
      group.forEach((t) => console.log("   - " + label(t)));
    }
  }

  // 2. year format
  for (const t of terms) {
    if (!ACADEMIC_YEAR_REGEX.test(t.academicYear)) {
      problems++;
      console.log(`BAD YEAR FORMAT "${t.academicYear}": ${label(t)}`);
    }
  }

  // 3. overlaps
  for (let i = 0; i < terms.length; i++) {
    for (let j = i + 1; j < terms.length; j++) {
      const a = terms[i];
      const b = terms[j];
      if (calendarOf(a) !== calendarOf(b)) continue;
      if (startOfDayUTC(b.startDate) <= endOfDayUTC(a.endDate) &&
          endOfDayUTC(b.endDate) >= startOfDayUTC(a.startDate)) {
        problems++;
        console.log("OVERLAPPING dates:");
        console.log("   - " + label(a));
        console.log("   - " + label(b));
      }
    }
  }

  // 4. legacy rows without a branch / curriculum
  const unassigned = terms.filter((t) => !t.branch || !t.programCategory);
  if (unassigned.length) {
    console.log(
      `\n${unassigned.length} term(s) aren't assigned to a branch and National/Cambridge.` +
        "\n   They're used as a fallback for students whose calendar isn't set up yet." +
        "\n   Edit each one on the Academic Terms page to assign it (or delete it):"
    );
    unassigned.forEach((t) => console.log("   - " + label(t)));
  }

  // 5. un-normalised dates
  const unnormalised = terms.filter(
    (t) =>
      new Date(t.startDate).getTime() !== startOfDayUTC(t.startDate).getTime() ||
      new Date(t.endDate).getTime() !== endOfDayUTC(t.endDate).getTime()
  );
  if (unnormalised.length) {
    console.log(
      `\n${unnormalised.length} term(s) have end dates that exclude their last day` +
        (fix ? " — normalising now." : " — run with --fix to normalise.")
    );
    if (fix) {
      for (const t of unnormalised) {
        await AcademicTerm.updateOne(
          { _id: t._id },
          { $set: { startDate: startOfDayUTC(t.startDate), endDate: endOfDayUTC(t.endDate) } }
        );
      }
      console.log("   Dates normalised.");
    }
  }

  if (fix) {
    try {
      await AcademicTerm.syncIndexes();
      console.log("Unique (academicYear, term) index is in place.");
    } catch (err) {
      console.log(
        "Could not build the unique index — remove the duplicate rows listed above first.\n   " +
          err.message
      );
    }
  }

  console.log(
    problems === 0
      ? "\nNo duplicates, overlaps or bad year formats found."
      : `\n${problems} problem(s) listed above need an admin to edit or delete the wrong entry.`
  );
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
