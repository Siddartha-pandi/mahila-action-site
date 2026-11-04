import { api } from "./api";

// ── Admin authentication ────────────────

export async function signInAdmin(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!email?.trim() || !password) {
    return { ok: false, error: "Enter your admin email and password." };
  }

  const cleanEmail = email.trim().toLowerCase();
  const res = await api.post<{ ok?: boolean; email?: string; jwt?: string; token?: string }>("/api/auth/login", {
    email: cleanEmail,
    password,
  });

  if (res.ok && res.data?.ok) {
    const token = res.data.jwt || res.data.token;
    if (typeof window !== "undefined") {
      if (token) {
        sessionStorage.setItem("admin_jwt", token);
      }
      localStorage.removeItem("admin_jwt");
      window.dispatchEvent(new Event("mahila_admin_auth_changed"));
      window.dispatchEvent(new Event("storage"));
    }
    return { ok: true };
  }

  if (res.status === 0) {
    return { ok: false, error: "Can't reach the server right now — please check your connection and try again." };
  }
  return { ok: false, error: res.error || "Invalid login credentials" };
}

export async function signOutAdmin() {
  try {
    await api.post("/api/auth/logout");
  } catch {}
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("admin_jwt");
    localStorage.removeItem("admin_jwt");
    window.dispatchEvent(new Event("mahila_admin_auth_changed"));
    window.dispatchEvent(new Event("storage"));
  }
}

