// Shared button styles. Every clickable action is at least 40px tall
// (min-h-10) so it's an easy target (Fitts's law), instead of small text
// links scattered across pages.

const BASE =
  "inline-flex items-center justify-center gap-1.5 min-h-10 px-4 rounded text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed";

/** Neutral outlined button — secondary actions like "View Profile", "Show all". */
export const BTN_SECONDARY = `${BASE} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;

/** Outlined red — cancelling/removing something. */
export const BTN_DANGER_OUTLINE = `${BASE} border border-red-200 bg-white text-red-600 hover:bg-red-50`;

/** Solid red — confirming a destructive action. */
export const BTN_DANGER = `${BASE} bg-red-500 hover:bg-red-600 text-white`;

/** Solid green — accept / send / confirm. */
export const BTN_SUCCESS = `${BASE} bg-emerald-500 hover:bg-emerald-600 text-white`;

/** Solid brand blue — main action. */
export const BTN_PRIMARY = `${BASE} bg-blue-900 hover:bg-blue-800 text-white`;

/**
 * Tab / segmented-control button (report ranges, message folders, ...):
 * solid brand blue when selected, white with a border otherwise.
 */
export const tabClass = (active: boolean) =>
  `${BASE} border ${
    active
      ? "bg-blue-900 border-blue-900 text-white shadow-sm"
      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
  }`;

/** Dropdown / select at the same 40px height as buttons. */
export const SELECT_CLASS =
  "min-h-10 text-sm text-gray-700 border border-gray-200 rounded px-3 outline-none focus:border-blue-400 bg-white";
