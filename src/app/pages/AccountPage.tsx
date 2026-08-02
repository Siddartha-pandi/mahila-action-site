"use client";

import { useState, useEffect, useMemo } from "react";
import { LogIn, LogOut, User, CheckCircle, UserCheck, Heart, Plus, Calendar, Clock, MapPin, Star, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getSavedUserSession, saveUserSession, validateUserSession,
  getUserSubmissions, loadUserSubmissions, savePermVolunteerRequest, getUserPermVolunteerRequest,
  savePermVolunteerDeactivateRequest, getUserPermVolunteerDeactivateRequest,
  getRegisteredRoleKeys, registrationKey, normalizeEventTitle,
  type VolunteerAccountProfile, type SubmissionItem, type RegistrationRole,
} from "@/lib/backend";
import { isEventOpen } from "@/lib/data";
import { useSiteData } from "../context/SiteDataContext";
import { useModal } from "../hooks/useModal";
import { EventRegistrationModal } from "../modals/EventRegistrationModal";
import { PageBanner } from "../components/PageBanner";
import { type Page } from "../components/shared/styleHelpers";

const ROLE_LABEL: Record<RegistrationRole, string> = {
  volunteer: "Volunteer",
  vendor: "Vendor",
  donor: "Donor",
  attendee: "Attendee",
};