export function onAdminAuthChange(cb: (loggedIn: boolean) => void): () => void {
  // Purge any stale legacy localStorage tokens from older builds
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("admin_jwt");
      localStorage.removeItem("mahila_admin_active_session_v1");
    } catch {}
  }

  const check = async () => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("admin_jwt") : null;
    if (!token) {
      cb(false);
      return;
    }

    try {
      const res = await api.get<{ loggedIn?: boolean }>("/api/auth/session");
      if (res.ok && res.data?.loggedIn) {
        cb(true);
        return;
      }
    } catch {}

    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem("admin_jwt");
      } catch {}
    }
    cb(false);
  };

  check();
  window.addEventListener("mahila_admin_auth_changed", check);
  window.addEventListener("storage", check);
  return () => {
    window.removeEventListener("mahila_admin_auth_changed", check);
    window.removeEventListener("storage", check);
  };
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
  { type: "perm_volunteer_request", path: "/api/perm-volunteers" },
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
  const { id, status, created_at, createdAt, request_type, ...rest } = row;
  const resolvedType =
    type === "perm_volunteer_request" && request_type === "deactivate"
      ? "perm_volunteer_deactivate"
      : type;

  return {
    id: String(id),
    type: resolvedType,
    data: {
      ...rest,
      request_type,
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

  const allNetworkFailed = responses.every((r) => !r.ok && r.status === 0);
  if (allNetworkFailed) {
    throw new Error("Could not load submissions from the server.");
  }

  const rawItems = responses.flatMap((res, i) => {
    if (!res.ok || !Array.isArray(res.data)) return [];
    return res.data.map((row) => rowToSubmission(SUBMISSION_SOURCES[i].type, row));
  });

  // Deduplicate items:
  // 1. Volunteer, reservation, and vendor originate from the shared `event_reservations` table.
  //    If a record with the same ID appears under multiple types, prioritize specific types
  //    ('vendor' or 'volunteer') over generic 'reservation'.
  // 2. Prevent exact duplicates (same type + id).
  const seenEventResIds = new Set<string>();
  const seenKeys = new Set<string>();

  const typePriority: Record<string, number> = {
    volunteer: 1,
    vendor: 1,
    reservation: 2,
  };

  const prioritized = [...rawItems].sort((a, b) => {
    const pA = typePriority[a.type] ?? 0;
    const pB = typePriority[b.type] ?? 0;
    return pA - pB;
  });

  const deduped: SubmissionItem[] = [];

  for (const item of prioritized) {
    if (!item || !item.id) continue;
    const isEventRes = item.type === "volunteer" || item.type === "reservation" || item.type === "vendor";
    if (isEventRes) {
      if (seenEventResIds.has(String(item.id))) continue;
      seenEventResIds.add(String(item.id));
    }

    const key = `${item.type}_${item.id}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    deduped.push(item);
  }

  return deduped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const KNOWN_SUBMISSION_TYPES: Set<SubmissionItem["type"]> = new Set([
  "contact",
  "volunteer",
  "reservation",
  "vendor",
  "donation",
  "member",
  "perm_volunteer_request",
  "perm_volunteer_deactivate",
]);

export function isKnownSubmissionType(type?: string): type is SubmissionItem["type"] {
  return typeof type === "string" && KNOWN_SUBMISSION_TYPES.has(type as SubmissionItem["type"]);
}

/**
 * Robustly infers or normalizes a submission's type when the raw stored type
 * is missing, uppercase, legacy (e.g. "attendee"), or corrupted.
 */
export function inferSubmissionType(item?: Partial<SubmissionItem> | null): SubmissionItem["type"] | null {
  if (!item) return null;

  const rawType = String(item.type || "").trim().toLowerCase();
  if (isKnownSubmissionType(rawType)) {
    return rawType;
  }

  // Handle common legacy aliases
  if (rawType === "attendee" || rawType === "booking" || rawType === "rsvp") {
    return "reservation";
  }
  if (rawType === "donor") {
    return "donation";
  }
  if (rawType === "user") {
    return "member";
  }
  if (rawType === "perm_volunteer" || rawType === "perm-volunteer") {
    return item.data?.request_type === "deactivate" ? "perm_volunteer_deactivate" : "perm_volunteer_request";
  }

  // Infer from ID prefix (e.g. donation_123, volunteer_456, etc.)
  const idStr = String(item.id || "").toLowerCase();
  if (idStr.startsWith("donation_")) return "donation";
  if (idStr.startsWith("vendor_")) return "vendor";
  if (idStr.startsWith("reservation_")) return "reservation";
  if (idStr.startsWith("volunteer_")) return "volunteer";
  if (idStr.startsWith("contact_")) return "contact";
  if (idStr.startsWith("member_")) return "member";
  if (idStr.startsWith("perm_volunteer_")) {
    return item.data?.request_type === "deactivate" ? "perm_volunteer_deactivate" : "perm_volunteer_request";
  }

  // Infer from data attributes
  const d = item.data || {};
  if (d.receipt_number || d.amount != null || d.pan_number || d.donation_type) {
    return "donation";
  }
  if (d.business_name || d.offering || d.needs_space != null) {
    return "vendor";
  }
  if (d.seats != null || d.companions != null) {
    return "reservation";
  }
  if (Array.isArray(d.selected_events) && d.selected_events.length > 0) {
    return "volunteer";
  }
  if (d.skills != null && d.skills !== "") {
    return "volunteer";
  }
  if (d.request_type === "deactivate") {
    return "perm_volunteer_deactivate";
  }
  if (d.request_type === "request") {
    return "perm_volunteer_request";
  }
  if (d.subject != null || (d.message != null && !d.skills)) {
    return "contact";
  }

  return null;
}

/** Which API path owns a given submission, for status updates and deletes. */
export function submissionPath(type?: string): string | undefined {
  if (!type) return undefined;
  const cleanType = type.trim().toLowerCase();
  if (cleanType === "perm_volunteer_deactivate" || cleanType === "perm_volunteer_request") {
    return "/api/perm-volunteers";
  }
  if (cleanType === "attendee") {
    return "/api/reservations";
  }
  if (cleanType === "donor") {
    return "/api/donations";
  }
  return SUBMISSION_SOURCES.find((s) => s.type === cleanType)?.path;
}

export async function updateSubmissionStatusRemote(
  item: SubmissionItem,
  status: SubmissionItem["status"]
): Promise<{ ok: boolean; error?: string }> {
  const resolvedType = inferSubmissionType(item) || item.type;
  const path = submissionPath(resolvedType);
  if (!path) {
    // If it's an offline/orphan submission without a server table, update local storage and succeed
    updateSubmissionStatus(item.id, status);
    return { ok: true };
  }
  const res = await api.patch(`${path}/${encodeURIComponent(item.id)}`, { status });
  if (res.ok) {
    updateSubmissionStatus(item.id, status);
  }
  return { ok: res.ok, error: res.error };
}

export async function deleteSubmissionRemote(item: SubmissionItem): Promise<{ ok: boolean; error?: string }> {
  const resolvedType = inferSubmissionType(item) || item.type;
  if (resolvedType === "member" || item.type === "member") {
    return { ok: false, error: "Member accounts can't be deleted here — that would remove their sign-in." };
  }
  const path = submissionPath(resolvedType);
  if (!path) {
    // Unknown or local-only submission with no server table — delete locally so the admin can remove it
    deleteSubmission(item.id);
    return { ok: true };
  }
  const res = await api.del(`${path}/${encodeURIComponent(item.id)}`);
  deleteSubmission(item.id);
  // If the server returns 404 (already deleted or was only local), treat as successful deletion
  if (!res.ok && res.status === 404) {
    return { ok: true };
  }
  return { ok: res.ok, error: res.error };
}

/** Submission types with no server table — they exist only in local storage. */
export const LOCAL_ONLY_SUBMISSION_TYPES: SubmissionItem["type"][] = [];

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
    let valid: SubmissionItem[] = items.filter((item: any) => item && typeof item === "object" && item.id);

    // Clear the seeded demo rows out of browsers that already stored them.
    const withoutMocks = valid.filter(item => !SEEDED_MOCK_IDS.includes(item.id));
    let changed = withoutMocks.length !== valid.length;
    valid = withoutMocks;

    // ── Self-healing: normalize and sanitize submission types ──
    const healed: SubmissionItem[] = [];
    for (const item of valid) {
      const inferred = inferSubmissionType(item);
      if (inferred) {
        if (item.type !== inferred) {
          item.type = inferred;
          changed = true;
        }
        healed.push(item);
      } else if (isKnownSubmissionType(item.type)) {
        healed.push(item);
      } else {
        // Drop unidentifiable corrupt item from local storage
        changed = true;
      }
    }
    valid = healed;

    // ── Migration: remove legacy "Permanent Community Volunteer Membership" entries ──
    const LEGACY_TITLE = "Permanent Community Volunteer Membership";
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

export async function loadUserSubmissions(email?: string, phone?: string): Promise<SubmissionItem[]> {
  if (!email && !phone) return [];
  try {
    // Use the user-scoped endpoint so we don't need admin auth.
    // This fetches only THIS user's own registrations straight from the DB.
    const params = new URLSearchParams();
    if (email) params.set("email", email.trim());
    if (phone) params.set("phone", phone.trim());

    const res = await api.get<any[]>(`/api/my-registrations?${params.toString()}`);

    if (res.ok && Array.isArray(res.data)) {
      // Map DB rows → SubmissionItem shape
      const serverItems: SubmissionItem[] = res.data.map((row: any) => {
        if (row.item_source === "perm_volunteer_request" || row.request_type) {
          const isDeactivate = row.request_type === "deactivate";
          return {
            id: String(row.id),
            type: isDeactivate ? ("perm_volunteer_deactivate" as const) : ("perm_volunteer_request" as const),
            data: {
              name: row.name,
              email: row.email,
              phone: row.phone,
              request_type: row.request_type,
              message: row.message,
            },
            createdAt: row.created_at || new Date().toISOString(),
            status: (row.status as SubmissionItem["status"]) || "New",
          };
        }

        if (row.item_source === "donation") {
          return {
            id: String(row.id),
            type: "donation" as const,
            data: {
              amount: Number(row.amount) || 0,
              name: row.name,
              email: row.email,
              phone: row.phone,
              donation_type: row.donation_type,
              anonymous: row.anonymous === 1 || row.anonymous === true,
              event_name: row.event_name,
              campaign_name: row.campaign_name,
              pan_number: row.pan_number,
              address: row.address,
              payment_method: row.payment_method,
              transaction_id: row.transaction_id,
              receipt_number: row.receipt_number,
            },
            createdAt: row.created_at || new Date().toISOString(),
            status: (row.status as SubmissionItem["status"]) || "Completed",
          };
        }

        return {
          id: String(row.id),
          type: row.volunteer_commitment &&
            row.volunteer_commitment !== "" &&
            row.volunteer_commitment !== "none" &&
            row.volunteer_commitment !== "attendee" &&
            row.volunteer_commitment !== "vendor"
            ? ("volunteer" as const)
            : row.volunteer_commitment === "vendor"
            ? ("vendor" as const)
            : ("reservation" as const),
          data: {
            event_name: row.event_name,
            name: row.name,
            email: row.email,
            phone: row.phone,
            seats: row.seats,
            volunteer_commitment: row.volunteer_commitment,
            companions: (() => {
              try { return JSON.parse(row.companions || "[]"); } catch { return []; }
            })(),
          },
          createdAt: row.created_at || new Date().toISOString(),
          status: (row.status as SubmissionItem["status"]) || "New",
        };
      });

      // Build comprehensive lookup sets from server items to detect any locally mirrored duplicates
      const serverIds = new Set<string>();
      const serverReceipts = new Set<string>();
      const serverTxIds = new Set<string>();

      for (const item of serverItems) {
        if (item.id) serverIds.add(String(item.id));
        if (item.data?.id) serverIds.add(String(item.data.id));
        const rec = item.data?.receipt_number || item.data?.receiptNumber;
        if (rec) serverReceipts.add(String(rec).trim().toLowerCase());
        const tx = item.data?.transaction_id || item.data?.transactionId;
        if (tx) serverTxIds.add(String(tx).trim().toLowerCase());
      }

      // Filter local items: only keep genuine offline/un-synced submissions that are NOT already in serverItems
      const unSyncedLocal: SubmissionItem[] = [];
      const staleLocalIds = new Set<string>();

      for (const s of getUserSubmissions(email, phone)) {
        let isAlreadyOnServer = false;

        // Check ID and data.id
        if (serverIds.has(String(s.id)) || (s.data?.id && serverIds.has(String(s.data.id)))) {
          isAlreadyOnServer = true;
        }

        // For donations: match by receipt number or transaction id
        if (!isAlreadyOnServer && s.type === "donation") {
          const rec = s.data?.receipt_number || s.data?.receiptNumber;
          if (rec && serverReceipts.has(String(rec).trim().toLowerCase())) {
            isAlreadyOnServer = true;
          }
          const tx = s.data?.transaction_id || s.data?.transactionId;
          if (tx && serverTxIds.has(String(tx).trim().toLowerCase())) {
            isAlreadyOnServer = true;
          }
        }

        // For reservations / volunteers: match by event and type if already on server
        if (!isAlreadyOnServer && (s.type === "reservation" || s.type === "volunteer" || s.type === "vendor")) {
          const localEvent = String(s.data?.event_name || s.data?.selected_events || "").trim().toLowerCase();
          if (localEvent) {
            const matchesServer = serverItems.some((srv) => {
              if (srv.type !== s.type) return false;
              const srvEvent = String(srv.data?.event_name || srv.data?.selected_events || "").trim().toLowerCase();
              return srvEvent === localEvent;
            });
            if (matchesServer) {
              isAlreadyOnServer = true;
            }
          }
        }

        // For permanent volunteer requests / deactivations: match by type if already on server
        if (!isAlreadyOnServer && (s.type === "perm_volunteer_request" || s.type === "perm_volunteer_deactivate")) {
          const matchesServer = serverItems.some((srv) => srv.type === s.type);
          if (matchesServer) {
            isAlreadyOnServer = true;
          }
        }

        if (isAlreadyOnServer) {
          staleLocalIds.add(String(s.id));
        } else {
          unSyncedLocal.push(s);
        }
      }

      // Clean up stale mirrored duplicates from localStorage so they don't linger
      if (staleLocalIds.size > 0) {
        try {
          const allStored = getSubmissions();
          const cleaned = allStored.filter((item) => !staleLocalIds.has(String(item.id)));
          if (cleaned.length !== allStored.length) {
            localStorage.setItem(SUBMISSION_KEY, JSON.stringify(cleaned));
          }
        } catch {}
      }

      return [...serverItems, ...unSyncedLocal].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch (err) {
    console.warn("loadUserSubmissions server fetch failed, falling back to localStorage:", err);
  }

  // Fallback: read from localStorage if the server is unreachable
  return getUserSubmissions(email, phone);
}


export function phonesMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const digA = String(a).replace(/\D/g, "");
  const digB = String(b).replace(/\D/g, "");
  if (!digA || !digB) return false;
  if (digA === digB) return true;
  if (digA.length >= 10 && digB.length >= 10) {
    return digA.slice(-10) === digB.slice(-10);
  }
  return false;
}

export function getUserSubmissions(email?: string, phone?: string): SubmissionItem[] {
  const all = getSubmissions();
  if (!email && !phone) return [];
  const normEmail = email ? email.trim().toLowerCase() : "";

  return all.filter(item => {
    const itemEmail = item.data?.email ? item.data.email.toString().trim().toLowerCase() : "";
    const itemPhone = item.data?.phone ? String(item.data.phone) : "";
    if (normEmail && itemEmail === normEmail) return true;
    if (phone && itemPhone && phonesMatch(phone, itemPhone)) return true;
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

export function restoreRawSubmission(item: SubmissionItem) {
  try {
    const items = getSubmissions();
    if (!items.some((s) => String(s.id) === String(item.id))) {
      items.unshift(item);
      localStorage.setItem(SUBMISSION_KEY, JSON.stringify(items));
      notifySubmissionsChanged();
    }
  } catch (err) {
    console.error("Failed to restore raw submission:", err);
  }
}

export function saveLocalSubmission(type: SubmissionItem["type"], data: any) {
  try {
    const items = getSubmissions();
    const serverId = data?.id ? String(data.id) : null;
    const newItem: SubmissionItem = {
      id: serverId || `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      data,
      createdAt: new Date().toISOString(),
      status: "New",
    };

    // If an item with matching serverId, receipt_number, or transaction_id already exists in localStorage,
    // update/replace it rather than creating a duplicate.
    const existingIdx = items.findIndex((it) => {
      if (serverId && (String(it.id) === serverId || String(it.data?.id) === serverId)) return true;
      if (data?.receipt_number && it.data?.receipt_number && String(it.data.receipt_number).toLowerCase() === String(data.receipt_number).toLowerCase()) return true;
      if (data?.transaction_id && it.data?.transaction_id && String(it.data.transaction_id).toLowerCase() === String(data.transaction_id).toLowerCase()) return true;
      return false;
    });

    if (existingIdx >= 0) {
      items[existingIdx] = newItem;
    } else {
      items.unshift(newItem);
    }
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(items));
    notifySubmissionsChanged();
  } catch (err) {
    console.error("Failed to save local submission:", err);
  }
}

