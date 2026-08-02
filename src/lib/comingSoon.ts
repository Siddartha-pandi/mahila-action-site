// ═══════════════════════════════════════════════════════════════════════════
// TEMPORARY FEATURE FREEZE
// ═══════════════════════════════════════════════════════════════════════════
// While we sort out reliable database hosting, every write action across the
// site — public form submissions (donate, volunteer, contact, reservations)
// and admin panel edits — routes through the two helpers below instead of
// hitting the real API. Viewing/reading data is NOT affected, so the public
// site (including Our Impact and Community Stories) keeps displaying content
// normally, and admins can still log in and see current content.
//
// Instead of a toast, these now open the shared <ComingSoonModal /> that's
// mounted once at the root of the app (see App.tsx). Any button, anywhere,
// can also trigger the same modal directly by calling `showComingSoonModal()`
// — this is used for buttons that shouldn't even open their real form/page
// while the freeze is on (e.g. "Become a Volunteer", footer CTAs).
//
// To restore a specific feature, remove the `return comingSoon()` /
// `return comingSoonAuth()` line at the top of that function in
// src/lib/backend.ts, src/lib/content.ts, or src/lib/data.ts — the original
// working code is left untouched (commented out) right below it.
// ═══════════════════════════════════════════════════════════════════════════

type Listener = () => void;

let listener: Listener | null = null;

/** Called once by <ComingSoonModal /> on mount to hook itself up. */
export function registerComingSoonModal(fn: Listener) {
  listener = fn;
}

/** Call this from any button/onClick to open the coming-soon modal directly. */
export function showComingSoonModal() {
  if (listener) listener();
}

/** Use for functions that resolve to a plain boolean (the vast majority). */
export function comingSoon(): false {
  showComingSoonModal();
  return false;
}

/** Use for functions that resolve to an { ok, error } shape (auth-style calls). */
export function comingSoonAuth(): { ok: false; error: string } {
  showComingSoonModal();
  return { ok: false, error: "This feature is temporarily unavailable." };
}
