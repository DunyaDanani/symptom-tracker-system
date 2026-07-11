import SymptomLog from "../models/SymptomLog.js";
import EmotionCheckin from "../models/EmotionCheckin.js";
import Alert, { ALERT_TYPES } from "../models/Alert.js";
import {
  SYMPTOM_FREQUENCY_WINDOW_DAYS,
  SYMPTOM_FREQUENCY_THRESHOLD,
  EMOTION_WINDOW_DAYS,
  EMOTION_SCORE_THRESHOLD,
} from "./attentionThresholds.js";

// Same thresholds the principal's read-only "needs attention" list uses
// (see principalController.buildAttentionList) — both now import from
// utils/attentionThresholds.js instead of keeping their own copies, so
// they can never silently drift apart. This makes persistent, admin-
// facing alerts out of the same conditions the principal's live view
// shows.

// Creates an Alert unless an unacknowledged one of the same type already
// exists for this student — keeps an ongoing issue from spamming a new
// alert on every single symptom log or check-in while it's still open.
const raiseAlert = async (studentId, type, message) => {
  const existing = await Alert.findOne({
    student: studentId,
    type,
    acknowledged: false,
  });
  if (existing) return existing;

  return Alert.create({ student: studentId, type, message });
};

// Re-checks the two auto-detected threshold conditions for one student.
// Call this after any symptom log or emotion check-in is recorded so
// admins are notified close to real-time, per FR-10.
export const evaluateThresholds = async (studentId) => {
  try {
    const now = new Date();

    const symptomWindowStart = new Date(now);
    symptomWindowStart.setDate(now.getDate() - SYMPTOM_FREQUENCY_WINDOW_DAYS);

    const emotionWindowStart = new Date(now);
    emotionWindowStart.setDate(now.getDate() - EMOTION_WINDOW_DAYS);

    const recentSymptomCount = await SymptomLog.countDocuments({
      student: studentId,
      createdAt: { $gte: symptomWindowStart },
    });

    if (recentSymptomCount >= SYMPTOM_FREQUENCY_THRESHOLD) {
      await raiseAlert(
        studentId,
        ALERT_TYPES.SYMPTOM_FREQUENCY,
        `${recentSymptomCount} symptom logs in the last ${SYMPTOM_FREQUENCY_WINDOW_DAYS} days`
      );
    }

    const recentCheckins = await EmotionCheckin.find({
      student: studentId,
      createdAt: { $gte: emotionWindowStart },
      compositeScore: { $ne: null },
    }).select("compositeScore");

    if (recentCheckins.length > 0) {
      const avg =
        recentCheckins.reduce((sum, c) => sum + c.compositeScore, 0) /
        recentCheckins.length;

      if (avg < EMOTION_SCORE_THRESHOLD) {
        await raiseAlert(
          studentId,
          ALERT_TYPES.LOW_EMOTION_SCORE,
          `Low average emotion score (${avg.toFixed(1)}) over the last ${EMOTION_WINDOW_DAYS} days`
        );
      }
    }
  } catch (error) {
    // Alerting is a side-effect of the main request (logging a symptom /
    // check-in) — never let it fail the caller's response.
    console.error("Alert threshold evaluation failed:", error);
  }
};

// Raised immediately when a teacher/admin manually flags a student.
export const raiseManualFlagAlert = async (studentId, flagNote) => {
  try {
    await raiseAlert(
      studentId,
      ALERT_TYPES.MANUAL_FLAG,
      flagNote ? `Flagged: ${flagNote}` : "Manually flagged for attention"
    );
  } catch (error) {
    console.error("Manual flag alert failed:", error);
  }
};

// Clears any open manual-flag alert when the flag is removed.
export const clearManualFlagAlert = async (studentId) => {
  try {
    await Alert.updateMany(
      {
        student: studentId,
        type: ALERT_TYPES.MANUAL_FLAG,
        acknowledged: false,
      },
      { acknowledged: true, acknowledgedAt: new Date() }
    );
  } catch (error) {
    console.error("Clearing manual flag alert failed:", error);
  }
};
