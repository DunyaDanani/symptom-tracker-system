// Shared validation helpers. Kept in sync with backend/utils/validators.js
// so "what counts as a valid email" is defined once per side instead of
// drifting across every form.
//
// Intentionally a practical check (local-part@domain.tld, no spaces)
// rather than a full RFC 5322 implementation — good enough to catch typos
// like "asdf" or "name@school" without rejecting real-world addresses.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value: string) => EMAIL_REGEX.test(value.trim());