export function updateSubmissionStatus(id: string, status: SubmissionItem["status"]) {
  try {
    const raw = localStorage.getItem(SUBMISSION_KEY);
    if (!raw) return;
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return;
    const updated = items.map((item: any) => String(item?.id) === String(id) ? { ...item, status } : item);
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(updated));
    notifySubmissionsChanged();
  } catch (err) {
    console.error("Failed to update submission status:", err);
  }
}

export function deleteSubmission(id: string) {
  try {
    const raw = localStorage.getItem(SUBMISSION_KEY);
    if (!raw) return;
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return;
    const updated = items.filter((item: any) => String(item?.id) !== String(id));
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
// while the app used a separate frontend API URL. The Next.js app now uses
// same-origin API routes by default, so nothing needs a separate Vite server.
// was sent.

/** What a public form submission reports back — `error` carries the server's own
 *  wording, so a rejected duplicate can say why rather than "try again". */
export type SaveResult = { ok: boolean; error?: string; id?: string | number; receipt_number?: string; data?: any };

/**
 * Post, then mirror locally only if the server accepted it. The mirror used to
 * be written first, unconditionally: a submission the server rejected — an
 * already-registered duplicate, say — still showed up under "My Registered
 * Events" as though it had gone through.
 */
async function submitForm(type: SubmissionItem["type"], path: string, payload: any): Promise<SaveResult> {
  const res = await api.post<any>(path, payload);
  if (res.ok) {
    saveLocalSubmission(type, {
      ...payload,
      id: res.data?.id,
      receipt_number: res.data?.receipt_number,
    });
    notifySubmissionsChanged();

    // Immediately reflect reserved seats on the cached event so available seats update in real time
    if (type === "reservation" && (payload.event_name || payload.event_id)) {
      try {
        const rawSite = localStorage.getItem("mahila_site_data_v2");
        if (rawSite) {
          const site = JSON.parse(rawSite);
          const seats = Number(payload.seats) || 1;
          const normTitle = String(payload.event_name || "").trim().toLowerCase();
          const targetId = payload.event_id != null ? String(payload.event_id).replace(/^evt_/, "") : "";
          let modified = false;
          const updatedEvents = (site.events ?? []).map((e: any) => {
            const eId = String(e.id).replace(/^evt_/, "");
            const matches = (targetId && eId === targetId) || (e.title && e.title.trim().toLowerCase() === normTitle);
            if (matches) {
              modified = true;
              const newBooked = (Number(e.bookedSeats) || 0) + seats;
              const newAvail = Math.max(0, (Number(e.totalSeats) || 0) - newBooked);
              return { ...e, bookedSeats: newBooked, availableSeats: newAvail };
            }
            return e;
          });
          if (modified) {
            site.events = updatedEvents;
            localStorage.setItem("mahila_site_data_v2", JSON.stringify(site));
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("mahila_sitedata_changed"));
            }
          }
        }
      } catch {}
    }

    return { ok: true, id: res.data?.id, receipt_number: res.data?.receipt_number, data: res.data };
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
  pan_number?: string;
  address?: string;
  payment_method?: string;
  transaction_id?: string;
  notes?: string;
}): Promise<SaveResult> {
  return submitForm("donation", "/api/donations", { donation_type: "one-time" as const, ...data });
}

