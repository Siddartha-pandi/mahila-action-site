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

export function validateEmail(
  email: unknown,
  label = "email address",
  opts: { required?: boolean } = {}
): string | null {
  const { required = true } = opts;
  const value = String(email ?? "").trim();
  if (!value) return required ? `Please enter your ${label}.` : null;
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
 * Comprehensive phone number validation:
 * - Accepts international format (10–15 digits) or Indian mobile numbers (10 digits).
 * - Disallows letters, symbols, misplaced plus signs (+ only allowed as the first character).
 * - For Indian numbers (10 digits, or with +91, 91, or leading 0 prefix):
 *     - Ensures the 10-digit mobile number begins with 6, 7, 8, or 9.
 *     - Rejects repetitive dummy numbers (e.g., 9999999999, 0000000000).
 * - For international numbers:
 *     - Ensures 10 to 15 digits total.
 *     - Rejects repetitive numbers.
 */
export function validatePhone(
  phone: unknown,
  label = "phone number",
  opts: { required?: boolean } = {}
): string | null {
  const { required = true } = opts;
  const raw = String(phone ?? "").trim();
  if (!raw) return required ? `Please enter your ${label}.` : null;

  // Plus sign check: can only appear at most once and only as the very first character
  if ((raw.match(/\+/g) || []).length > 1 || (raw.includes("+") && !raw.startsWith("+"))) {
    return `Please enter a valid ${label} (e.g. +91 98765 43210).`;
  }

  // Reject invalid characters like letters, symbols (@, $, %, #, etc.).
  // Allowed characters are digits, leading plus (+), spaces, hyphens (-), parentheses (), and dots (.).
  if (/[A-Za-z]/.test(raw) || !/^\+?[0-9\s\-().]+$/.test(raw)) {
    return `Please enter a valid ${label} (digits only, e.g. +91 98765 43210).`;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return `Please enter a valid ${label} (10–15 digits, e.g. +91 98765 43210).`;
  }

  // Reject if all digits in the number are identical (e.g. 1111111111)
  if (/^(\d)\1+$/.test(digits)) {
    return `Please enter a real ${label}.`;
  }

  // Check if explicitly prefixed with a non-Indian country code (e.g. +1, +44, +49)
  const isNonIndian = raw.startsWith("+") && !raw.startsWith("+91");

  if (isNonIndian) {
    // Non-Indian international numbers: total digits 10-15 already verified
    // Reject if the local portion is all identical digits (e.g. +1 1111111111)
    if (/^(\d)\1{7,}$/.test(digits.slice(2))) {
      return `Please enter a real ${label}.`;
    }
    return null;
  }

  // Check Indian mobile numbers:
  // - 10 digits starting with 6, 7, 8, 9
  // - 11 digits starting with 0 and next digit 6, 7, 8, 9
  // - 12 digits starting with 91 and next digit 6, 7, 8, 9
  // - 13 digits starting with 910 and next digit 6, 7, 8, 9
  const isIndianMobile =
    (digits.length === 10 && /^[6-9]/.test(digits)) ||
    (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) ||
    (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) ||
    (digits.length === 13 && digits.startsWith("910") && /^[6-9]/.test(digits.slice(3)));

  if (isIndianMobile) {
    const mobile10 = digits.slice(-10);
    if (/^(\d)\1{9}$/.test(mobile10)) {
      return `Please enter a real ${label}.`;
    }
    return null;
  }

  // Check Indian landline numbers:
  // - Starts with 0 (10–11 digits) or +91/91 (11–12 digits)
  // - STD code (11, 20, 22, 33, 40, 44, 80 or 3-4 digit area code)
  // - Subscriber number (6–8 digits, typically starting with 2, 3, 4, 5, 6)
  const isIndianLandline =
    /^0(11|20|22|33|40|44|80|[1-8]\d{2,3})[2-6]\d{5,7}$/.test(digits) ||
    /^(?:91)(11|20|22|33|40|44|80|[1-8]\d{2,3})[2-6]\d{5,7}$/.test(digits);

  if (isIndianLandline) {
    return null;
  }

  // If a 10-digit number didn't start with 6-9, give a specific helpful error
  if (digits.length === 10 && !/^[6-9]/.test(digits)) {
    return `Please enter a valid 10-digit mobile ${label} starting with 6, 7, 8 or 9.`;
  }

  return `Please enter a valid 10-digit mobile ${label} (e.g. +91 98765 43210).`;
}

/**
 * Normalizes a phone string into a clean standard representation (+91 XXXXX XXXXX for Indian numbers
 * or standard digits with leading plus).
 */
export function normalizePhone(phone: unknown): string {
  const raw = String(phone ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");

  // 10-digit Indian mobile
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  // 11-digit Indian mobile with leading 0
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    const m = digits.slice(1);
    return `+91 ${m.slice(0, 5)} ${m.slice(5)}`;
  }
  // 12-digit Indian mobile with 91 prefix
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    const m = digits.slice(2);
    return `+91 ${m.slice(0, 5)} ${m.slice(5)}`;
  }
  // 13-digit Indian mobile with 910 prefix
  if (digits.length === 13 && digits.startsWith("910") && /^[6-9]/.test(digits.slice(3))) {
    const m = digits.slice(3);
    return `+91 ${m.slice(0, 5)} ${m.slice(5)}`;
  }

  // Indian landline with 0 prefix (e.g. 040 23456789 -> +91 40 23456789)
  if (digits.length >= 10 && digits.length <= 11 && digits.startsWith("0")) {
    return `+91 ${digits.slice(1)}`;
  }

  // Indian landline with 91 prefix
  if (digits.length >= 11 && digits.length <= 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2)}`;
  }

  // International numbers with leading plus
  if (raw.startsWith("+")) {
    return `+${digits}`;
  }

  return digits;
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
  if (value.length > LIMITS.password.max) return `${label} cannot exceed ${LIMITS.password.max} characters.`;
  if (!/[A-Za-z]/.test(value)) return `${label} must include at least one letter.`;
  if (!/\d/.test(value)) return `${label} must include at least one number.`;
  if (/^\s|\s$/.test(value)) return `${label} cannot start or end with a space.`;
  return null;
}

export function validatePasswordConfirmation(password: unknown, confirmation: unknown): string | null {
  if (String(password ?? "") !== String(confirmation ?? "")) return "Both passwords must match.";
  return null;
}

export function validateName(
  name: unknown,
  label = "full name",
  opts: { required?: boolean } = {}
): string | null {
  const { required = true } = opts;
  const value = String(name ?? "").trim();
  if (!value) return required ? `Please enter your ${label}.` : null;
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
  const capitalized = label ? label[0].toUpperCase() + label.slice(1) : "Field";
  if (text.length < min) return `${capitalized} must be at least ${min} characters.`;
  if (text.length > max) return `${capitalized} must be under ${max} characters.`;
  return null;
}

export function validateAmount(amount: unknown, label = "donation amount"): string | null {
  if (amount === "" || amount === null || amount === undefined || (typeof amount === "string" && !amount.trim())) {
    return `Please enter a ${label}.`;
  }
  const value = Number(amount);
  if (!Number.isFinite(value)) return `Please enter a valid ${label}.`;
  if (!Number.isInteger(value)) return `Please enter a whole ${label}, without paise.`;
  if (value < LIMITS.amount.min) return `The minimum ${label} is ₹${LIMITS.amount.min}.`;
  if (value > LIMITS.amount.max) return `Please contact us directly to arrange a ${label} above ₹${LIMITS.amount.max.toLocaleString("en-IN")}.`;
  return null;
}

export function validateSeats(seats: unknown, label = "number of seats"): string | null {
  if (seats === "" || seats === null || seats === undefined || (typeof seats === "string" && !seats.trim())) {
    return `Please enter the ${label}.`;
  }
  const value = Number(seats);
  if (!Number.isInteger(value)) return `Please enter a valid ${label}.`;
  if (value < LIMITS.seats.min) return `Please reserve at least ${LIMITS.seats.min} seat.`;
  if (value > LIMITS.seats.max) return `Please contact us directly to book more than ${LIMITS.seats.max} seats.`;
  return null;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export function validatePanNumber(pan: unknown, required = false): string | null {
  const clean = String(pan ?? "").trim().toUpperCase();
  if (!clean) {
    return required ? "Please enter your 10-digit PAN number." : null;
  }
  if (!PAN_REGEX.test(clean)) {
    return "Please enter a valid 10-character Indian PAN (e.g. ABCDE1234F).";
  }
  return null;
}

export function validateAddress(address: unknown, required = false): string | null {
  const clean = String(address ?? "").trim();
  if (!clean) {
    return required ? "Please enter your postal address for the receipt." : null;
  }
  if (clean.length < 5) {
    return "Please provide a complete postal address (at least 5 characters).";
  }
  if (clean.length > 300) {
    return "Address is too long (maximum 300 characters).";
  }
  return null;
}

export { validateUtr } from "./utrValidation";

/** Returns the first failure from a list of checks, or null when all pass. */
export function firstError(...results: (string | null)[]): string | null {
  for (const r of results) if (r) return r;
  return null;
}
