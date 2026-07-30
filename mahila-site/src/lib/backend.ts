import { api } from "./api";

// ── Admin authentication ────────────────

export async function signInAdmin(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!email?.trim() || !password) {
    return { ok: false, error: "Enter your admin email and password." };
  }

  // The server is the only authority on credentials. There is deliberately no
  // local fallback here — one used to let any known-looking identifier in with
  // any 4-character password.
  const res = await api.post<{ ok?: boolean; email?: string; jwt?: string; token?: string }>("/api/auth/login", {
    email,
    password,
  });

  if (res.ok && res.data?.ok) {
    // Real authentication lives in the httpOnly cookie the server just set.
    // This value is only a flag telling the UI to render the admin views.
    localStorage.setItem("admin_jwt", res.data.jwt || res.data.token || "session");
    return { ok: true };
  }

  if (res.status === 0) {
    return { ok: false, error: "Can't reach the server right now — please check your connection and try again." };
  }
  return { ok: false, error: res.error || "Invalid login credentials" };
}

export async function signOutAdmin() {
  localStorage.removeItem("admin_jwt");
}

export function onAdminAuthChange(cb: (loggedIn: boolean) => void): () => void {
  const check = () => cb(Boolean(localStorage.getItem("admin_jwt")));
  check();
  window.addEventListener("storage", check);
  return () => window.removeEventListener("storage", check);
}

// ── Local submission storage helpers ────────────────────────────────────

export interface SubmissionItem {
  id: string;
  /** "member" is an account signup — distinct from "volunteer", which is an
   *  application to help at specific events.
   *  "perm_volunteer_request" is a user-initiated request for Permanent Volunteer
   *  status — accepted (Completed) or rejected (Contacted) by admin. */
  type: "contact" | "volunteer" | "reservation" | "vendor" | "donation" | "member" | "perm_volunteer_request" | "perm_volunteer_deactivate";
  data: any;
  createdAt: string;
  status: "New" | "Contacted" | "Completed";
}

/** How someone can take part in a single event. */
export type RegistrationRole = "volunteer" | "vendor" | "donor" | "attendee";

export function normalizeEventTitle(title?: string): string {
  return String(title ?? "").trim().toLowerCase();
}

/** Stable identity for "this person, this event, this role". */
export function registrationKey(role: RegistrationRole, eventTitle?: string): string {
  return `${role}::${normalizeEventTitle(eventTitle)}`;
}

/**
 * The (role, event) pairs a person has already signed up for. Used to stop the
 * same event being registered twice — the account dashboard was happy to file
 * the same volunteer application over and over.
 *
 * Donations are deliberately excluded: giving twice is not a duplicate.
 */
export function getRegisteredRoleKeys(submissions: SubmissionItem[]): Set<string> {
  const keys = new Set<string>();
  for (const sub of submissions) {
    if (sub.type === "volunteer") {
      const events: string[] = Array.isArray(sub.data?.selected_events)
        ? sub.data.selected_events
        : sub.data?.event_name
        ? [sub.data.event_name]
        : [];
      events.forEach((title) => keys.add(registrationKey("volunteer", title)));
    } else if (sub.type === "vendor") {
      keys.add(registrationKey("vendor", sub.data?.event_name));
    } else if (sub.type === "reservation") {
      // The event modal files its volunteer tab as a reservation with a
      // commitment set; everything else is a plain attendee booking.
      keys.add(registrationKey(sub.data?.volunteer_commitment ? "volunteer" : "attendee", sub.data?.event_name));
    }
  }
  return keys;
}

const SUBMISSION_KEY = "mahila_site_submissions";

// ── Server-backed submissions (the admin panel's source of truth) ───────────
//
// Local storage only ever holds what the current browser submitted, so the
// admin panel used to show a different, partial list on every machine. These
// endpoints read the shared database instead.