export async function saveReservation(data: {
  name: string;
  email: string;
  phone: string;
  seats: number;
  event_name: string;
  event_id?: string | number;
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

/**
 * Re-reads the signed-in person's own profile from the server and updates the
 * stored session, so details they changed elsewhere are what forms prefill from
 * next time. Only ever asks for the email already held in this browser's
 * session, so it cannot be pointed at anybody else's account.
 *
 * Returns null when nobody is signed in, or when the account no longer exists —
 * in which case the stale session is dropped rather than left to prefill from.
 */
export async function refreshUserProfile(): Promise<VolunteerAccountProfile | null> {
  const current = getSavedUserSession();
  if (!current?.email) return null;

  const res = await api.post<{ ok: boolean; exists: boolean; profile?: Partial<VolunteerAccountProfile> }>(
    "/api/volunteer-auth/session",
    { email: current.email }
  );

  if (!res.ok || !res.data?.exists) {
    saveUserSession(null);
    return null;
  }

  const fresh = res.data.profile;
  if (!fresh) return current;

  // A column that is null in the database becomes an empty string, so a missing
  // detail leaves its field blank instead of prefilling the old cached value.
  const merged: VolunteerAccountProfile = {
    name: fresh.name ?? "",
    email: fresh.email ?? current.email,
    phone: fresh.phone ?? "",
    skills: fresh.skills ?? "",
  };

  if (JSON.stringify(merged) !== JSON.stringify(current)) {
    saveUserSession(merged);
  }
  return merged;
}

export async function validateUserSession(): Promise<boolean> {
  const current = getSavedUserSession();
  if (!current?.email) return false;

  const res = await api.post<{ ok: boolean; exists: boolean }>("/api/volunteer-auth/session", { email: current.email });
  if (!res.ok || !res.data?.exists) {
    saveUserSession(null);
    return false;
  }
  return true;
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

export async function savePermVolunteerRequest(data: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}): Promise<SaveResult> {
  return submitForm("perm_volunteer_request", "/api/perm-volunteers", { ...data, request_type: "activate" });
}

export function getUserPermVolunteerRequest(
  email?: string,
  phone?: string
): SubmissionItem | null {
  const all = getSubmissions("perm_volunteer_request");
  if (!email && !phone) return null;
  const normEmail = email ? email.trim().toLowerCase() : "";

  const match = all.find((item) => {
    const itemEmail = item.data?.email ? item.data.email.toString().trim().toLowerCase() : "";
    const itemPhone = item.data?.phone ? String(item.data.phone) : "";
    if (normEmail && itemEmail === normEmail) return true;
    if (phone && itemPhone && phonesMatch(phone, itemPhone)) return true;
    return false;
  });

  return match ?? null;
}

export function getUserPermVolunteerRequestFromList(
  all: SubmissionItem[],
  email?: string,
  phone?: string
): SubmissionItem | null {
  if (!email && !phone) return null;
  const normEmail = email ? email.trim().toLowerCase() : "";

  const match = all.find((item) => {
    if (item.type !== "perm_volunteer_request") return false;
    const itemEmail = item.data?.email ? item.data.email.toString().trim().toLowerCase() : "";
    const itemPhone = item.data?.phone ? String(item.data.phone) : "";
    if (normEmail && itemEmail === normEmail) return true;
    if (phone && itemPhone && phonesMatch(phone, itemPhone)) return true;
    return false;
  });

  return match ?? null;
}

// ── Permanent Volunteer Deactivation Requests ───────────────────────────────

export async function savePermVolunteerDeactivateRequest(data: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}): Promise<SaveResult> {
  return submitForm("perm_volunteer_deactivate", "/api/perm-volunteers", { ...data, request_type: "deactivate" });
}

export function getUserPermVolunteerDeactivateRequest(
  email?: string,
  phone?: string
): SubmissionItem | null {
  const all = getSubmissions("perm_volunteer_deactivate");
  if (!email && !phone) return null;
  const normEmail = email ? email.trim().toLowerCase() : "";

  const match = all.find((item) => {
    const itemEmail = item.data?.email ? item.data.email.toString().trim().toLowerCase() : "";
    const itemPhone = item.data?.phone ? String(item.data.phone) : "";
    if (normEmail && itemEmail === normEmail) return true;
    if (phone && itemPhone && phonesMatch(phone, itemPhone)) return true;
    return false;
  });

  return match ?? null;
}

export function getUserPermVolunteerDeactivateRequestFromList(
  all: SubmissionItem[],
  email?: string,
  phone?: string
): SubmissionItem | null {
  if (!email && !phone) return null;
  const normEmail = email ? email.trim().toLowerCase() : "";

  const match = all.find((item) => {
    if (item.type !== "perm_volunteer_deactivate") return false;
    const itemEmail = item.data?.email ? item.data.email.toString().trim().toLowerCase() : "";
    const itemPhone = item.data?.phone ? String(item.data.phone) : "";
    if (normEmail && itemEmail === normEmail) return true;
    if (phone && itemPhone && phonesMatch(phone, itemPhone)) return true;
    return false;
  });

  return match ?? null;
}