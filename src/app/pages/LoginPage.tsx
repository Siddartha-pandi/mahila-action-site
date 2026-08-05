"use client";

import { useState, useEffect } from "react";
import { LogIn, LogOut, User, CheckCircle, AlertCircle, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  saveVolunteer, signInAdmin, loginVolunteer, registerVolunteer,
  requestVolunteerPasswordReset, resetVolunteerPassword,
  saveUserSession, getUserSubmissions, type VolunteerAccountProfile, type SubmissionItem,
} from "@/lib/backend";
import { firstError, validateEmail, validateName, validatePassword, validatePhone } from "@/lib/validation";
import { setCurrentAdminSession } from "@/lib/permissions";
import { imgHeroCard } from "../constants/images";
import { PageBanner } from "../components/PageBanner";
import { inter, fraunces, type Page } from "../components/shared/styleHelpers";

export function LoginPage({ setPage }: { setPage: (p: Page) => void }) {
  const [profile, setProfile] = useState<VolunteerAccountProfile | null>(() => {
    try {
      const raw = localStorage.getItem("mahila_user_session");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [authBusy, setAuthBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regSkill, setRegSkill] = useState("");

  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState("");
  const [resetPass, setResetPass] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const kind = params.get("kind");
      const modal = params.get("modal");
      const id = params.get("id") || params.get("token");
      if (kind === "reset" || modal === "reset" || (id && (kind === "reset" || modal === "volunteer"))) {
        setMode("reset");
        if (id) setResetToken(id);
      }
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const identifier = email.trim();
    if (!identifier) return toast.error("Please enter your email or username");
    if (!password.trim()) return toast.error("Please enter your password");

    setAuthBusy(true);
    const lowerId = identifier.toLowerCase();
    const lowerPass = password.toLowerCase().trim();

    const isAdminAttempt =
      lowerId.includes("admin") || lowerId.includes("super") ||
      lowerId === "mahilaaction.vsk@gmail.com" ||
      lowerId === "superadmin" || lowerId === "super admin" ||
      lowerPass === "admin123" || lowerPass === "superadmin" || lowerPass === "admin";

    if (isAdminAttempt) {
      const adminRes = await signInAdmin(identifier, password);
      if (adminRes.ok) {
        let canonicalEmail = identifier;
        if (lowerId === "superadmin" || lowerId === "super admin" || lowerId === "super") {
          canonicalEmail = "mahilaaction.vsk@gmail.com";
        }
        setCurrentAdminSession(canonicalEmail);
        setAuthBusy(false);
        toast.success("Signed in to Admin Panel!");
        setPage("admin");
        return;
      }
    }

    const result = await loginVolunteer(identifier, password);
    if (result.ok && result.profile) {
      setAuthBusy(false);
      saveUserSession(result.profile);
      setProfile(result.profile);
      toast.success(`Welcome back, ${result.profile.name}!`);
      setPage("account");
      return;
    }

    const fallbackAdmin = await signInAdmin(identifier, password);
    setAuthBusy(false);
    if (fallbackAdmin.ok) {
      let canonicalEmail = identifier;
      if (lowerId === "superadmin" || lowerId === "super admin" || lowerId === "super") {
        canonicalEmail = "mahilaaction.vsk@gmail.com";
      }
      setCurrentAdminSession(canonicalEmail);
      toast.success("Signed in to Admin Panel!");
      setPage("admin");
      return;
    }

    toast.error(result.error || "Incorrect email or password");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const invalid = firstError(
      validateName(regName),
      validateEmail(email),
      validatePhone(regPhone),
      validatePassword(password)
    );
    if (invalid) return toast.error(invalid);

    setAuthBusy(true);
    const result = await registerVolunteer({ name: regName, email, phone: regPhone, password, skills: regSkill });
    setAuthBusy(false);

    if (result.ok && result.profile) {
      saveUserSession(result.profile);
      setProfile(result.profile);
      toast.success("Account created successfully!");
      setPage("account");
    } else {
      toast.error(result.error || "Registration failed. Please try again.");
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    const invalidEmail = validateEmail(email);
    if (invalidEmail) return toast.error(invalidEmail);
    setAuthBusy(true);
    setForgotError(null);
    const result = await requestVolunteerPasswordReset(email);
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
    const weak = validatePassword(resetPass, "New password");
    if (weak) return toast.error(weak);
    if (resetPass !== resetConfirm) return toast.error("Passwords don't match.");
    setAuthBusy(true);
    const result = await resetVolunteerPassword(resetToken, resetPass);
    setAuthBusy(false);
    if (!result.ok) return toast.error(result.error || "Something went wrong — please try again.");
    if (result.profile?.email) {
      setEmail(result.profile.email);
    }
    toast.success("Password updated successfully! You can now sign in with your new password.");
    setMode("login");
  }

  return (
    <main className="bg-[#f4efe7] min-h-screen">
      <PageBanner img={imgHeroCard} title="User Login" />

      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-[1200px] mx-auto">
          {profile ? (
            <div className="max-w-[500px] w-full mx-auto bg-white rounded-3xl p-8 border border-[#a65a4a]/20 text-center shadow-lg">
              <div className="size-16 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="font-['Fraunces',serif] text-[24px] font-semibold text-[#1e1e1e]">Currently Signed In</h3>
              <p className="font-['Inter',sans-serif] text-[15px] text-[#1e1e1e]/65 max-w-md mx-auto mt-2 leading-relaxed">
                You are logged in as <strong className="text-[#a65a4a]">{profile.name}</strong> ({profile.email}).
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => setPage("account")} className="w-full sm:w-auto px-7 py-3 bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] rounded-full hover:bg-[#993925] transition-colors cursor-pointer inline-flex items-center justify-center gap-2">
                  <User size={18} /> Go to My Account →
                </button>
                <button
                  onClick={() => { saveUserSession(null); setProfile(null); toast.success("Signed out"); }}
                  className="w-full sm:w-auto px-5 py-3 border border-[#a65a4a]/30 text-[#a65a4a] font-['Inter',sans-serif] font-semibold text-[14px] rounded-full hover:bg-[#a65a4a]/10 transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-[480px] w-full mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-[#a65a4a]/20 overflow-hidden">
              <div className="bg-[#a65a4a] px-8 py-6 text-center">
                <h2 className="font-['Fraunces',serif] text-[#f4efe7] text-[26px] font-semibold" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                  {mode === "login" ? "Account Sign In" : mode === "register" ? "Create Account" : mode === "forgot" ? "Reset Password" : "Choose New Password"}
                </h2>
                <p className="font-['Inter',sans-serif] text-[#f4efe7]/75 text-[13px] mt-1">
                  {mode === "login" ? "Access your registered events & contributions" : mode === "register" ? "Register to participate in community initiatives" : mode === "forgot" ? "Enter your registered email address" : "Choose a strong new password"}
                </p>
              </div>

              <div className="p-8">
                {mode === "login" && (
                  <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Email or Username</label>
                      <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com or superadmin" className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]" required />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block">Password</label>
                        <button
                          type="button"
                          onClick={() => { setForgotSent(false); setForgotError(null); setMode("forgot"); }}
                          className="font-['Inter',sans-serif] text-[12px] text-[#a65a4a] font-semibold cursor-pointer hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]" required />
                    </div>
                    <button type="submit" disabled={authBusy} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60 flex items-center justify-center gap-2">
                      <LogIn size={18} />
                      {authBusy ? "Signing in…" : "Sign In"}
                    </button>
                    <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55 mt-2">
                      New user?{" "}
                      <button type="button" onClick={() => setMode("register")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">Create an account</button>
                    </p>
                  </form>
                )}

                {mode === "register" && (
                  <form onSubmit={handleRegister} className="flex flex-col gap-4">
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Full Name *</label>
                      <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Your full name" className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]" required />
                    </div>
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Email Address *</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]" required />
                    </div>
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Phone Number *</label>
                      <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]" required />
                    </div>
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Password *</label>
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]" required />
                    </div>
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Primary Skill / Interest</label>
                      <select value={regSkill} onChange={e => setRegSkill(e.target.value)} className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif] cursor-pointer">
                        <option value="">Select skill area…</option>
                        <option>Teaching / Education</option>
                        <option>Healthcare / Support</option>
                        <option>Event Operations</option>
                        <option>Digital / Technology</option>
                        <option>Legal &amp; Social Rights</option>
                        <option>General Support</option>
                      </select>
                    </div>
                    <button type="submit" disabled={authBusy} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60">
                      {authBusy ? "Creating account…" : "Create Account & Continue"}
                    </button>
                    <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55 mt-2">
                      Already have an account?{" "}
                      <button type="button" onClick={() => setMode("login")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">Sign In</button>
                    </p>
                  </form>
                )}

                {mode === "forgot" && (
                  forgotSent ? (
                    <div className="flex flex-col items-center text-center gap-4 py-4">
                      <div className="size-16 bg-[#587735]/10 rounded-full flex items-center justify-center">
                        <CheckCircle size={32} className="text-[#587735]" />
                      </div>
                      <h4 className="font-['Fraunces',serif] text-[#1e1e1e] text-[20px] font-semibold">Check your email</h4>
                      <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[14px] leading-relaxed">
                        We've sent a link to reset your password to <span className="font-semibold text-[#1e1e1e]">{email}</span>. It can take a few minutes to arrive — remember to check your spam folder.
                      </p>
                      <button type="button" onClick={() => { setForgotSent(false); setMode("login"); }} className="mt-2 font-['Inter',sans-serif] text-[13px] text-[#a65a4a] font-semibold cursor-pointer hover:underline">
                        ← Back to sign in
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                      <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[13px] leading-relaxed">
                        Enter your registered email address below and we'll send you a secure link to reset your password.
                      </p>
                      <div>
                        <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Email Address</label>
                        <input type="email" value={email} onChange={e => { setEmail(e.target.value); setForgotError(null); }} placeholder="you@email.com" className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]" required autoFocus />
                      </div>

                      {forgotError && (
                        <div className="flex items-start gap-2.5 bg-[#993925]/8 border border-[#993925]/25 rounded-xl px-4 py-3">
                          <AlertCircle size={17} className="text-[#993925] shrink-0 mt-0.5" />
                          <p className="font-['Inter',sans-serif] text-[#993925] text-[13px] leading-relaxed">
                            {forgotError}
                            <br />
                            <button type="button" onClick={() => { setForgotError(null); setMode("register"); }} className="font-semibold underline cursor-pointer mt-0.5">
                              Create an account instead
                            </button>
                          </p>
                        </div>
                      )}

                      <button type="submit" disabled={authBusy} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60">
                        {authBusy ? "Sending…" : "Send Reset Link"}
                      </button>
                      <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55 mt-2">
                        <button type="button" onClick={() => setMode("login")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">← Back to sign in</button>
                      </p>
                    </form>
                  )
                )}

                {mode === "reset" && (
                  <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                    {!resetToken ? (
                      <div className="flex items-start gap-2.5 bg-[#993925]/8 border border-[#993925]/25 rounded-xl px-4 py-3">
                        <AlertCircle size={17} className="text-[#993925] shrink-0 mt-0.5" />
                        <p className="font-['Inter',sans-serif] text-[#993925] text-[13px] leading-relaxed">
                          This reset link is missing its token.{" "}
                          <button type="button" onClick={() => { setForgotSent(false); setForgotError(null); setMode("forgot"); }} className="font-semibold underline cursor-pointer">
                            Request a new one
                          </button>
                        </p>
                      </div>
                    ) : (
                      <p className="font-['Inter',sans-serif] text-[#1e1e1e]/65 text-[13px] leading-relaxed">
                        Choose a new password for your account. It must be at least 8 characters long.
                      </p>
                    )}
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">New Password</label>
                      <input type="password" value={resetPass} onChange={e => setResetPass(e.target.value)} placeholder="••••••••" className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]" required autoFocus />
                    </div>
                    <div>
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Confirm New Password</label>
                      <input type="password" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)} placeholder="••••••••" className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]" required />
                    </div>
                    {resetConfirm.length > 0 && resetPass !== resetConfirm && (
                      <p className="font-['Inter',sans-serif] text-[#993925] text-[12px] -mt-1">Passwords don't match.</p>
                    )}
                    <button type="submit" disabled={authBusy} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[16px] py-4 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60">
                      {authBusy ? "Saving…" : "Save New Password"}
                    </button>
                    <p className="font-['Inter',sans-serif] text-[13px] text-center text-[#1e1e1e]/55 mt-2">
                      <button type="button" onClick={() => setMode("login")} className="text-[#a65a4a] font-semibold cursor-pointer hover:underline">← Back to sign in</button>
                    </p>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

