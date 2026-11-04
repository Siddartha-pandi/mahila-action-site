/**
 * Indian UPI UTR (Unique Transaction Reference) & Banking Reference Validator
 *
 * UPI UTRs are 12-digit numeric codes issued by NPCI and banks (e.g. 412356789012).
 * Bank reference / NEFT / IMPS IDs can be 8–24 alphanumeric characters.
 */
export function validateUtr(utr: unknown, required = true): string | null {
  const clean = String(utr ?? "").trim();
  if (!clean) {
    return required ? "Please enter the UPI Reference / UTR Number." : null;
  }
  if (!/^[a-zA-Z0-9]+$/.test(clean)) {
    return "UTR number should only contain numbers and letters.";
  }
  if (clean.length < 8 || clean.length > 24) {
    return "Please enter a valid 12-digit UPI UTR number.";
  }
  if (/^(\w)\1+$/.test(clean)) {
    return "Please enter an authentic UTR number (not repetitive digits).";
  }
  const dummies = [
    "123456789012",
    "012345678901",
    "987654321098",
    "000012345678",
    "112233445566",
  ];
  if (dummies.includes(clean)) {
    return "Please enter the authentic UTR number from your UPI payment app.";
  }
  return null;
}

