"use client";

/**
 * Which modals may only be opened by a signed-in visitor.
 *
 * The gate is enforced in one place — GlobalModals, the single component that
 * renders these — rather than on each button. Every way in therefore lands on
 * the same check: clicking a button, pasting a deep link, using the back
 * button, or opening a shared URL.
 *
 * "volunteer" is deliberately absent: that modal *is* the sign-in portal, and
 * already shows its login step to anyone who is not authenticated.
 */
export const PROTECTED_MODALS = new Set(["reserve", "attend", "partner"]);

/** Human wording for the prompt, so the reason for signing in is specific. */
export const PROTECTED_MODAL_PROMPTS: Record<string, string> = {
  reserve: "Please sign in to register for this event.",
  attend: "Please sign in to reserve your seat.",
  partner: "Please sign in to apply as a vendor or partner.",
  account: "Please sign in to view your account.",
};

const REDIRECT_KEY = "mahila_post_login_redirect";

export function isProtectedModal(modal: string | null | undefined): boolean {
  return !!modal && PROTECTED_MODALS.has(modal);
}

/**
 * Stores where the visitor was heading so they can be returned there once they
 * sign in. Session-scoped: closing the tab discards it.
 *
 * Only a same-site path is ever stored — anything carrying a scheme or host is
 * refused, so a crafted link cannot turn the login flow into an open redirect.
 */
export function rememberIntendedDestination(url: string): void {
  if (typeof window === "undefined") return;
  if (!url.startsWith("/") || url.startsWith("//")) return;
  try {
    sessionStorage.setItem(REDIRECT_KEY, url);
  } catch {
    // Private-mode storage failure just means we fall back to /account.
  }
}

/** Reads and clears the pending destination. Returns null when there isn't one. */
export function consumeIntendedDestination(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    return url && url.startsWith("/") && !url.startsWith("//") ? url : null;
  } catch {
    return null;
  }
}

export function clearIntendedDestination(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(REDIRECT_KEY);
  } catch {
    // ignore
  }
}
