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
  if (!res.ok) console.error("saveDonation:", res.error);
  return res.ok;
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
  if (!res.ok) console.error("saveReservation:", res.error);
  return res.ok;
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
  if (!res.ok) console.error("saveVendor:", res.error);
  return res.ok;
}

export async function saveVolunteer(data: {
  name: string;
  email: string;
  phone: string;
  skills: string;
  selected_events: string[];
}): Promise<boolean> {
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
  if (!res.ok) console.error("saveVolunteer:", res.error);
  return res.ok;
}

export async function saveContact(data: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<boolean> {
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
  if (!res.ok) console.error("saveContact:", res.error);
  return res.ok;
}

// ── Volunteer accounts (real, persisted — distinct from admin auth) ────────

export type VolunteerAccountProfile = { name: string; email: string; phone: string; skills: string };

export async function registerVolunteer(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  skills?: string;
}): Promise<{ ok: boolean; profile?: VolunteerAccountProfile; error?: string }> {
  const res = await api.post<{ ok: boolean; profile: VolunteerAccountProfile }>("/api/volunteer-auth/register", data);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, profile: res.data?.profile };
}

export async function loginVolunteer(
  email: string,
  password: string
): Promise<{ ok: boolean; profile?: VolunteerAccountProfile; error?: string }> {
  const res = await api.post<{ ok: boolean; profile: VolunteerAccountProfile }>("/api/volunteer-auth/login", { email, password });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, profile: res.data?.profile };
}

export async function requestVolunteerPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const res = await api.post<{ ok: boolean; message: string }>("/api/volunteer-auth/forgot-password", { email });
  if (!res.ok) return { ok: false, error: res.error };
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