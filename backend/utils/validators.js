// Shared validation helpers. Keep the email regex here (and mirrored in
// frontend/lib/validation.ts) so "what counts as a valid email" is defined
// in exactly one place per side, instead of drifting across every form.
//
// This is intentionally a practical check (local-part@domain.tld, no
// spaces) rather than a full RFC 5322 implementation — good enough to
// catch typos like "asdf" or "name@school" without rejecting real-world
// addresses.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value) =>
  typeof value === "string" && EMAIL_REGEX.test(value.trim());
