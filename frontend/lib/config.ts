// Central place for the backend API origin. Every frontend file used to
// hardcode the backend's local address, which only works when the frontend
// and backend run on the same machine. Set NEXT_PUBLIC_API_BASE_URL in the
// environment for any hosted/staging/production deployment; the value below
// remains the default for local dev only.
export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export const API_BASE = `${API_ORIGIN}/api`;