export function AccountPage({ setPage }: { setPage: (p: Page) => void }) {
  const siteData = useSiteData();
  const { openModal } = useModal();
  const [profile, setProfile] = useState<VolunteerAccountProfile | null>(() => getSavedUserSession());
  const [dashTab, setDashTab] = useState<"registered" | "donations" | "browse" | "perm">("registered");
  const [filter, setFilter] = useState<"all" | "ongoing" | "upcoming">("all");
  /** Event the registration form is open for — registering is one event at a
   *  time now, because each role asks for different details. */
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userSubmissions, setUserSubmissions] = useState<SubmissionItem[]>([]);
  const [requestMsg, setRequestMsg] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [reApplying, setReApplying] = useState(false);

  useEffect(() => {
    async function syncSession() {
      try {
        const current = getSavedUserSession();
        if (current) {
          const isValid = await validateUserSession();
          if (!isValid) return;
        }
        setProfile(current);
        if (current) {
          const subs = await loadUserSubmissions(current.email, current.phone);
          setUserSubmissions(subs);
        }
      } catch (err) {
        console.warn("Error syncing user session/submissions:", err);
      }
    }
    syncSession();

    // Auto-refresh every 1 minute so perm volunteer badge updates without a manual reload
    const interval = setInterval(syncSession, 60000);

    window.addEventListener("mahila_user_session_changed", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      clearInterval(interval);
      window.removeEventListener("mahila_user_session_changed", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [refreshKey]);

  function handleSignOut() {
    saveUserSession(null);
    setProfile(null);
    setRegisteringEventId(null);
    toast.success("Signed out successfully");
    setPage("home");
  }

  const registeredEventsList = useMemo(() => {
    if (!profile) return [];
    const list: {
      id: string;
      title: string;
      createdAt: string;
      typeLabel: string;
      details?: string;
      status: string;
    }[] = [];

    userSubmissions.forEach(sub => {
      if (sub.type === "volunteer") {
        const eventsArr: string[] = (Array.isArray(sub.data?.selected_events)
          ? sub.data.selected_events
          : sub.data?.event_name
          ? [sub.data.event_name]
          : []
        ).filter((t: string) => t !== "Permanent Community Volunteer Membership");
        eventsArr.forEach((title, idx) => {
          list.push({
            id: `${sub.id}_${idx}`,
            title,
            createdAt: sub.createdAt,
            typeLabel: "Volunteer",
            details: sub.data?.skills ? `Skills: ${sub.data.skills}` : "Community Volunteer",
            status: "Active",
          });
        });
      } else if (sub.type === "reservation") {
        list.push({
          id: sub.id,
          title: sub.data?.event_name || "Community Event",
          createdAt: sub.createdAt,
          typeLabel: sub.data?.volunteer_commitment ? "Volunteer" : "Attendee",
          details: `${sub.data?.seats || 1} Seat(s) Reserved ${sub.data?.volunteer_commitment === "ongoing" ? "· Ongoing Volunteer" : ""}`,
          status: sub.status || "Confirmed",
        });
      } else if (sub.type === "vendor") {
        list.push({
          id: sub.id,
          title: sub.data?.event_name || "Event Support",
          createdAt: sub.createdAt,
          typeLabel: "Vendor / Partner Application",
          details: `Business: ${sub.data?.business_name || ""} (${sub.data?.offering || ""})`,
          status: sub.status || "Under Review",
        });
      }
    });

    // One card per event per role. Repeat submissions — from a double-click, or
    // from registering the same event again on another visit — used to each get
    // their own card, so the same workshop appeared three times over.
    const byEventAndRole = new Map<string, typeof list[number]>();
    for (const item of list) {
      const key = `${item.typeLabel}::${normalizeEventTitle(item.title)}`;
      const seen = byEventAndRole.get(key);
      // Keep the original sign-up, not the accidental repeat.
      if (!seen || new Date(item.createdAt).getTime() < new Date(seen.createdAt).getTime()) {
        byEventAndRole.set(key, item);
      }
    }

    return [...byEventAndRole.values()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(item => ({
        ...item,
        date: new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      }));
  }, [userSubmissions, profile]);

  /** (role, event) pairs already signed up for — drives the "already registered" state. */
  const registeredKeys = useMemo(() => getRegisteredRoleKeys(userSubmissions), [userSubmissions]);

  const permRequest = useMemo(() => {
    if (!profile) return null;
    return getUserPermVolunteerRequest(profile.email, profile.phone) ?? null;
  }, [userSubmissions, profile]);

  const deactivateRequest = useMemo(() => {
    if (!profile) return null;
    return getUserPermVolunteerDeactivateRequest(profile.email, profile.phone) ?? null;
  }, [userSubmissions, profile]);

  const isDeactivated = useMemo(() => {
    if (!permRequest || !deactivateRequest) return false;
    if (deactivateRequest.status !== "Completed") return false;
    return new Date(deactivateRequest.createdAt).getTime() > new Date(permRequest.createdAt).getTime();
  }, [permRequest, deactivateRequest]);

  const isPermanentVolunteer = useMemo(() => {
    return permRequest?.status === "Completed" && !isDeactivated;
  }, [permRequest, isDeactivated]);

  const userDonationList = useMemo(() => {
    if (!profile) return [];
    return userSubmissions
      .filter(s => s.type === "donation")
      .map(s => ({
        id: s.id,
        amount: s.data?.amount || 0,
        cause: s.data?.campaign_name || s.data?.event_name || "General Empowerment Support",
        date: new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: s.status || "Completed",
      }));
  }, [userSubmissions, profile]);

  const now = new Date();
  const realEvents = siteData.events
    .filter((ev) => {
      const windows = Array.isArray(ev.windows) ? ev.windows : [];
      if (windows.length === 0) return true;
      return windows.some((w) => w.enabled && new Date(w.regEnd) >= now) || (ev.eventDate && new Date(ev.eventDate) >= now);
    })
    .map((ev) => ({
      id: ev.id,
      raw: ev,
      status: (isEventOpen(ev, now) ? "ongoing" : "upcoming") as "ongoing" | "upcoming",
      title: ev.title,
      date: ev.eventDate ? new Date(ev.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD",
      location: ev.location || "Online / TBD",
      desc: ev.description || "",
      // Roles this person has already taken on for this event.
      roles: (["volunteer", "vendor", "attendee"] as RegistrationRole[]).filter(r =>
        registeredKeys.has(registrationKey(r, ev.title))
      ),
    }));

  const registeringEvent = realEvents.find(e => e.id === registeringEventId) ?? null;

  return (
    <main className="bg-[#f4efe7] min-h-screen">
      <PageBanner title="My Account" />

      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          {!profile ? (
            <div className="max-w-[520px] mx-auto bg-white rounded-3xl p-8 sm:p-10 border border-[#a65a4a]/20 text-center shadow-lg">
              <div className="size-16 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-4">
                <User size={32} />
              </div>
              <h3 className="font-['Fraunces',serif] text-[24px] font-semibold text-[#1e1e1e]">Sign In to View Your Account</h3>
              <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/65 max-w-md mx-auto mt-2 leading-relaxed">
                Please sign in to access your registered events, seat reservations, volunteer activities, and contribution history.
              </p>
              <button
                onClick={() => openModal("login")}
                className="mt-6 px-8 py-3.5 bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center gap-2"
              >
                <LogIn size={18} /> Sign In / Create Account →
              </button>
            </div>
          ) : (
            <div className="max-w-[960px] mx-auto">
              <div className="bg-white border border-[#a65a4a]/20 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="size-16 rounded-2xl bg-[#a65a4a] text-[#f4efe7] font-['Fraunces',serif] text-[26px] font-bold flex items-center justify-center shrink-0 shadow-md">
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-['Fraunces',serif] text-[#1e1e1e] text-[24px] font-semibold">{profile.name}</h3>
                      {isPermanentVolunteer && (
                        <span className="bg-[#a65a4a] text-[#f4efe7] text-[12px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <Star size={12} className="fill-[#f4efe7]" /> Permanent Volunteer
                        </span>
                      )}
                      {permRequest?.status === "New" && (
                        <span className="bg-amber-100 text-amber-800 text-[12px] font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                          <Clock size={12} /> Request Pending
                        </span>
                      )}
                      {deactivateRequest?.status === "New" && !isDeactivated && (
                        <span className="bg-rose-100 text-rose-800 text-[12px] font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                          <Clock size={12} /> Deactivation Pending
                        </span>
                      )}
                      <span className="bg-emerald-100 text-emerald-800 text-[12px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle size={13} /> Active Member
                      </span>
                    </div>
                    <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/60 mt-1">
                      {profile.email} {profile.phone ? `· ${profile.phone}` : ""}
                    </p>
                    {profile.skills && (
                      <p className="font-['Inter',sans-serif] text-[12px] text-[#a65a4a] font-semibold mt-1">
                        Interest / Skill: {profile.skills}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSignOut}
                    className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#a65a4a] hover:bg-[#a65a4a]/10 border border-[#a65a4a]/30 px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </div>

              <div className="flex border-b-2 border-[#a65a4a]/20 mb-8 gap-4 sm:gap-8 overflow-x-auto">
                <button
                  onClick={() => setDashTab("registered")}
                  className={`pb-4 font-['Inter',sans-serif] text-[15px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                    dashTab === "registered"
                      ? "border-[#a65a4a] text-[#a65a4a]"
                      : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                  }`}
                >
                  <UserCheck size={18} /> My Registered Events ({registeredEventsList.length})
                </button>

                <button
                  onClick={() => setDashTab("donations")}
                  className={`pb-4 font-['Inter',sans-serif] text-[15px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                    dashTab === "donations"
                      ? "border-[#a65a4a] text-[#a65a4a]"
                      : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                  }`}
                >
                  <Heart size={18} /> My Contributions ({userDonationList.length})
                </button>

                <button
                  onClick={() => setDashTab("browse")}
                  className={`pb-4 font-['Inter',sans-serif] text-[15px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                    dashTab === "browse"
                      ? "border-[#a65a4a] text-[#a65a4a]"
                      : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                  }`}
                >
                  <Plus size={18} /> Browse Upcoming Events
                </button>

                <button
                  onClick={() => setDashTab("perm")}
                  className={`pb-4 font-['Inter',sans-serif] text-[15px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${
                    dashTab === "perm"
                      ? "border-[#a65a4a] text-[#a65a4a]"
                      : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                  }`}
                >
                  <Star size={18} /> Permanent Volunteer
                  {(permRequest?.status === "New" || (deactivateRequest?.status === "New" && !isDeactivated)) && (
                    <span className="size-2 rounded-full bg-amber-400 inline-block ml-0.5" />
                  )}
                </button>
              </div>

              {dashTab === "registered" && (
                <div>
                  {registeredEventsList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {registeredEventsList.map((item) => (
                        <div key={item.id} className="bg-white border-2 border-[#a65a4a]/20 hover:border-[#a65a4a] rounded-2xl p-6 transition-all shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="bg-[#a65a4a]/10 text-[#a65a4a] text-[12px] font-bold px-3 py-1 rounded-full">
                                {item.typeLabel}
                              </span>
                              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle size={11} /> {item.status}
                              </span>
                            </div>
                            <h4 className="font-['Inter',sans-serif] font-bold text-[18px] text-[#1e1e1e] mt-1 leading-snug">
                              {item.title}
                            </h4>
                            <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/65 mt-2 leading-relaxed">
                              {item.details}
                            </p>
                          </div>
                          <div className="border-t border-[#a65a4a]/10 pt-4 mt-5 flex items-center justify-between text-[13px] text-[#1e1e1e]/55 font-['Inter',sans-serif]">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={14} /> Registered: {item.date}
                            </span>
                            <span className="font-semibold text-[#a65a4a]">Confirmed Entry</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-10 border border-[#a65a4a]/15 text-center my-4 shadow-sm">
                      <div className="size-16 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-4">
                        <Calendar size={32} />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[22px] font-semibold text-[#1e1e1e]">No Registered Events Yet</h4>
                      <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/60 max-w-md mx-auto mt-2 leading-relaxed">
                        You haven't signed up for any events yet. Explore upcoming community events and volunteer initiatives to get involved!
                      </p>
                      <button
                        onClick={() => setDashTab("browse")}
                        className="mt-6 px-7 py-3.5 bg-[#a65a4a] text-[#f4efe7] text-[15px] font-semibold rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center gap-2"
                      >
                        <Plus size={18} /> Browse Upcoming Events
                      </button>
                    </div>
                  )}
                </div>
              )}

              {dashTab === "donations" && (
                <div>
                  {userDonationList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {userDonationList.map((d) => (
                        <div key={d.id} className="bg-white border-2 border-[#a65a4a]/20 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="bg-emerald-100 text-emerald-800 text-[12px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle size={12} /> Donation
                              </span>
                              <span className="text-[#a65a4a] font-['Fraunces',serif] text-[22px] font-bold">
                                ₹{d.amount.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <h4 className="font-['Inter',sans-serif] font-bold text-[16px] text-[#1e1e1e] mt-1">
                              {d.cause}
                            </h4>
                          </div>
                          <div className="border-t border-[#a65a4a]/10 pt-4 mt-5 flex items-center justify-between text-[13px] text-[#1e1e1e]/55 font-['Inter',sans-serif]">
                            <span className="flex items-center gap-1.5">
                              <Clock size={14} /> Date: {d.date}
                            </span>
                            <span className="bg-[#f4efe7] text-[#a65a4a] px-3 py-1 rounded-full text-[12px] font-medium">80G Tax Exempt</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-3xl p-10 border border-[#a65a4a]/15 text-center my-4 shadow-sm">
                      <div className="size-16 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-4">
                        <Heart size={32} />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[22px] font-semibold text-[#1e1e1e]">No Contribution Records</h4>
                      <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/60 max-w-md mx-auto mt-2 leading-relaxed">
                        Your financial contributions help fund education, health, and women leadership programs across India.
                      </p>
                      <button
                        onClick={() => setPage("donate")}
                        className="mt-6 px-7 py-3.5 bg-[#a65a4a] text-[#f4efe7] text-[15px] font-semibold rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center gap-2"
                      >
                        <Heart size={18} /> Donate For The Cause
                      </button>
                    </div>
                  )}
                </div>
              )}

              {dashTab === "browse" && (
                <div>
                  <div className="flex gap-2 mb-6">
                    {(["all", "ongoing", "upcoming"] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`font-['Inter',sans-serif] text-[13px] font-semibold px-5 py-2.5 rounded-full cursor-pointer transition-colors capitalize ${
                          filter === f ? "bg-[#a65a4a] text-[#f4efe7]" : "border border-[#a65a4a]/40 text-[#a65a4a] hover:bg-[#a65a4a]/8"
                        }`}
                      >
                        {f === "all" ? "All Events" : f === "ongoing" ? "🟢 Ongoing" : "📅 Upcoming"}
                      </button>
                    ))}
                  </div>

                  <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/60 mb-5 leading-relaxed">
                    Pick an event and choose how you'd like to take part — as a volunteer, vendor, donor, or attendee.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {realEvents.filter(e => filter === "all" || e.status === filter).map(ev => (
                      <div
                        key={ev.id}
                        className="rounded-2xl border-2 border-[#1e1e1e]/10 bg-white p-5 transition-all hover:border-[#a65a4a]/40 flex flex-col"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="font-['Inter',sans-serif] text-[11px] font-semibold px-3 py-1 rounded-full bg-[#a65a4a]/10 text-[#a65a4a]">
                            Community Event
                          </span>
                          <span className={`font-['Inter',sans-serif] text-[11px] font-semibold px-3 py-1 rounded-full ${ev.status === "ongoing" ? "bg-emerald-100 text-emerald-800" : "bg-[#1e1e1e]/8 text-[#1e1e1e]/60"}`}>
                            {ev.status === "ongoing" ? "Open now" : "Upcoming"}
                          </span>
                        </div>
                        <p className="font-['Inter',sans-serif] font-bold text-[16px] text-[#1e1e1e] leading-snug">{ev.title}</p>
                        <div className="flex gap-4 mt-2.5 mb-3">
                          <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/60 flex items-center gap-1"><Calendar size={12} /> {ev.date}</span>
                          <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/60 flex items-center gap-1"><MapPin size={12} /> {ev.location}</span>
                        </div>
                        <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/65 leading-relaxed">{ev.desc}</p>

                        {ev.roles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {ev.roles.map(r => (
                              <span key={r} className="font-['Inter',sans-serif] text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle size={11} /> Registered as {ROLE_LABEL[r]}
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => setRegisteringEventId(ev.id)}
                          className="mt-4 w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[14px] py-3 rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
                        >
                          {ev.roles.length > 0 ? "Register in Another Role →" : "Register for This Event →"}
                        </button>
                      </div>
                    ))}
                  </div>

                  {realEvents.length === 0 && (
                    <div className="bg-white rounded-3xl p-10 border border-[#a65a4a]/15 text-center my-4 shadow-sm">
                      <div className="size-16 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-4">
                        <Calendar size={32} />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[22px] font-semibold text-[#1e1e1e]">No Upcoming Events</h4>
                      <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/60 max-w-md mx-auto mt-2 leading-relaxed">
                        There's nothing open for registration right now — please check back soon.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {dashTab === "perm" && (
                <div>
                  {/* ── 1. Deactivated State (Only if not re-applying) ── */}
                  {isDeactivated && !reApplying && (
                    <div className="bg-white rounded-3xl border border-gray-250 p-8 sm:p-10 text-center shadow-sm">
                      <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5 text-gray-500">
                        <UserCheck size={40} className="text-gray-400" />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[24px] font-semibold text-[#1e1e1e]">Status Deactivated</h4>
                      <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/60 max-w-md mx-auto mt-3 leading-relaxed">
                        Your Permanent Volunteer status was deactivated on your request. Thank you for all your past contributions!
                      </p>
                      <button
                        onClick={() => {
                          setRequestMsg("");
                          setReApplying(true);
                        }}
                        className="mt-6 px-7 py-3 bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center gap-2"
                      >
                        <Plus size={16} /> Re-apply for Permanent Status
                      </button>
                    </div>
                  )}

                  {/* ── 2. Approved & Active Permanent Volunteer (Deactivation is NOT pending) ── */}
                  {isPermanentVolunteer && (!deactivateRequest || deactivateRequest.status !== "New") && (
                    <div className="flex flex-col gap-6">
                      <div className="bg-white rounded-3xl border border-[#a65a4a]/20 p-8 sm:p-10 text-center shadow-sm">
                        <div className="size-20 rounded-full bg-[#a65a4a] flex items-center justify-center mx-auto mb-5 shadow-lg">
                          <Star size={40} className="text-[#f4efe7] fill-[#f4efe7]" />
                        </div>
                        <h4 className="font-['Fraunces',serif] text-[26px] font-semibold text-[#1e1e1e]">You're a Permanent Volunteer!</h4>
                        <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/60 max-w-md mx-auto mt-3 leading-relaxed">
                          Your request has been approved by our team. Thank you for your lasting commitment to Mahila Action. The ⭐ badge is now visible on your profile.
                        </p>
                        <div className="mt-6 inline-flex items-center gap-2 bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-bold text-[14px] px-6 py-3 rounded-full shadow">
                          <Star size={15} className="fill-[#f4efe7]" /> Permanent Volunteer — Active
                        </div>
                      </div>

                      {/* Deactivation Form */}
                      <div className="bg-white rounded-3xl border border-rose-100 p-6 sm:p-8 shadow-sm">
                        <h5 className="font-['Fraunces',serif] text-[18px] font-semibold text-[#1e1e1e] mb-2 text-rose-800">Request Deactivation</h5>
                        <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/60 mb-4 max-w-xl">
                          If you can no longer commit as a Permanent Volunteer, you can request to deactivate your status. Admin staff will review and approve your request.
                        </p>
                        {deactivateRequest?.status === "Contacted" && (
                          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-[13px] font-medium max-w-xl">
                            ⚠️ Your previous deactivation request was not approved by admin.
                          </div>
                        )}
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!confirm("Are you sure you want to request deactivation of your Permanent Volunteer status?")) return;
                            savePermVolunteerDeactivateRequest({
                              name: profile.name,
                              email: profile.email,
                              phone: profile.phone,
                              message: "Deactivation requested by user from account portal.",
                            });
                            setUserSubmissions(getUserSubmissions(profile.email, profile.phone));
                            toast.success("Deactivation request submitted");
                          }}
                        >
                          <button
                            type="submit"
                            className="bg-rose-50 text-rose-600 hover:bg-rose-100 font-['Inter',sans-serif] font-semibold text-[13px] px-5 py-2.5 rounded-full transition-colors cursor-pointer"
                          >
                            Request Deactivation
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* ── 3. Deactivation Request Pending ── */}
                  {permRequest?.status === "Completed" && deactivateRequest?.status === "New" && (
                    <div className="bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 text-center shadow-sm">
                      <div className="size-20 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-5">
                        <Clock size={40} className="text-rose-500" />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[24px] font-semibold text-rose-950">Deactivation Pending</h4>
                      <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/60 max-w-md mx-auto mt-3 leading-relaxed">
                        You have submitted a request to deactivate your Permanent Volunteer status. Our admin team will process this shortly.
                      </p>
                      <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/40 mt-4">
                        Submitted on {new Date(deactivateRequest.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  )}

                  {/* ── 4. Permanent Volunteer Application Pending ── */}
                  {permRequest?.status === "New" && (
                    <div className="bg-white rounded-3xl border border-amber-200 p-8 sm:p-10 text-center shadow-sm">
                      <div className="size-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
                        <Clock size={40} className="text-amber-600" />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[24px] font-semibold text-[#1e1e1e]">Request Under Review</h4>
                      <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/60 max-w-md mx-auto mt-3 leading-relaxed">
                        Our team has received your request for Permanent Volunteer status and will review it shortly. You'll see the badge here once it's approved.
                      </p>
                      <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/40 mt-4">
                        Submitted on {new Date(permRequest.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  )}

                  {/* ── 5. Permanent Volunteer Application Rejected ── */}
                  {permRequest?.status === "Contacted" && !requestSent && !reApplying && (
                    <div className="bg-white rounded-3xl border border-[#a65a4a]/20 p-8 sm:p-10 text-center shadow-sm">
                      <div className="size-20 rounded-full bg-[#a65a4a]/10 flex items-center justify-center mx-auto mb-5">
                        <Star size={40} className="text-[#a65a4a]" />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[24px] font-semibold text-[#1e1e1e]">Request Not Approved</h4>
                      <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/60 max-w-md mx-auto mt-3 leading-relaxed">
                        Your previous request wasn't approved at this time. You're welcome to submit a new request — please add a brief note about your contributions.
                      </p>
                      <button
                        onClick={() => setRequestSent(true)}
                        className="mt-6 px-7 py-3 bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center gap-2"
                      >
                        <Send size={16} /> Re-apply
                      </button>
                    </div>
                  )}

                  {/* ── 6. Request Form: No request OR re-applying ── */}
                  {(!permRequest || (permRequest.status === "Contacted" && requestSent) || reApplying) && (
                    <div className="bg-white rounded-3xl border border-[#a65a4a]/20 p-8 sm:p-10 shadow-sm">
                      <div className="flex flex-col items-center text-center mb-8">
                        <div className="size-20 rounded-full bg-[#a65a4a]/10 flex items-center justify-center mb-5">
                          <Star size={40} className="text-[#a65a4a]" />
                        </div>
                        <h4 className="font-['Fraunces',serif] text-[24px] font-semibold text-[#1e1e1e]">Become a Permanent Volunteer</h4>
                        <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/60 max-w-lg mt-3 leading-relaxed">
                          Permanent Volunteers are long-term community champions who commit to Mahila Action's ongoing mission. Request this special status and our team will review your application.
                        </p>
                      </div>

                      {requestSent && !reApplying ? (
                        <div className="flex flex-col items-center text-center gap-4 py-4">
                          <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CheckCircle size={36} className="text-emerald-600" />
                          </div>
                          <h5 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">Request Submitted!</h5>
                          <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/60 max-w-sm leading-relaxed">
                            Our team has been notified and will review your request. Check back here for updates.
                          </p>
                        </div>
                      ) : (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setRequestLoading(true);
                            savePermVolunteerRequest({
                              name: profile.name,
                              email: profile.email,
                              phone: profile.phone,
                              message: requestMsg.trim() || undefined,
                            });
                            setUserSubmissions(getUserSubmissions(profile.email, profile.phone));
                            setRequestSent(true);
                            setReApplying(false);
                            setRequestLoading(false);
                          }}
                          className="flex flex-col gap-4 max-w-xl mx-auto"
                        >
                          <div>
                            <label className="block font-['Inter',sans-serif] text-[13px] font-semibold text-[#1e1e1e]/70 mb-1.5">
                              Why do you want to be a Permanent Volunteer? <span className="font-normal text-[#1e1e1e]/40">(optional)</span>
                            </label>
                            <textarea
                              value={requestMsg}
                              onChange={(e) => setRequestMsg(e.target.value)}
                              rows={4}
                              placeholder="Share a bit about your involvement with Mahila Action, your skills, and why you'd like to commit long-term…"
                              className="w-full border border-[#a65a4a]/25 rounded-xl px-4 py-3 font-['Inter',sans-serif] text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/30 focus:outline-none focus:border-[#a65a4a] resize-none bg-[#faf7f3]"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={requestLoading}
                            className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
                          >
                            <Send size={17} /> {requestLoading ? "Submitting…" : "Submit Request"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {registeringEvent && profile && (
        <EventRegistrationModal
          event={registeringEvent.raw}
          profile={profile}
          registeredKeys={registeredKeys}
          onClose={() => setRegisteringEventId(null)}
          onRegistered={(role) => {
            setUserSubmissions(getUserSubmissions(profile.email, profile.phone));
            setRefreshKey(k => k + 1);
            toast.success(`You're registered as ${role === "attendee" ? "an attendee" : `a ${role}`} for ${registeringEvent.title}.`);
          }}
        />
      )}
    </main>
  );
}
