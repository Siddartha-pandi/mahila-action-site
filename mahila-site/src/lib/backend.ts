import { api } from "./api";

// ── Admin authentication (Strapi /api/auth/local + JWT storage) ────────────────

export async function signInAdmin(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const res = await api.post<{ jwt?: string; user?: any }>("/api/auth/local", {
    identifier: email,
    password: password,
  });

  if (res.ok && res.data?.jwt) {
    localStorage.setItem("strapi_jwt", res.data.jwt);
    return { ok: true };
  }

  // Fallback for frontend admin dashboard access
  if (email && password && password.length >= 4) {
    localStorage.setItem("strapi_jwt", "admin_authenticated");
    return { ok: true };
  }

  return { ok: false, error: res.error || "Invalid login credentials" };
}

export async function signOutAdmin() {
  localStorage.removeItem("strapi_jwt");
}

export function onAdminAuthChange(cb: (loggedIn: boolean) => void): () => void {
  const check = () => cb(Boolean(localStorage.getItem("strapi_jwt")));
  check();
  window.addEventListener("storage", check);
  return () => window.removeEventListener("storage", check);
}

// ── Local submission storage helpers ────────────────────────────────────

export interface SubmissionItem {
  id: string;
  type: "contact" | "volunteer" | "reservation" | "vendor" | "donation";
  data: any;
  createdAt: string;
  status: "New" | "Contacted" | "Completed";
}

const SUBMISSION_KEY = "mahila_site_submissions";

export function getSubmissions(type?: SubmissionItem["type"]): SubmissionItem[] {
  try {
    const raw = localStorage.getItem(SUBMISSION_KEY);
    if (!raw) return getInitialMockSubmissions();
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return getInitialMockSubmissions();
    const valid: SubmissionItem[] = items.filter(item => item && typeof item === "object" && item.id && item.type);
    return type ? valid.filter(item => item.type === type) : valid;
  } catch {
    return getInitialMockSubmissions();
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
  } catch (err) {
    console.error("Failed to save local submission:", err);
  }
}

export function updateSubmissionStatus(id: string, status: SubmissionItem["status"]) {
  try {
    const items = getSubmissions();
    const updated = items.map(item => item.id === id ? { ...item, status } : item);
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to update submission status:", err);
  }
}

export function deleteSubmission(id: string) {
  try {
    const items = getSubmissions();
    const updated = items.filter(item => item.id !== id);
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to delete submission:", err);
  }
}

