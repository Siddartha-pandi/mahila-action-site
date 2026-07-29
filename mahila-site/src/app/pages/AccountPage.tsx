"use client";

import { useState, useEffect, useMemo } from "react";
import { LogIn, LogOut, User, CheckCircle, UserCheck, Heart, Plus, Calendar, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  saveVolunteer, getSavedUserSession, saveUserSession,
  getUserSubmissions, type VolunteerAccountProfile, type SubmissionItem,
} from "@/lib/backend";
import { isEventOpen } from "@/lib/data";
import { useSiteData } from "../context/SiteDataContext";
import { useModal } from "../hooks/useModal";
import { PageBanner } from "../components/PageBanner";
import { type Page } from "../components/shared/styleHelpers";

export function AccountPage({ setPage }: { setPage: (p: Page) => void }) {
  const siteData = useSiteData();
  const { openModal } = useModal();
  const [profile, setProfile] = useState<VolunteerAccountProfile | null>(() => getSavedUserSession());
  const [dashTab, setDashTab] = useState<"registered" | "donations" | "browse">("registered");
  const [filter, setFilter] = useState<"all" | "ongoing" | "upcoming">("all");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [userSubmissions, setUserSubmissions] = useState<SubmissionItem[]>([]);

  useEffect(() => {
    function syncSession() {
      const current = getSavedUserSession();
      setProfile(current);
      if (current) {
        setUserSubmissions(getUserSubmissions(current.email, current.phone));
      }
    }
    syncSession();
    window.addEventListener("mahila_user_session_changed", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("mahila_user_session_changed", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [confirmed]);

  function handleSignOut() {
    saveUserSession(null);
    setProfile(null);
    setSelectedEvents([]);
    toast.success("Signed out successfully");
    setPage("home");
  }

  const registeredEventsList = useMemo(() => {
    if (!profile) return [];
    const list: {
      id: string;
      title: string;
      date: string;
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
            date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            typeLabel: "Volunteer",
            details: sub.data?.skills ? `Skills: ${sub.data.skills}` : "Community Volunteer",
            status: "Active",
          });
        });
      } else if (sub.type === "reservation") {
        list.push({
          id: sub.id,
          title: sub.data?.event_name || "Community Event",
          date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          typeLabel: "Seat Reservation",
          details: `${sub.data?.seats || 1} Seat(s) Reserved ${sub.data?.volunteer_commitment === "ongoing" ? "· Ongoing Volunteer" : ""}`,
          status: sub.status || "Confirmed",
        });
      } else if (sub.type === "vendor") {
        list.push({
          id: sub.id,
          title: sub.data?.event_name || "Event Support",
          date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          typeLabel: "Vendor / Partner Application",
          details: `Business: ${sub.data?.business_name || ""} (${sub.data?.offering || ""})`,
          status: sub.status || "Under Review",
        });
      }
    });

    return list;
  }, [userSubmissions, profile]);

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
      status: (isEventOpen(ev, now) ? "ongoing" : "upcoming") as "ongoing" | "upcoming",
      title: ev.title,
      date: ev.eventDate ? new Date(ev.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD",
      location: ev.location || "Online / TBD",
      desc: ev.description || "",
    }));

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
                      <span className="bg-[#a65a4a] text-[#f4efe7] text-[12px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        ⭐ Permanent Volunteer
                      </span>
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
                  {confirmed ? (
                    <div className="flex flex-col items-center text-center gap-5 py-10 bg-white rounded-3xl p-8 border border-[#a65a4a]/15 shadow-sm">
                      <div className="size-20 bg-[#587735]/10 rounded-full flex items-center justify-center">
                        <CheckCircle size={44} className="text-[#587735]" />
                      </div>
                      <h3 className="font-['Fraunces',serif] text-[#1e1e1e] text-[28px]">Registration Successful!</h3>
                      <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[16px] max-w-[420px] leading-relaxed">
                        Thank you, <strong className="text-[#a65a4a]">{profile.name}</strong>! You've successfully registered for <strong className="text-[#a65a4a]">{selectedEvents.length} event(s)</strong>.
                      </p>
                      <button
                        onClick={() => {
                          setConfirmed(false);
                          setSelectedEvents([]);
                          setDashTab("registered");
                        }}
                        className="px-8 py-3.5 bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
                      >
                        View My Registered Events →
                      </button>
                    </div>
                  ) : (
                    <>
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
                        {selectedEvents.length > 0 && (
                          <span className="ml-auto font-['Inter',sans-serif] text-[13px] font-semibold bg-[#a65a4a]/10 text-[#a65a4a] px-4 py-1.5 rounded-full self-center">
                            {selectedEvents.length} selected
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {realEvents.filter(e => filter === "all" || e.status === filter).map(ev => {
                          const selected = selectedEvents.includes(ev.id);
                          return (
                            <button
                              key={ev.id}
                              onClick={() => {
                                setSelectedEvents(prev =>
                                  prev.includes(ev.id) ? prev.filter(e => e !== ev.id) : [...prev, ev.id]
                                );
                              }}
                              className={`text-left rounded-2xl border-2 p-5 transition-all cursor-pointer ${selected ? "border-[#a65a4a] bg-[#a65a4a]/5 shadow-md" : "border-[#1e1e1e]/10 bg-white hover:border-[#a65a4a]/40"
                                }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <span className="font-['Inter',sans-serif] text-[11px] font-semibold px-3 py-1 rounded-full bg-[#a65a4a]/10 text-[#a65a4a]">
                                  Community Event
                                </span>
                                <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${selected ? "border-[#a65a4a] bg-[#a65a4a]" : "border-[#1e1e1e]/25"}`}>
                                  {selected && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="size-3"><polyline points="20 6 9 17 4 12" /></svg>}
                                </div>
                              </div>
                              <p className="font-['Inter',sans-serif] font-bold text-[16px] text-[#1e1e1e] leading-snug">{ev.title}</p>
                              <div className="flex gap-4 mt-2.5 mb-3">
                                <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/60 flex items-center gap-1"><Calendar size={12} /> {ev.date}</span>
                                <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/60 flex items-center gap-1"><MapPin size={12} /> {ev.location}</span>
                              </div>
                              <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/65 leading-relaxed">{ev.desc}</p>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={async () => {
                          if (selectedEvents.length === 0) return toast.error("Please select at least one event");
                          const eventTitles = realEvents.filter(e => selectedEvents.includes(e.id)).map(e => e.title);
                          await saveVolunteer({
                            name: profile.name,
                            email: profile.email,
                            phone: profile.phone,
                            skills: profile.skills,
                            selected_events: eventTitles,
                          });
                          setConfirmed(true);
                          setUserSubmissions(getUserSubmissions(profile.email, profile.phone));
                        }}
                        disabled={selectedEvents.length === 0}
                        className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {selectedEvents.length === 0 ? "Select events to register" : `Confirm Registration for ${selectedEvents.length} Event${selectedEvents.length > 1 ? "s" : ""}`}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
