"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  X, CheckCircle, AlertCircle, LogIn, LogOut, Calendar, MapPin, Heart, Clock,
  UserCheck, Plus, UserPlus,
} from "lucide-react";
import {
  saveVolunteer, signInAdmin, loginVolunteer, registerVolunteer,
  requestVolunteerPasswordReset, resetVolunteerPassword,
  getUserSubmissions, getSavedUserSession, saveUserSession,
  type VolunteerAccountProfile, type SubmissionItem,
} from "@/lib/backend";
import { isEventOpen, type EventItem } from "@/lib/data";
import { isValidPhoneNumber } from "@/lib/validation";
import { setCurrentAdminSession } from "@/lib/permissions";
import { useModal } from "../hooks/useModal";
import { type VolAuthStep, type VolunteerProfile } from "../context/SiteDataContext";

// Fallback static volunteer events (used as display items when no CMS events exist)
const VOLUNTEER_EVENTS = [
  {
    id: 1, status: "ongoing" as const,
    title: "Community Leadership Workshop", date: "Aug 12, 2026",
    location: "Hyderabad", category: "Women & Leadership",
    slots: 12, desc: "Facilitate group sessions helping women develop leadership and public-speaking confidence.",
  },
  {
    id: 2, status: "ongoing" as const,
    title: "Mobile Health Camp", date: "Aug 18, 2026",
    location: "Secunderabad", category: "Community Wellbeing",
    slots: 8, desc: "Support our field medical team with registration, crowd management, and health record entry.",
  },
  {
    id: 3, status: "upcoming" as const,
    title: "Digital Literacy Drive", date: "Sep 4, 2026",
    location: "Warangal", category: "Education & Learning",
    slots: 20, desc: "Teach basic smartphone and internet skills to first-time users in rural communities.",
  },
  {
    id: 4, status: "upcoming" as const,
    title: "Livelihood Skills Fair", date: "Sep 14, 2026",
    location: "Nizamabad", category: "Livelihood & Skills",
    slots: 15, desc: "Help coordinate stalls, mentor participants, and document success stories at our annual skills fair.",
  },
  {
    id: 5, status: "upcoming" as const,
    title: "Child Learning Carnival", date: "Oct 2, 2026",
    location: "Hyderabad", category: "Education & Learning",
    slots: 30, desc: "Run activity booths, storytelling sessions, and art workshops for children aged 6–14.",
  },
  {
    id: 6, status: "upcoming" as const,
    title: "Women's Rights Awareness Walk", date: "Oct 11, 2026",
    location: "Hyderabad", category: "Women & Leadership",
    slots: 50, desc: "March alongside the community, carry banners, and distribute awareness leaflets.",
  },
];

const inputCls = `w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]`;
const labelCls = `font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider mb-1 block`;

