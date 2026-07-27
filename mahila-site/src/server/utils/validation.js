export function isValidPhoneNumber(phone) {
  if (!phone || typeof phone !== "string") return false;
  const trimmed = phone.trim();

  // Allow optional leading '+', then digits, spaces, hyphens, dots, or parentheses
  if (!/^\+?[\d\s\-\.\(\)]+$/.test(trimmed)) return false;

  const digitsOnly = trimmed.replace(/\D/g, "");

  // Standard phone numbers must have between 10 and 15 digits
  if (digitsOnly.length < 10 || digitsOnly.length > 15) return false;

  // Reject repetitive invalid numbers (e.g. 0000000000, 1111111111)
  if (/^(\d)\1+$/.test(digitsOnly)) return false;

  return true;
}