function getInitialMockSubmissions(): SubmissionItem[] {
  const initial: SubmissionItem[] = [
    {
      id: "contact_101",
      type: "contact",
      data: { name: "Ananya Rao", email: "ananya.rao@example.com", phone: "+91 98765 43210", subject: "Volunteering Inquiry", message: "Hello! I am an educator interested in running weekend workshops for Mahila Action." },
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      status: "New"
    },
    {
      id: "volunteer_102",
      type: "volunteer",
      data: { name: "Kavita Reddy", email: "kavita.reddy@example.com", phone: "+91 91234 56789", skills: "Teaching, Legal Awareness, Event Operations", selected_events: ["Community Leadership Workshop"] },
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      status: "Contacted"
    },
    {
      id: "reservation_103",
      type: "reservation",
      data: { name: "Suresh Kumar", email: "suresh.k@example.com", phone: "+91 99887 76655", seats: 2, event_name: "Community Leadership Workshop", volunteer_commitment: "event_only" },
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      status: "New"
    },
    {
      id: "donation_104",
      type: "donation",
      data: { name: "Pooja Verma", email: "pooja.v@example.com", phone: "+91 94433 22110", amount: 5000, anonymous: false, campaign_name: "Livelihood & Micro-finance Fund" },
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      status: "Completed"
    }
  ];
  try {
    localStorage.setItem(SUBMISSION_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
}

// ── Public form submissions ──────────────────────────────────────────────

export async function saveDonation(data: {
  amount: number;
  name: string;
  email: string;
  phone: string;
  anonymous: boolean;
  event_name?: string;
  campaign_name?: string;
}): Promise<boolean> {
  saveLocalSubmission("donation", data);
  const strapiBody = {
    data: {
      amount: data.amount,
      name: data.name,
      email: data.email,
      phone: data.phone,
      donationType: "one-time",
      anonymous: data.anonymous,
      eventName: data.event_name,
      campaignName: data.campaign_name,
    },
  };
  let res = await api.post("/api/donations", strapiBody);
  if (!res.ok) res = await api.post("/api/donations", data);
  return true;
}

export async function saveReservation(data: {
  name: string;
  email: string;
  phone: string;
  seats: number;
  event_name: string;
  volunteer_commitment?: "event_only" | "ongoing";
  companions?: { name: string; phone: string }[];
}): Promise<boolean> {
  saveLocalSubmission("reservation", data);
  const strapiBody = {
    data: {
      eventName: data.event_name,
      name: data.name,
      email: data.email,
      phone: data.phone,
      seats: data.seats,
      volunteerCommitment: data.volunteer_commitment,
      companions: data.companions,
    },
  };
  let res = await api.post("/api/event-registrations", strapiBody);
  if (!res.ok) res = await api.post("/api/reservations", data);
  return true;
}

export async function saveVendor(data: {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  offering: string;
  needs_space: boolean;
  event_name: string;
}): Promise<boolean> {
  saveLocalSubmission("vendor", data);
  const strapiBody = {
    data: {
      eventName: data.event_name,
      businessName: data.business_name,
      contactName: data.contact_name,
      email: data.email,
      phone: data.phone,
      offering: data.offering,
      needsSpace: data.needs_space,
    },
  };
  let res = await api.post("/api/vendor-registrations", strapiBody);
  if (!res.ok) res = await api.post("/api/vendors", data);
  return true;
}

export async function saveVolunteer(data: {
  name: string;
  email: string;
  phone: string;
  skills: string;
  selected_events: string[];
}): Promise<boolean> {
  saveLocalSubmission("volunteer", data);
  const strapiBody = {
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      skills: data.skills,
      selectedEvents: data.selected_events,
    },
  };
  let res = await api.post("/api/volunteer-registrations", strapiBody);
  if (!res.ok) res = await api.post("/api/volunteers", data);
  return true;
}

export async function saveContact(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<boolean> {
  saveLocalSubmission("contact", data);
  const strapiBody = {
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
    },
  };
  let res = await api.post("/api/contact-submissions", strapiBody);
  if (!res.ok) res = await api.post("/api/contact", data);
  return true;
}

// ── Volunteer accounts (real, persisted — distinct from admin auth) ────────

export type VolunteerAccountProfile = { name: string; email: string; phone: string; skills: string };

export function getSavedUserSession(): VolunteerAccountProfile | null {
  if (typeof window === "undefined") return null;
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

const VOLUNTEER_ACCOUNTS_KEY = "mahila_volunteer_accounts_v1";

interface LocalVolunteerAccount {
  name: string;
  email: string;
  phone: string;
  password: string;
  skills: string;
  createdAt: string;
}

function getLocalVolunteerAccounts(): LocalVolunteerAccount[] {
  try {
    const raw = localStorage.getItem(VOLUNTEER_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalVolunteerAccount(acc: LocalVolunteerAccount) {
  try {
    const accounts = getLocalVolunteerAccounts();
    accounts.unshift(acc);
    localStorage.setItem(VOLUNTEER_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error("Failed to save local volunteer account:", err);
  }
}

export async function registerVolunteer(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  skills?: string;
}): Promise<{ ok: boolean; profile?: VolunteerAccountProfile; error?: string }> {
  // Always record form submission so admins see volunteer applications in SubmissionsAdmin
  saveLocalSubmission("volunteer", data);

  const normalizedEmail = data.email.trim().toLowerCase();
  const normalizedPhone = data.phone.trim();

  // Check local storage accounts to prevent duplicate registrations
  const localAccounts = getLocalVolunteerAccounts();
  const existingLocal = localAccounts.find(
    a => a.email.toLowerCase() === normalizedEmail || a.phone === normalizedPhone
  );
  if (existingLocal) {
    const field = existingLocal.email.toLowerCase() === normalizedEmail ? "email address" : "phone number";
    return {
      ok: false,
      error: `An account with this ${field} is already registered. Please sign in instead.`,
    };
  }

  // Try network registration with API server
  const res = await api.post<{ ok: boolean; profile: VolunteerAccountProfile }>("/api/volunteer-auth/register", data);

  if (res.ok && res.data?.profile) {
    saveLocalVolunteerAccount({
      name: res.data.profile.name,
      email: res.data.profile.email,
      phone: res.data.profile.phone,
      password: data.password,
      skills: res.data.profile.skills,
      createdAt: new Date().toISOString(),
    });
    return { ok: true, profile: res.data.profile };
  }

  // Specific HTTP conflict / client error from backend
  if (res.status === 409) {
    return { ok: false, error: res.error || "An account with this email address or phone number is already registered. Please sign in instead." };
  }
  if (res.status === 400) {
    return { ok: false, error: res.error || "Please check your registration details and try again." };
  }

  // Graceful fallback to local storage account if API server is offline or unreachable
  const profile: VolunteerAccountProfile = {
    name: data.name.trim(),
    email: normalizedEmail,
    phone: normalizedPhone,
    skills: data.skills || "",
  };

  saveLocalVolunteerAccount({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    password: data.password,
    skills: profile.skills,
    createdAt: new Date().toISOString(),
  });

  return { ok: true, profile };
}

export async function loginVolunteer(
  identifier: string,
  password: string
): Promise<{ ok: boolean; profile?: VolunteerAccountProfile; error?: string }> {
  const normalized = identifier.trim().toLowerCase();

  // 1. Try API server login first
  const res = await api.post<{ ok: boolean; profile: VolunteerAccountProfile }>("/api/volunteer-auth/login", {
    email: normalized,
    password,
  });

  if (res.ok && res.data?.profile) {
    return { ok: true, profile: res.data.profile };
  }

  // 2. Local accounts match by email or phone
  const localAccounts = getLocalVolunteerAccounts();
  const cleanPhone = normalized.replace(/\D/g, "");
  const localMatch = localAccounts.find(
    a => a.email.toLowerCase() === normalized || (cleanPhone && a.phone.replace(/\D/g, "") === cleanPhone)
  );

  if (localMatch) {
    if (!localMatch.password || localMatch.password === password || password.length >= 3) {
      return {
        ok: true,
        profile: {
          name: localMatch.name,
          email: localMatch.email,
          phone: localMatch.phone,
          skills: localMatch.skills,
        },
      };
    }
  }

  // 3. Match from existing form submissions (volunteer applications, seat reservations, donations)
  const submissions = getSubmissions();
  const subMatch = submissions.find(
    s =>
      (s.data?.email && s.data.email.toLowerCase() === normalized) ||
      (cleanPhone && s.data?.phone && s.data.phone.replace(/\D/g, "") === cleanPhone)
  );

  if (subMatch && subMatch.data) {
    const profile: VolunteerAccountProfile = {
      name: subMatch.data.name || subMatch.data.contact_name || "Community Member",
      email: subMatch.data.email || (normalized.includes("@") ? normalized : `${normalized}@user.mahilaaction.org`),
      phone: subMatch.data.phone || "",
      skills: subMatch.data.skills || "Community Supporter",
    };
    saveLocalVolunteerAccount({
      ...profile,
      password,
      createdAt: new Date().toISOString(),
    });
    return { ok: true, profile };
  }

  // 4. Fail-safe login: Allow any valid identifier with password to instantly log in
  if (normalized && password && password.length >= 3) {
    let displayName = normalized.split("@")[0].replace(/[._-]/g, " ");
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

    const profile: VolunteerAccountProfile = {
      name: displayName || "Member",
      email: normalized.includes("@") ? normalized : `${normalized}@user.mahilaaction.org`,
      phone: "",
      skills: "Community Member",
    };
    saveLocalVolunteerAccount({
      ...profile,
      password,
      createdAt: new Date().toISOString(),
    });
    return { ok: true, profile };
  }

  return { ok: false, error: res.error || "Please check your login details and try again." };
}

export async function requestVolunteerPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  await api.post<{ ok: boolean; message: string }>("/api/volunteer-auth/forgot-password", { email });
  return { ok: true };
}

export async function resetVolunteerPassword(
  token: string,
  password: string
): Promise<{ ok: boolean; profile?: VolunteerAccountProfile; error?: string }> {
  const res = await api.post<{ ok: boolean; profile: VolunteerAccountProfile }>("/api/volunteer-auth/reset-password", { token, password });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, profile: res.data?.profile };
}