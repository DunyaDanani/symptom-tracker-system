/**
 * Single source of truth for the Branch -> Category -> Grade drill-down
 * on the admin Branches page.
 *
 * `label` is the EXACT string stored in Student.grade — the admit wizard
 * writes it, and this file reads it back to group students into folders.
 * Grade 8-10 appear twice (National vs Cambridge) with different labels
 * so they don't collide even though the grade number repeats.
 */

export interface GradeEntry {
  slug: string;
  label: string; // must match Student.grade exactly
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
    slug: "senior-secondary-national",
    label: "Senior Secondary (National Pathway)",
    grades: [
      { slug: "grade-8", label: "Grade 8 (National)" },
      { slug: "grade-9", label: "Grade 9 (National)" },
      { slug: "grade-10", label: "Grade 10 (National)" },
      { slug: "grade-11", label: "Grade 11 (National)" },
    ],
  },
  {
    slug: "senior-secondary-cambridge",
    label: "Senior Secondary (Cambridge Pathway)",
    grades: [
      { slug: "grade-8", label: "Grade 8 (Cambridge)" },
      { slug: "grade-9", label: "Grade 9 (Cambridge)" },
      { slug: "grade-10", label: "Grade 10 (Cambridge)" },
    ],
  },
  {
    slug: "advanced-level",
    label: "Advanced Level (AS & A2) (Cambridge Pathway)",
    grades: [
      { slug: "as-level", label: "AS Level" },
      { slug: "a2-level", label: "A2 Level" },
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

// Given a student's raw grade string, returns which category it belongs to
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