export function VolunteerPortal({ onClose, initialStep, resetToken, events }: { onClose: () => void; initialStep?: VolAuthStep; resetToken?: string; events: EventItem[] }) {
  const navigate = useNavigate();
  const { closeModal } = useModal();
  const handleClose = useCallback(() => {
    if (onClose) onClose();
    closeModal();
  }, [onClose, closeModal]);

  const [step, setStep] = useState<VolAuthStep>(initialStep ?? "login");
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [dashTab, setDashTab] = useState<"registered" | "donations" | "browse">("registered");

  useEffect(() => {
    if (initialStep) setStep(initialStep);
  }, [initialStep]);

  const [filter, setFilter] = useState<"all" | "ongoing" | "upcoming">("all");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);

  const [userSubmissions, setUserSubmissions] = useState<SubmissionItem[]>([]);

  useEffect(() => {
    if (profile?.email || profile?.phone) {
      setUserSubmissions(getUserSubmissions(profile.email, profile.phone));
    }
  }, [profile, step, confirmed]);

  function handleSignOut() {
    setProfile(null);
    setStep("choice");
    setConfirmed(false);
    setSelectedEvents([]);
    toast.success("Signed out successfully");
  }

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [reg, setReg] = useState({ name: "", email: "", phone: "", password: "", skills: "" });
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [resetPass, setResetPass] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  // Auto sign-out after 5 minutes of inactivity
  useEffect(() => {
    if (!profile) return;
    const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
    let timer: ReturnType<typeof setTimeout>;

    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setProfile(null);
        setStep("choice");
        setConfirmed(false);
        setSelectedEvents([]);
        toast.error("Signed out automatically after 5 minutes of inactivity");
      }, INACTIVITY_LIMIT_MS);
    }

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [profile]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const identifier = loginEmail.trim();
    if (!identifier) return toast.error("Enter your email address or username");
    if (!loginPass.trim()) return toast.error("Enter your password");
    const lowerId = identifier.toLowerCase();

    const adminRes = await signInAdmin(identifier, loginPass);
    if (adminRes.ok) {
      let canonicalEmail = identifier;
      if (lowerId === "superadmin" || lowerId === "super admin" || lowerId === "super" || lowerId === "mahilaaction.vsk@gmail.com") {
        canonicalEmail = "mahilaaction.vsk@gmail.com";
      } else if (lowerId === "admin") {
        canonicalEmail = "admin@organization.org";
      }
      setCurrentAdminSession(canonicalEmail);
      setAuthBusy(false);
      handleClose();
      navigate("/admin");
      toast.success("Signed in to Admin Panel!");
      return;
    }

    const result = await loginVolunteer(identifier, loginPass);
    setAuthBusy(false);
    if (result.ok && result.profile) {
      setProfile(result.profile);
      saveUserSession(result.profile);
      handleClose();
      toast.success(`Signed in successfully! Welcome back, ${result.profile.name}!`);
      navigate("/account");
      window.scrollTo({ top: 0 });
      return;
    }

    toast.error(result.error || adminRes.error || "Incorrect email or password.");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!reg.name.trim()) return toast.error("Enter your full name");
    if (!reg.email.includes("@")) return toast.error("Enter a valid email");
    if (!isValidPhoneNumber(reg.phone)) return toast.error("Please enter a valid phone number (10–15 digits, e.g. +91 98765 43210)");
    if (reg.password.length < 6) return toast.error("Password must be at least 6 characters");
    setAuthBusy(true);
    const result = await registerVolunteer(reg);
    setAuthBusy(false);
    if (!result.ok || !result.profile) {
      toast.error(result.error || "Something went wrong creating your account — please try again.");
      return;
    }
    setProfile(result.profile);
    saveUserSession(result.profile);
    handleClose();
    toast.success(`Registered successfully! Welcome, ${result.profile.name}!`);
    navigate("/account");
    window.scrollTo({ top: 0 });
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.includes("@")) return toast.error("Enter a valid email");
    setAuthBusy(true);
    setForgotError(null);
    const result = await requestVolunteerPasswordReset(forgotEmail);
    setAuthBusy(false);
    if (!result.ok) {
      const message = result.error || "Something went wrong — please try again.";
      setForgotError(message);
      return toast.error(message);
    }
    setForgotSent(true);
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetToken) return toast.error("This reset link is missing its token — please request a new one.");
    if (resetPass.length < 6) return toast.error("Password must be at least 6 characters");
    if (resetPass !== resetConfirm) return toast.error("Passwords don't match");
    setAuthBusy(true);
    const result = await resetVolunteerPassword(resetToken, resetPass);
    setAuthBusy(false);
    if (!result.ok) return toast.error(result.error || "Something went wrong — please try again.");
    toast.success("Password updated! You can now sign in.");
    setStep("login");
  }

  function toggleEvent(id: string) {
    setSelectedEvents(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  }

  async function handleConfirm() {
    if (selectedEvents.length === 0) return toast.error("Please select at least one event");
    const eventTitles = realEvents.filter(e => selectedEvents.includes(e.id)).map(e => e.title);
    const ok = await saveVolunteer({
      name: profile?.name ?? "",
      email: profile?.email ?? "",
      phone: profile?.phone ?? "",
      skills: profile?.skills ?? "",
      selected_events: eventTitles,
    });
    if (!ok) return toast.error("Something went wrong submitting your registration — please try again.");
    setConfirmed(true);
    if (profile?.email || profile?.phone) {
      setUserSubmissions(getUserSubmissions(profile.email, profile.phone));
    }
  }

  const now = new Date();
  const realEvents = events
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
      category: "",
      slots: ev.totalSeats || 0,
      desc: ev.description || "",
    }));
  const filtered = realEvents.filter(e => filter === "all" || e.status === filter);
  const categoryColors: Record<string, string> = {
    "Women & Leadership": "bg-rose-100 text-rose-700",
    "Community Wellbeing": "bg-green-100 text-green-700",
    "Education & Learning": "bg-blue-100 text-blue-700",
    "Livelihood & Skills": "bg-amber-100 text-amber-700",
  };

  const registeredEventsList = useMemo(() => {
    if (!profile) return [];
    const list: {
      id: string;
      title: string;
      date: string;
      typeLabel: string;
      details?: string;
      createdAt: string;
      status: string;
    }[] = [];

    userSubmissions.forEach(sub => {
      if (sub.type === "volunteer") {
        const eventsArr: string[] = Array.isArray(sub.data?.selected_events)
          ? sub.data.selected_events
          : sub.data?.event_name
            ? [sub.data.event_name]
            : [];
        eventsArr.forEach((title, idx) => {
          list.push({
            id: `${sub.id}_${idx}`,
            title,
            date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            typeLabel: "Volunteer Registration",
            details: sub.data?.skills ? `Skills: ${sub.data.skills}` : "Registered Volunteer",
            createdAt: sub.createdAt,
            status: sub.status || "Confirmed",
          });
        });
      } else if (sub.type === "reservation") {
        list.push({
          id: sub.id,
          title: sub.data?.event_name || "Community Event",
          date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          typeLabel: "Seat Reservation",
          details: `${sub.data?.seats || 1} Seat(s) Reserved ${sub.data?.volunteer_commitment === "ongoing" ? "· Ongoing Volunteer" : ""}`,
          createdAt: sub.createdAt,
          status: sub.status || "Confirmed",
        });
      } else if (sub.type === "vendor") {
        list.push({
          id: sub.id,
          title: sub.data?.event_name || "Event Support",
          date: new Date(sub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          typeLabel: "Vendor / Partner Application",
          details: `Business: ${sub.data?.business_name || ""} (${sub.data?.offering || ""})`,
          createdAt: sub.createdAt,
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

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm">
      <div className="bg-[#f4efe7] rounded-2xl sm:rounded-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" style={{ maxWidth: step === "dashboard" ? "min(880px, 95vw)" : "min(460px, 92vw)" }}>

        {/* ── Header ── */}
        <div className="bg-[#a65a4a] px-7 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {(step === "forgot" || step === "reset") && (
              <button onClick={() => setStep("login")} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer mr-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </button>
            )}
            <div>
              <p className="font-['Inter',sans-serif] text-[#f4efe7]/70 text-[11px] uppercase tracking-wider">Mahila Action Portal</p>
              <h3 className="font-['Fraunces',serif] text-[#f4efe7] text-[20px] font-semibold" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                {step === "choice" && "User & Volunteer Portal"}
                {step === "login" && "Account Sign In"}
                {step === "register" && "Create Member Account"}
                {step === "forgot" && "Reset Password"}
                {step === "reset" && "Choose New Password"}
                {step === "dashboard" && `Account: ${profile?.name}`}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-[#f4efe7]/70 hover:text-[#f4efe7] cursor-pointer"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── Choice screen ── */}
          {step === "choice" && (
            <div className="p-8 flex flex-col gap-5">
              <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[14px] leading-relaxed">
                Welcome to Mahila Action! Sign in to access your registered events, seat reservations, and donation history, or create a new account.
              </p>
              <button onClick={() => setStep("login")} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer">
                Sign In to My Account
              </button>
              <button onClick={() => setStep("register")} className="w-full border-2 border-[#a65a4a] text-[#a65a4a] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#a65a4a]/5 transition-colors cursor-pointer">
                Register New Account
              </button>
              <div className="bg-[#a65a4a]/8 rounded-xl p-4 border border-[#a65a4a]/20">
                <p className="font-['Inter',sans-serif] text-[12px] text-[#a65a4a] font-semibold mb-2">Member Benefits</p>
                {["Track your registered events & seat reservations", "View contribution receipts & tax exemption docs", "Participate in community workshops & empowerment drives"].map(t => (
                  <div key={t} className="flex gap-2 items-start mt-1.5">
                    <CheckCircle size={13} className="text-[#a65a4a] mt-0.5 shrink-0" />
                    <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/65">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Login screen ── */}
          {step === "login" && (
            <form onSubmit={handleLogin} className="p-8 flex flex-col gap-4">
              <div>
                <label className={labelCls}>Email or Username</label>
                <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="you@email.com" type="text" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password</label>
                <input value={loginPass} onChange={e => setLoginPass(e.target.value)} placeholder="••••••••" type="password" className={inputCls} />
                <button
                  type="button"
                  onClick={() => { setForgotEmail(loginEmail); setForgotSent(false); setForgotError(null); setStep("forgot"); }}
                  className="mt-1.5 font-['Inter',sans-serif] text-[12px] text-[#a65a4a] font-semibold cursor-pointer hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <button type="submit" disabled={authBusy} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60">
                {authBusy ? "Signing in…" : "Sign In"}
              </button>
              <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55">
                New user?{" "}
                <button type="button" onClick={() => setStep("register")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">
                  Create an account
                </button>
              </p>
            </form>
          )}

          {/* ── Register screen ── */}
          {step === "register" && (
            <form onSubmit={handleRegister} className="p-8 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input value={reg.name} onChange={e => setReg(r => ({ ...r, name: e.target.value }))} placeholder="Your name" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Phone *</label>
                  <input value={reg.phone} onChange={e => setReg(r => ({ ...r, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email Address *</label>
                <input value={reg.email} onChange={e => setReg(r => ({ ...r, email: e.target.value }))} placeholder="you@email.com" type="email" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Password *</label>
                <input value={reg.password} onChange={e => setReg(r => ({ ...r, password: e.target.value }))} placeholder="Min. 6 characters" type="password" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Your Skills / Areas of Interest</label>
                <select value={reg.skills} onChange={e => setReg(r => ({ ...r, skills: e.target.value }))} className={`${inputCls} cursor-pointer`}>
                  <option value="">Select your primary skill…</option>
                  <option>Teaching / Training</option>
                  <option>Healthcare / Medical</option>
                  <option>Event Management</option>
                  <option>Communication / Outreach</option>
                  <option>Technology / Digital</option>
                  <option>Legal / Counselling</option>
                  <option>Arts / Creative</option>
                  <option>General Support</option>
                </select>
              </div>
              <button type="submit" disabled={authBusy} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-1 disabled:opacity-60">
                {authBusy ? "Creating account…" : "Create Account & Continue"}
              </button>
              <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55">
                Already registered?{" "}
                <button type="button" onClick={() => setStep("login")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">Sign in</button>
              </p>
            </form>
          )}

          {/* ── Forgot password screen ── */}
          {step === "forgot" && (
            forgotSent ? (
              <div className="p-8 flex flex-col items-center text-center gap-4">
                <div className="size-16 bg-[#587735]/10 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-[#587735]" />
                </div>
                <h4 className="font-['Fraunces',serif] text-[#1e1e1e] text-[19px]" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>Check your email</h4>
                {/* Reaching this screen now means the account was confirmed to
                    exist — an unknown address is rejected on the form instead. */}
                <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[14px] leading-relaxed">
                  We've sent a link to reset your password to <span className="font-semibold">{forgotEmail}</span>. It can take a few minutes to arrive — remember to check your spam folder.
                </p>
                <button type="button" onClick={() => { setForgotSent(false); setStep("login"); }} className="mt-1 font-['Inter',sans-serif] text-[13px] text-[#a65a4a] font-semibold cursor-pointer hover:underline">
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="p-8 flex flex-col gap-4">
                <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[13px] leading-relaxed -mt-1">
                  Enter your email address and we'll send you a password reset link.
                </p>
                <div>
                  <label className={labelCls}>Email Address</label>
                  <input value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); setForgotError(null); }} placeholder="you@email.com" type="email" className={inputCls} autoFocus />
                </div>
                {forgotError && (
                  <div className="flex items-start gap-2.5 bg-[#993925]/8 border border-[#993925]/25 rounded-xl px-4 py-3">
                    <AlertCircle size={17} className="text-[#993925] shrink-0 mt-0.5" />
                    <p className="font-['Inter',sans-serif] text-[#993925] text-[13px] leading-relaxed">
                      {forgotError}
                      <br />
                      <button type="button" onClick={() => { setForgotError(null); setStep("register"); }} className="font-semibold underline cursor-pointer mt-0.5">
                        Create an account instead
                      </button>
                    </p>
                  </div>
                )}
                <button type="submit" disabled={authBusy} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60">
                  {authBusy ? "Sending…" : "Send Reset Link"}
                </button>
                <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55">
                  <button type="button" onClick={() => setStep("login")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">← Back to sign in</button>
                </p>
              </form>
            )
          )}

          {/* ── Choose new password (opened from the emailed reset link) ── */}
          {step === "reset" && (
            <form onSubmit={handleResetSubmit} className="p-8 flex flex-col gap-4">
              {!resetToken ? (
                <div className="flex items-start gap-2.5 bg-[#993925]/8 border border-[#993925]/25 rounded-xl px-4 py-3">
                  <AlertCircle size={17} className="text-[#993925] shrink-0 mt-0.5" />
                  <p className="font-['Inter',sans-serif] text-[#993925] text-[13px] leading-relaxed">
                    This reset link is missing its token.{" "}
                    <button type="button" onClick={() => { setForgotSent(false); setForgotError(null); setStep("forgot"); }} className="font-semibold underline cursor-pointer">
                      Request a new one
                    </button>
                  </p>
                </div>
              ) : (
                <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[13px] leading-relaxed -mt-1">
                  Choose a new password for your account. It needs to be at least 6 characters.
                </p>
              )}
              <div>
                <label className={labelCls}>New Password</label>
                <input value={resetPass} onChange={e => setResetPass(e.target.value)} placeholder="••••••••" type="password" className={inputCls} autoFocus />
              </div>
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <input value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} placeholder="••••••••" type="password" className={inputCls} />
              </div>
              {resetConfirm.length > 0 && resetPass !== resetConfirm && (
                <p className="font-['Inter',sans-serif] text-[#993925] text-[12px] -mt-1">Passwords don't match.</p>
              )}
              <button type="submit" disabled={authBusy} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60">
                {authBusy ? "Saving…" : "Save New Password"}
              </button>
              <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55">
                <button type="button" onClick={() => setStep("login")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">← Back to sign in</button>
              </p>
            </form>
          )}

          {/* ── Dashboard ── */}
          {step === "dashboard" && (
            <div className="p-6 md:p-8">
              {/* User Profile Summary Card */}
              <div className="bg-white border border-[#a65a4a]/15 rounded-2xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-full bg-[#a65a4a] text-[#f4efe7] font-['Fraunces',serif] text-[22px] font-bold flex items-center justify-center shrink-0 shadow-md">
                    {profile?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-['Fraunces',serif] text-[#1e1e1e] text-[20px] font-semibold">{profile?.name}</h4>
                      <span className="bg-[#587735]/15 text-[#587735] text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle size={12} /> Active Account
                      </span>
                    </div>
                    <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/60 mt-0.5">
                      {profile?.email} {profile?.phone ? `· ${profile.phone}` : ""}
                    </p>
                    {profile?.skills && (
                      <p className="font-['Inter',sans-serif] text-[11px] text-[#a65a4a] font-medium mt-1">
                        Primary Skill: {profile.skills}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="font-['Inter',sans-serif] text-[13px] font-semibold text-[#a65a4a] hover:bg-[#a65a4a]/10 border border-[#a65a4a]/30 px-4 py-2 rounded-full transition-colors flex items-center gap-2 w-fit self-start md:self-auto cursor-pointer"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-[#a65a4a]/20 mb-6 gap-2 sm:gap-6 overflow-x-auto">
                <button
                  onClick={() => setDashTab("registered")}
                  className={`pb-3 font-['Inter',sans-serif] text-[14px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${dashTab === "registered"
                    ? "border-[#a65a4a] text-[#a65a4a]"
                    : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                    }`}
                >
                  <UserCheck size={16} /> My Registered Events ({registeredEventsList.length})
                </button>
                <button
                  onClick={() => setDashTab("donations")}
                  className={`pb-3 font-['Inter',sans-serif] text-[14px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${dashTab === "donations"
                    ? "border-[#a65a4a] text-[#a65a4a]"
                    : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                    }`}
                >
                  <Heart size={16} /> My Contributions ({userDonationList.length})
                </button>
                <button
                  onClick={() => setDashTab("browse")}
                  className={`pb-3 font-['Inter',sans-serif] text-[14px] font-semibold transition-colors cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 ${dashTab === "browse"
                    ? "border-[#a65a4a] text-[#a65a4a]"
                    : "border-transparent text-[#1e1e1e]/60 hover:text-[#a65a4a]"
                    }`}
                >
                  <Plus size={16} /> Browse & Volunteer New Events
                </button>
              </div>

              {/* Tab 1: Registered Events */}
              {dashTab === "registered" && (
                <div>
                  {registeredEventsList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {registeredEventsList.map((item) => (
                        <div key={item.id} className="bg-white border-2 border-[#a65a4a]/20 hover:border-[#a65a4a] rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="bg-[#a65a4a]/10 text-[#a65a4a] text-[11px] font-bold px-2.5 py-1 rounded-full">
                                {item.typeLabel}
                              </span>
                              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle size={10} /> {item.status}
                              </span>
                            </div>
                            <h5 className="font-['Inter',sans-serif] font-bold text-[16px] text-[#1e1e1e] mt-1 leading-snug">{item.title}</h5>
                            <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/60 mt-1 leading-relaxed">{item.details}</p>
                          </div>
                          <div className="border-t border-[#a65a4a]/10 pt-3 mt-4 flex items-center justify-between text-[12px] text-[#1e1e1e]/50 font-['Inter',sans-serif]">
                            <span className="flex items-center gap-1"><Calendar size={13} /> Registered: {item.date}</span>
                            <span className="font-medium text-[#a65a4a]">Confirmed Entry</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-8 border border-[#a65a4a]/15 text-center my-4">
                      <div className="size-14 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-3">
                        <Calendar size={28} />
                      </div>
                      <h5 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">No Registered Events Yet</h5>
                      <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/60 max-w-md mx-auto mt-2 leading-relaxed">
                        You haven't signed up for any events yet. Explore upcoming community events and volunteer initiatives to get involved!
                      </p>
                      <button
                        onClick={() => setDashTab("browse")}
                        className="mt-5 px-6 py-3 bg-[#a65a4a] text-[#f4efe7] text-[14px] font-semibold rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center gap-2"
                      >
                        <Plus size={16} /> Browse Upcoming Events
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Donations */}
              {dashTab === "donations" && (
                <div>
                  {userDonationList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {userDonationList.map((d) => (
                        <div key={d.id} className="bg-white border-2 border-[#a65a4a]/20 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle size={11} /> Contribution
                              </span>
                              <span className="text-[#a65a4a] font-['Fraunces',serif] text-[20px] font-bold">
                                ₹{d.amount.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <h5 className="font-['Inter',sans-serif] font-bold text-[15px] text-[#1e1e1e] mt-1">{d.cause}</h5>
                          </div>
                          <div className="border-t border-[#a65a4a]/10 pt-3 mt-4 flex items-center justify-between text-[12px] text-[#1e1e1e]/50 font-['Inter',sans-serif]">
                            <span className="flex items-center gap-1"><Clock size={12} /> {d.date}</span>
                            <span className="bg-[#f4efe7] text-[#a65a4a] px-2.5 py-0.5 rounded text-[11px] font-medium">80G Tax Exempt</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-8 border border-[#a65a4a]/15 text-center my-4">
                      <div className="size-14 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-3">
                        <Heart size={28} />
                      </div>
                      <h5 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">No Contribution Records</h5>
                      <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/60 max-w-md mx-auto mt-2 leading-relaxed">
                        Your financial contributions help fund education, health, and women leadership programs across India.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Browse Events */}
              {dashTab === "browse" && (
                <div>
                  {confirmed ? (
                    <div className="flex flex-col items-center text-center gap-5 py-8 bg-white rounded-2xl p-6 border border-[#a65a4a]/15">
                      <div className="size-20 bg-[#587735]/10 rounded-full flex items-center justify-center">
                        <CheckCircle size={40} className="text-[#587735]" />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[#1e1e1e] text-[26px]">You're Registered!</h4>
                      <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[15px] max-w-[400px]">
                        Thank you, <strong className="text-[#a65a4a]">{profile?.name}</strong>! You've successfully registered for <strong className="text-[#a65a4a]">{selectedEvents.length} event(s)</strong>.
                      </p>
                      <button
                        onClick={() => {
                          setConfirmed(false);
                          setSelectedEvents([]);
                          setDashTab("registered");
                        }}
                        className="px-8 py-3 bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
                      >
                        View My Registered Events
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {(["all", "ongoing", "upcoming"] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`font-['Inter',sans-serif] text-[13px] font-semibold px-5 py-2 rounded-full cursor-pointer transition-colors capitalize ${filter === f ? "bg-[#a65a4a] text-[#f4efe7]" : "border border-[#a65a4a]/40 text-[#a65a4a] hover:bg-[#a65a4a]/8"}`}
                          >
                            {f === "all" ? "All Events" : f === "ongoing" ? "🟢 Ongoing" : "📅 Upcoming"}
                          </button>
                        ))}
                        {selectedEvents.length > 0 && (
                          <span className="ml-auto font-['Inter',sans-serif] text-[12px] font-semibold bg-[#a65a4a]/10 text-[#a65a4a] px-3 py-1.5 rounded-full self-center">
                            {selectedEvents.length} selected
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                        {filtered.map(ev => {
                          const selected = selectedEvents.includes(ev.id);
                          return (
                            <button
                              key={ev.id}
                              onClick={() => toggleEvent(ev.id)}
                              className={`text-left rounded-2xl border-2 p-4 sm:p-5 transition-all cursor-pointer ${selected ? "border-[#a65a4a] bg-[#a65a4a]/5" : "border-[#1e1e1e]/10 bg-white hover:border-[#a65a4a]/40"}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <span className={`font-['Inter',sans-serif] text-[11px] font-semibold px-2.5 py-1 rounded-full ${categoryColors[ev.category] ?? "bg-gray-100 text-gray-600"}`}>
                                  {ev.category || "Community Event"}
                                </span>
                                <div className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${selected ? "border-[#a65a4a] bg-[#a65a4a]" : "border-[#1e1e1e]/25"}`}>
                                  {selected && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="size-3"><polyline points="20 6 9 17 4 12" /></svg>}
                                </div>
                              </div>
                              <p className="font-['Inter',sans-serif] font-semibold text-[15px] text-[#1e1e1e] leading-snug">{ev.title}</p>
                              <div className="flex gap-3 mt-2 mb-3">
                                <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/55 flex items-center gap-1"><Calendar size={11} /> {ev.date}</span>
                                <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/55 flex items-center gap-1"><MapPin size={11} /> {ev.location}</span>
                              </div>
                              <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/60 leading-relaxed">{ev.desc}</p>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleConfirm}
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
      </div>
    </div>
  );
}
