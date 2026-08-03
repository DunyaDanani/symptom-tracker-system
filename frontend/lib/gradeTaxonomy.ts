/**
 * Single source of truth for the Branch -> Education Stage -> Grade
 * drill-down on the admin/principal Branches pages, and for the Education
 * Stage / Grade selects in the admit wizard.
 *
 * `label` is the EXACT string stored in Student.grade — the admit wizard
 * writes it, and this file reads it back to group students into folders.
 *
 * Senior Secondary and Advanced Level are "category-dependent" stages: the
 * grades on offer differ depending on the student's Category (National vs
 * Cambridge pathway, stored on Student.programCategory). Each grade entry
 * in those stages carries a `category` tag so the admit wizard can filter
 * down to just the ones that apply, while folder-browse pages (which just
 * group already-admitted students) can keep listing every grade in the
 * stage regardless of category.
 *
 * Grade labels are kept distinct across categories (e.g. "Grade 8
 * (National)" vs "Grade 8 (Cambridge)") so they don't collide even though
 * the grade number repeats.
 */

export type ProgramCategory = "national" | "cambridge";

export const PROGRAM_CATEGORIES: { value: ProgramCategory; label: string }[] = [
  { value: "national", label: "National" },
  { value: "cambridge", label: "Cambridge" },
];

export interface GradeEntry {
  slug: string;
  label: string; // must match Student.grade exactly
  /** Only set within a category-dependent stage (Senior Secondary,
   *  Advanced Level) — tells the admit wizard which Category this grade
   *  belongs to. Undefined for grades that apply regardless of category. */
  category?: ProgramCategory;
}

export interface CategoryEntry {
  slug: string;
  label: string;
  grades: GradeEntry[];
}

export const GRADE_TAXONOMY: CategoryEntry[] = [
  {
    slug: "pre-school",
    label: "Pre-School",
    grades: [
      { slug: "playgroup", label: "Playgroup" },
      { slug: "nursery", label: "Nursery" },
      { slug: "kindergarten", label: "Kindergarten" },
    ],
  },
  {
    slug: "primary-education",
    label: "Primary Education",
    grades: [
      { slug: "grade-1", label: "Grade 1" },
      { slug: "grade-2", label: "Grade 2" },
      { slug: "grade-3", label: "Grade 3" },
      { slug: "grade-4", label: "Grade 4" },
      { slug: "grade-5", label: "Grade 5" },
    ],
  },
  {
    slug: "junior-secondary",
    label: "Junior Secondary",
    grades: [
      { slug: "grade-6", label: "Grade 6" },
      { slug: "grade-7", label: "Grade 7" },
    ],
  },
  {
    slug: "senior-secondary",
    label: "Senior Secondary",
    grades: [
      { slug: "grade-8-national", label: "Grade 8 (National)", category: "national" },
      { slug: "grade-9-national", label: "Grade 9 (National)", category: "national" },
      { slug: "grade-10-national", label: "Grade 10 (National)", category: "national" },
      { slug: "grade-11-national", label: "Grade 11 (National)", category: "national" },
      { slug: "grade-8-cambridge", label: "Grade 8 (Cambridge)", category: "cambridge" },
      { slug: "grade-9-cambridge", label: "Grade 9 (Cambridge)", category: "cambridge" },
      { slug: "grade-10-cambridge", label: "Grade 10 (Cambridge)", category: "cambridge" },
    ],
  },
  {
    slug: "advanced-level",
    label: "Advanced Level",
    grades: [
      { slug: "grade-12-national", label: "Grade 12 (National)", category: "national" },
      { slug: "grade-13-national", label: "Grade 13 (National)", category: "national" },
      { slug: "as-level", label: "AS Level (Cambridge)", category: "cambridge" },
      { slug: "a2-level", label: "A2 Level (Cambridge)", category: "cambridge" },
    ],
  },
];

// Fallback bucket for any pre-existing student whose free-typed `grade`
// value doesn't match one of the labels above exactly, so nothing
// disappears from view after this taxonomy is introduced.
export const UNGROUPED_CATEGORY: CategoryEntry = {
  slug: "ungrouped",
  label: "Ungrouped",
  grades: [],
};

export function getCategory(slug: string): CategoryEntry | undefined {
  return GRADE_TAXONOMY.find((c) => c.slug === slug);
}

export function getGrade(categorySlug: string, gradeSlug: string): GradeEntry | undefined {
  return getCategory(categorySlug)?.grades.find((g) => g.slug === gradeSlug);
}

// Given an education stage and the student's Category, returns just the
// grades that apply. Stages that aren't category-dependent (Pre-School,
// Primary Education, Junior Secondary) ignore `programCategory` and always
// return their full grade list. Category-dependent stages (Senior
// Secondary, Advanced Level) return [] until a Category is chosen.
export function getGradesForCategory(
  stageSlug: string,
  programCategory: ProgramCategory | ""
): GradeEntry[] {
  const stage = getCategory(stageSlug);
  if (!stage) return [];
  const isCategoryDependent = stage.grades.some((g) => g.category);
  if (!isCategoryDependent) return stage.grades;
  if (!programCategory) return [];
  return stage.grades.filter((g) => g.category === programCategory);
}

// Given a student's raw grade string, returns which stage it belongs to
// (or null if it doesn't match anything in the taxonomy).
export function categoryForGrade(gradeValue: string): CategoryEntry | null {
  for (const category of GRADE_TAXONOMY) {
    if (category.grades.some((g) => g.label === gradeValue)) return category;
  }
  return null;
}

export function gradeSlugForValue(gradeValue: string): string | null {
  for (const category of GRADE_TAXONOMY) {
    const match = category.grades.find((g) => g.label === gradeValue);
    if (match) return match.slug;
  }
  return null;
}
