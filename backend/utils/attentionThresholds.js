// Single source of truth for the "needs attention" thresholds used by
// TWO independent features that must never quietly drift apart:
//   - Admin's Alert system (utils/alertEngine.js) — a persisted,
//     acknowledgeable notification queue.
//   - The principal's read-only "Students Needing Attention" list
//     (controllers/principalController.js) — a live status board that
//     recomputes on every view rather than tracking acknowledgement.
// Both are intentionally separate systems (one's a dismissible inbox, the
// other is an always-current oversight view), but they should always
// agree on WHAT counts as "needs attention" — hence pulling both sets of
// magic numbers from here instead of two copies that could be edited
// independently.
export const SYMPTOM_FREQUENCY_WINDOW_DAYS = 3;
export const SYMPTOM_FREQUENCY_THRESHOLD = 3;
export const EMOTION_WINDOW_DAYS = 7;
export const EMOTION_SCORE_THRESHOLD = 2.5;