const SUBMISSION_SOURCES: { type: SubmissionItem["type"]; path: string }[] = [
  { type: "member", path: "/api/members" },
  { type: "volunteer", path: "/api/volunteers" },
  { type: "reservation", path: "/api/reservations" },
  { type: "vendor", path: "/api/vendors" },
  { type: "donation", path: "/api/donations" },
  { type: "contact", path: "/api/contact" },
];

function parseJsonColumn(value: any, fallback: any) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function rowToSubmission(type: SubmissionItem["type"], row: any): SubmissionItem {
  const { id, status, created_at, createdAt, ...rest } = row;
  return {
    id: String(id),
    type,
    data: {
      ...rest,
      companions: parseJsonColumn(rest.companions, []),
      selected_events: parseJsonColumn(rest.selected_events, []),
      anonymous: rest.anonymous === 1 || rest.anonymous === true,
      needs_space: rest.needs_space === 1 || rest.needs_space === true,
    },
    createdAt: created_at || createdAt || new Date().toISOString(),
    status: (status as SubmissionItem["status"]) || "New",
  };
}

/**
 * Every submission across all six tables, newest first. Throws if the server
 * can't be reached so the caller can fall back to the local mirror rather than
 * silently showing an empty panel.
 */
export async function loadSubmissions(): Promise<SubmissionItem[]> {
  const responses = await Promise.all(SUBMISSION_SOURCES.map((s) => api.get<any[]>(s.path)));

  const failed = responses.find((r) => !r.ok);
  if (failed) {
    throw new Error(failed.error || "Could not load submissions from the server.");
  }

  const items = responses.flatMap((res, i) => {
    const rows = Array.isArray(res.data) ? res.data : [];
    return rows.map((row) => rowToSubmission(SUBMISSION_SOURCES[i].type, row));
  });

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Which API path owns a given submission, for status updates and deletes. */
function submissionPath(type: SubmissionItem["type"]) {
  return SUBMISSION_SOURCES.find((s) => s.type === type)?.path;
}

export async function updateSubmissionStatusRemote(
  item: SubmissionItem,
  status: SubmissionItem["status"]
): Promise<{ ok: boolean; error?: string }> {
  const path = submissionPath(item.type);
  if (!path) return { ok: false, error: "Unknown submission type." };
  const res = await api.patch(`${path}/${encodeURIComponent(item.id)}`, { status });
  return { ok: res.ok, error: res.error };
}

export async function deleteSubmissionRemote(item: SubmissionItem): Promise<{ ok: boolean; error?: string }> {
  if (item.type === "member") {
    return { ok: false, error: "Member accounts can't be deleted here — that would remove their sign-in." };
  }
  const path = submissionPath(item.type);
  if (!path) return { ok: false, error: "Unknown submission type." };
  const res = await api.del(`${path}/${encodeURIComponent(item.id)}`);
  return { ok: res.ok, error: res.error };
}

/** Submission types with no server table — they exist only in local storage. */
export const LOCAL_ONLY_SUBMISSION_TYPES: SubmissionItem["type"][] = [
  "perm_volunteer_request",
  "perm_volunteer_deactivate",
];

// Demo rows ("Ananya Rao", "Kavita Reddy", "Suresh Kumar", "Pooja Verma") used
// to be written into local storage whenever it was empty. The admin panel paints
// from local storage first, so an empty database still showed four invented
// submissions — which then vanished the moment anyone pressed Refresh and the
// real (empty) server response arrived.
const SEEDED_MOCK_IDS = ["contact_101", "volunteer_102", "reservation_103", "donation_104"];

export function getSubmissions(type?: SubmissionItem["type"]): SubmissionItem[] {
  try {
    const raw = localStorage.getItem(SUBMISSION_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    let valid: SubmissionItem[] = items.filter((item: any) => item && typeof item === "object" && item.id && item.type);

    // Clear the seeded demo rows out of browsers that already stored them.
    const withoutMocks = valid.filter(item => !SEEDED_MOCK_IDS.includes(item.id));
    if (withoutMocks.length !== valid.length) {
      valid = withoutMocks;
      localStorage.setItem(SUBMISSION_KEY, JSON.stringify(valid));
    }

    // ── Migration: remove legacy "Permanent Community Volunteer Membership" entries ──
    const LEGACY_TITLE = "Permanent Community Volunteer Membership";
    let changed = false;
    valid = valid.filter(item => {
      if (item.type !== "volunteer") return true;
      const events: string[] = Array.isArray(item.data?.selected_events) ? item.data.selected_events : [];
      // Drop the entire submission if all it has is the legacy title
      if (events.length > 0 && events.every((e: string) => e === LEGACY_TITLE)) {
        changed = true;
        return false;
      }
      // Strip the legacy title from mixed arrays
      if (events.includes(LEGACY_TITLE)) {
        item.data.selected_events = events.filter((e: string) => e !== LEGACY_TITLE);
        changed = true;
      }
      return true;
    });
    if (changed) {
      localStorage.setItem(SUBMISSION_KEY, JSON.stringify(valid));
    }

    return type ? valid.filter(item => item.type === type) : valid;
  } catch {
    return [];
  }
}

export function getUserSubmissions(email?: string, phone?: string): SubmissionItem[] {
  const all = getSubmissions();
  if (!email && !phone) return [];
  const normEmail = email ? email.trim().toLowerCase() : "";
  const normPhone = phone ? phone.trim().replace(/\s+/g, "") : "";

  return all.filter(item => {
    const itemEmail = item.data?.email ? item.data.email.toString().trim().toLowerCase() : "";
    const itemPhone = item.data?.phone ? item.data.phone.toString().trim().replace(/\s+/g, "") : "";
    if (normEmail && itemEmail === normEmail) return true;
    if (normPhone && itemPhone === normPhone) return true;
    return false;
  });
}

function notifySubmissionsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("mahila_submissions_changed"));
  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel("mahila_live_channel");
      bc.postMessage("submissions_updated");
      bc.close();
    }
  } catch {}
}

