// Colours for the Aesthetic / Social / Academic activity-plan cards.
//
// The backend sends its own colour classes with each card (card.color), but
// Tailwind only generates classes it finds in the frontend's own files, so
// colours that appear nowhere else (purple, teal, indigo...) came out blank
// and some cards showed with no background. Colouring by category here keeps
// every card tinted, and the same category is always the same colour.
const CATEGORY_COLORS: Record<string, string> = {
  aesthetic: "bg-pink-50 text-pink-700",
  social: "bg-sky-50 text-sky-800",
  academic: "bg-amber-50 text-amber-800",
};

export function activityCardColor(category?: string): string {
  return CATEGORY_COLORS[(category || "").toLowerCase()] || "bg-slate-50 text-slate-700";
}
