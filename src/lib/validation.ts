// Shared form validation rules.
//
// Every validator returns an error message string, or null when the value is
// acceptable. Client forms and API routes both import from here so a field is
// judged by exactly one rule and the visitor sees the same wording whether the
// problem was caught in the browser or on the server.
//
// Client-side checks are for fast feedback only — the API route is the one that
// actually decides, since anything can POST to it directly.

export const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  subject: { max: 150 },
  message: { min: 10, max: 2000 },
  password: { min: 8, max: 128 },
  amount: { min: 10, max: 10_000_000 },
  seats: { min: 1, max: 20 },
} as const;

/**
 * Deliberately close to the HTML5 email rule rather than full RFC 5322 — it
 * accepts what mail providers actually issue and rejects the shapes people
 * mistype. A trailing TLD of 2+ letters is required so "user@gmail" fails.
 */
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export function normalizeEmail(email: string): string {
  return String(email ?? "").trim().toLowerCase();
}

export function validateEmail(email: unknown, label = "email address"): string | null {
  const value = String(email ?? "").trim();
  if (!value) return `Please enter your ${label}.`;
  if (value.length > LIMITS.email.max) return `That ${label} is too long.`;
  // A local part cannot start or end with a dot, and cannot contain "..".
  const [local] = value.split("@");
  if (local?.startsWith(".") || local?.endsWith(".") || value.includes("..")) {
    return `Please enter a valid ${label} (e.g. name@gmail.com).`;
  }
  if (!EMAIL_RE.test(value)) return `Please enter a valid ${label} (e.g. name@gmail.com).`;
  return null;
}

/**
 * Accepts an international number of 10–15 digits, ignoring spaces, dashes,
 * brackets and a leading "+". A bare 10-digit number is treated as Indian and
 * must start 6–9; numbers carrying a country code are only length-checked, so
 * overseas supporters are not rejected.
 */
export function validatePhone(phone: unknown, label = "phone number"): string | null {
  const raw = String(phone ?? "").trim();
  if (!raw) return `Please enter your ${label}.`;
  if (/[A-Za-z]/.test(raw)) return `Please enter a valid ${label} (digits only, e.g. +91 98765 43210).`;

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return `Please enter a valid ${label} (10–15 digits, e.g. +91 98765 43210).`;
  }
  if (/^(\d)\1+$/.test(digits)) {
    return `Please enter a real ${label}.`;
  }
  if (digits.length === 10 && !/^[6-9]/.test(digits)) {
    return `Please enter a valid 10-digit mobile ${label} starting with 6, 7, 8 or 9 — or include your country code.`;
  }
  return null;
}

/**
 * Strength rules for *setting* a password (registration, reset, admin-created
 * accounts). Never run this when checking a sign-in attempt — existing accounts
 * predate these rules and must still be able to log in.
 */
export function validatePassword(password: unknown, label = "Password"): string | null {
  const value = String(password ?? "");
  if (!value) return `${label} is required.`;
  if (value.length < LIMITS.password.min) return `${label} must be at least ${LIMITS.password.min} characters.`;
  if (value.length > LIMITS.password.max) return `${label} must be under ${LIMITS.password.max} characters.`;
  if (!/[A-Za-z]/.test(value)) return `${label} must include at least one letter.`;
  if (!/\d/.test(value)) return `${label} must include at least one number.`;
  if (/^\s|\s$/.test(value)) return `${label} cannot start or end with a space.`;
  return null;
}

export function validatePasswordConfirmation(password: unknown, confirmation: unknown): string | null {
  if (String(password ?? "") !== String(confirmation ?? "")) return "Both passwords must match.";
  return null;
}

export function validateName(name: unknown, label = "full name"): string | null {
  const value = String(name ?? "").trim();
  if (!value) return `Please enter your ${label}.`;
  if (value.length < LIMITS.name.min) return `Please enter your complete ${label}.`;
  if (value.length > LIMITS.name.max) return `That ${label} is too long.`;
  // Letters in any script, plus combining marks — Devanagari and Telugu vowel
  // signs are Unicode marks, not letters, so omitting \p{M} would reject names
  // like "प्रिया शर्मा". Spaces, apostrophes, hyphens and dots are also allowed.
  if (!/^[\p{L}][\p{L}\p{M}\s'.-]*$/u.test(value)) {
    return `Please enter a valid ${label} — letters only, no digits or symbols.`;
  }
  return null;
}

export function validateText(
  value: unknown,
  label: string,
  opts: { min?: number; max?: number; required?: boolean } = {}
): string | null {
  const { min = 0, max = Infinity, required = true } = opts;
  const text = String(value ?? "").trim();
  if (!text) return required ? `Please enter ${label}.` : null;
  if (text.length < min) return `${label[0].toUpperCase()}${label.slice(1)} must be at least ${min} characters.`;
  if (text.length > max) return `${label[0].toUpperCase()}${label.slice(1)} must be under ${max} characters.`;
  return null;
}

export function validateAmount(amount: unknown, label = "donation amount"): string | null {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `Please enter a valid ${label}.`;
  if (!Number.isInteger(value)) return `Please enter a whole ${label}, without paise.`;
  if (value < LIMITS.amount.min) return `The minimum ${label} is ₹${LIMITS.amount.min}.`;
  if (value > LIMITS.amount.max) return `Please contact us directly to arrange a ${label} above ₹${LIMITS.amount.max.toLocaleString("en-IN")}.`;
  return null;
}

export function validateSeats(seats: unknown, label = "number of seats"): string | null {
  const value = Number(seats);
  if (!Number.isInteger(value)) return `Please enter a valid ${label}.`;
  if (value < LIMITS.seats.min) return `Please reserve at least ${LIMITS.seats.min} seat.`;
  if (value > LIMITS.seats.max) return `Please contact us directly to book more than ${LIMITS.seats.max} seats.`;
  return null;
}

/** Returns the first failure from a list of checks, or null when all pass. */
export function firstError(...results: (string | null)[]): string | null {
  for (const r of results) if (r) return r;
  return null;
}