export function saveLocalSubmission(type: SubmissionItem["type"], data: any) {
  try {
    const items = getSubmissions();
    const newItem: SubmissionItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      data,
      createdAt: new Date().toISOString(),
      status: "New",
    };
    items.unshift(newItem);
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(items));
    notifySubmissionsChanged();
  } catch (err) {
    console.error("Failed to save local submission:", err);
  }
}

export function updateSubmissionStatus(id: string, status: SubmissionItem["status"]) {
  try {
    const items = getSubmissions();
    const updated = items.map(item => item.id === id ? { ...item, status } : item);
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(updated));
    notifySubmissionsChanged();
  } catch (err) {
    console.error("Failed to update submission status:", err);
  }
}

export function deleteSubmission(id: string) {
  try {
    const items = getSubmissions();
    const updated = items.filter(item => item.id !== id);
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(updated));
    notifySubmissionsChanged();
  } catch (err) {
    console.error("Failed to delete submission:", err);
  }
}

// ── Public form submissions ──────────────────────────────────────────────

// Each submission is posted to the API, which persists it and sends the
// confirmation email, and is then mirrored locally (that mirror is what "My
// Account" reads). These posts used to be wrapped in `if (BASE_URL)`, and
// BASE_URL is always "" in the browser — Next only exposes NEXT_PUBLIC_* vars,
// while .env sets VITE_API_URL. So nothing ever reached the server and no email
// was sent.

/** What a public form submission reports back — `error` carries the server's own
 *  wording, so a rejected duplicate can say why rather than "try again". */
export type SaveResult = { ok: boolean; error?: string };

/**
 * Post, then mirror locally only if the server accepted it. The mirror used to
 * be written first, unconditionally: a submission the server rejected — an
 * already-registered duplicate, say — still showed up under "My Registered
 * Events" as though it had gone through.
 */
async function submitForm(type: SubmissionItem["type"], path: string, payload: any): Promise<SaveResult> {
  const res = await api.post(path, payload);
  if (res.ok) {
    saveLocalSubmission(type, payload);
    return { ok: true };
  }
  if (res.status === 0) {
    return { ok: false, error: "Can't reach the server right now — please check your connection and try again." };
  }
  return { ok: false, error: res.error || "Something went wrong submitting the form — please try again." };
}

