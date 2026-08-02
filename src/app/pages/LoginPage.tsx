"use client";

import { useState } from "react";
import { LogIn, LogOut, User, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
  saveVolunteer, signInAdmin, loginVolunteer, registerVolunteer,
  saveUserSession, getUserSubmissions, type VolunteerAccountProfile, type SubmissionItem,
} from "@/lib/backend";
import { isValidPhoneNumber } from "@/lib/validation";
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

  const [mode, setMode] = useState<"login" | "register">("login");
  const [authBusy, setAuthBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regSkill, setRegSkill] = useState("");

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
    if (!regName.trim()) return toast.error("Please enter your full name");
    if (!email.includes("@")) return toast.error("Please enter a valid email");
    if (!isValidPhoneNumber(regPhone)) return toast.error("Please enter a valid phone number (+91 98765 43210)");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

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
                  {mode === "login" ? "Account Sign In" : "Create Account"}
                </h2>
                <p className="font-['Inter',sans-serif] text-[#f4efe7]/75 text-[13px] mt-1">
                  {mode === "login" ? "Access your registered events & contributions" : "Register to participate in community initiatives"}
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
                      <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/55 uppercase tracking-wider block mb-1.5">Password</label>
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
                      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" className="w-full border-2 border-[#a65a4a]/25 bg-[#f4efe7] rounded-xl px-4 py-3 text-[14px] text-[#1e1e1e] placeholder-[#1e1e1e]/35 focus:outline-none focus:border-[#a65a4a] transition-colors font-['Inter',sans-serif]" required />
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
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
