// Shared validation helpers. Kept in sync with backend/utils/validators.js
// so "what counts as a valid email" is defined once per side instead of
// drifting across every form.
//
// Intentionally a practical check (local-part@domain.tld, no spaces)
// rather than a full RFC 5322 implementation — good enough to catch typos
// like "asdf" or "name@school" without rejecting real-world addresses.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim());

// ---------------------------------------------------------------------------
// Required-field messages
//
// Every form shows empty-field errors the same way the Admit New Student
// wizard does: "<Label> is required", inline under the field, in small red
// text. Forms use `noValidate` so the browser's own "Please fill out this
// field" popup never appears and can't contradict this style.
// ---------------------------------------------------------------------------
export const requiredMessage = (label: string) => `${label} is required`;

export const INVALID_EMAIL_MESSAGE =
  "Enter a valid email address (e.g. name@example.com)";

/** True when a text/select value is missing or only whitespace. */
export const isBlank = (value: string | null | undefined) =>
  value === null || value === undefined || value.trim() === "";

/** Red border for an errored input/select (Tailwind v4 important suffix). */
export const errorBorder = (error?: string) =>
  error ? "border-red-400! focus:border-red-500!" : "";

/** Red outline for the borderless pill-style inputs on the auth pages. */
export const errorRing = (error?: string) =>
  error ? "ring-1 ring-red-400" : "";

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;