export async function saveDonation(data: {
  amount: number;
  name: string;
  email: string;
  phone: string;
  anonymous: boolean;
  donation_type?: "one-time" | "monthly";
  event_name?: string;
  campaign_name?: string;
}): Promise<SaveResult> {
  return submitForm("donation", "/api/donations", { donation_type: "one-time" as const, ...data });
}

export async function saveReservation(data: {
  name: string;
  email: string;
  phone: string;
  seats: number;
  event_name: string;
  volunteer_commitment?: "event_only" | "ongoing";
  companions?: { name: string; phone: string }[];
}): Promise<SaveResult> {
  return submitForm("reservation", "/api/reservations", data);
}

export async function saveVendor(data: {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  offering: string;
  needs_space: boolean;
  event_name: string;
}): Promise<SaveResult> {
  return submitForm("vendor", "/api/vendors", data);
}

export async function saveVolunteer(data: {
  name: string;
  email: string;
  phone: string;
  skills: string;
  volunteer_commitment?: string;
  selected_events: string[];
}): Promise<SaveResult> {
  return submitForm("volunteer", "/api/volunteers", data);
}

export async function saveContact(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<SaveResult> {
  return submitForm("contact", "/api/contact", data);
}

// ── Volunteer accounts (real, persisted — distinct from admin auth) ────────

export type VolunteerAccountProfile = { name: string; email: string; phone: string; skills: string };

// Older builds cached volunteer accounts — including plaintext passwords — in
// local storage so sign-in could work offline. Nothing reads them any more, so
// clear the leftovers from browsers that still have them.
const LEGACY_VOLUNTEER_ACCOUNTS_KEY = "mahila_volunteer_accounts_v1";

function purgeLegacyVolunteerAccounts() {
  try {
    if (localStorage.getItem(LEGACY_VOLUNTEER_ACCOUNTS_KEY)) {
      localStorage.removeItem(LEGACY_VOLUNTEER_ACCOUNTS_KEY);
    }
  } catch {
    // ignore
  }
}

export function getSavedUserSession(): VolunteerAccountProfile | null {
  if (typeof window === "undefined") return null;
  purgeLegacyVolunteerAccounts();
  try {
    const raw = localStorage.getItem("mahila_user_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserSession(session: VolunteerAccountProfile | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      localStorage.setItem("mahila_user_session", JSON.stringify(session));
    } else {
      localStorage.removeItem("mahila_user_session");
    }
  } catch (err) {
    console.error("Failed to update user session:", err);
  }
  window.dispatchEvent(new Event("mahila_user_session_changed"));
  window.dispatchEvent(new Event("storage"));
}

export async function registerVolunteer(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  skills?: string;
}): Promise<{ ok: boolean; profile?: VolunteerAccountProfile; error?: string }> {
  const res = await api.post<{ ok: boolean; profile: VolunteerAccountProfile }>("/api/volunteer-auth/register", data);

  if (res.ok && res.data?.profile) {
    // Recorded as "member", not "volunteer" — creating an account is not the
    // same as applying to help at an event, and filing it as the latter made
    // people look like they had registered twice. Note the password is
    // deliberately left out — it must never reach local storage.
    const { password: _password, ...application } = data;
    saveLocalSubmission("member", application);
    return { ok: true, profile: res.data.profile };
  }

  if (res.status === 0) {
    return { ok: false, error: "Can't reach the server right now — please check your connection and try again." };
  }
  // 409 (duplicate email/phone) and 400 (validation) already carry a usable message.
  return { ok: false, error: res.error || "Something went wrong creating your account — please try again." };
}

export async function loginVolunteer(
  identifier: string,
  password: string
): Promise<{ ok: boolean; profile?: VolunteerAccountProfile; error?: string }> {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized || !password) {
    return { ok: false, error: "Enter your email address and password." };
  }

  const res = await api.post<{ ok: boolean; profile: VolunteerAccountProfile }>("/api/volunteer-auth/login", {
    email: normalized,
    password,
  });

  if (res.ok && res.data?.profile) {
    return { ok: true, profile: res.data.profile };
  }

  // A rejected sign-in must stay rejected. Earlier versions fell through to a
  // local-storage match, then to any past form submission, then finally let any
  // identifier in with a 3-character password — so visitors who had never
  // registered were signed in as full members.
  if (res.status === 0) {
    return { ok: false, error: "Can't reach the server right now — please check your connection and try again." };
  }
  return { ok: false, error: res.error || "Incorrect email or password." };
}

export async function requestVolunteerPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const res = await api.post<{ ok: boolean; message: string }>("/api/volunteer-auth/forgot-password", { email });

  // Previously the response was discarded and this always reported success, so a
  // failed request still showed the "Check your email" screen.
  if (res.ok) return { ok: true };

  if (res.status === 0) {
    return { ok: false, error: "Can't reach the server right now — please check your connection and try again." };
  }
  return { ok: false, error: res.error || "Something went wrong — please try again." };
}

export async function resetVolunteerPassword(
  token: string,
  password: string
): Promise<{ ok: boolean; profile?: VolunteerAccountProfile; error?: string }> {
  const res = await api.post<{ ok: boolean; profile: VolunteerAccountProfile }>("/api/volunteer-auth/reset-password", { token, password });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, profile: res.data?.profile };
}

// ── Permanent Volunteer Requests ───────────────────────────────────────────
//
// Users submit a perm_volunteer_request via their Account page. Admin staff
// accept (status → "Completed") or reject (status → "Contacted") it.
// The badge on the user's profile is driven purely by the resolved status.

export function savePermVolunteerRequest(data: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}) {
  saveLocalSubmission("perm_volunteer_request", data);
}

/**
 * Returns the most recent perm_volunteer_request for the given user,
 * or null if they have never submitted one.
 */
export function getUserPermVolunteerRequest(
  email?: string,
  phone?: string
): SubmissionItem | null {
  const all = getSubmissions("perm_volunteer_request");
  if (!email && !phone) return null;
  const normEmail = email ? email.trim().toLowerCase() : "";
  const normPhone = phone ? phone.trim().replace(/\s+/g, "") : "";

  const match = all.find((item) => {
    const itemEmail = item.data?.email ? item.data.email.toString().trim().toLowerCase() : "";
    const itemPhone = item.data?.phone ? item.data.phone.toString().trim().replace(/\s+/g, "") : "";
    if (normEmail && itemEmail === normEmail) return true;
    if (normPhone && itemPhone === normPhone) return true;
    return false;
  });

  return match ?? null;
}

// ── Permanent Volunteer Deactivation Requests ───────────────────────────────
//
// An approved permanent volunteer can request to be deactivated.
// Admin accepts (status → "Completed") — badge disappears.
// Admin rejects (status → "Contacted") — they stay permanent volunteer.

export function savePermVolunteerDeactivateRequest(data: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}) {
  saveLocalSubmission("perm_volunteer_deactivate", data);
}

/**
 * Returns the most recent perm_volunteer_deactivate request for the given user,
 * or null if they have never submitted one.
 */
export function getUserPermVolunteerDeactivateRequest(
  email?: string,
  phone?: string
): SubmissionItem | null {
  const all = getSubmissions("perm_volunteer_deactivate");
  if (!email && !phone) return null;
  const normEmail = email ? email.trim().toLowerCase() : "";
  const normPhone = phone ? phone.trim().replace(/\s+/g, "") : "";

  const match = all.find((item) => {
    const itemEmail = item.data?.email ? item.data.email.toString().trim().toLowerCase() : "";
    const itemPhone = item.data?.phone ? item.data.phone.toString().trim().replace(/\s+/g, "") : "";
    if (normEmail && itemEmail === normEmail) return true;
    if (normPhone && itemPhone === normPhone) return true;
    return false;
  });

  return match ?? null;
}