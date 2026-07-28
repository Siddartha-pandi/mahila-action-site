"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { saveAllContent, type ContentMap } from "@/lib/content";
import { type SiteData } from "@/lib/data";
import { signInAdmin, signOutAdmin, onAdminAuthChange } from "@/lib/backend";
import {
  getCurrentAdminSession, setCurrentAdminSession, clearAdminSession,
  hasPermission, getRoleById, type AdminUser, type AdminModule,
} from "@/lib/permissions";
import { SubmissionsAdmin } from "@/app/admin/SubmissionsAdmin";
import { ContentTypeBuilderAdmin } from "@/app/admin/ContentTypeBuilderAdmin";
import { EventsAdmin } from "@/app/admin/EventsAdmin";
import { BlogPostsAdmin } from "@/app/admin/BlogPostsAdmin";
import { CategoriesAdmin } from "@/app/admin/CategoriesAdmin";
import { CouncilorsAdmin } from "@/app/admin/CouncilorsAdmin";
import { TimelineAdmin } from "@/app/admin/TimelineAdmin";
import { ContactAdmin } from "@/app/admin/ContactAdmin";
import { RolesAdmin } from "@/app/admin/RolesAdmin";
import { useContent } from "../context/ContentContext";
import { LogoMark } from "../components/LogoMark";

const CUSTOM_TABS = [
  { id: "submissions", label: "Form Submissions & Applications" },
  { id: "contentTypeBuilder", label: "🛠️ Content-Type Builder" },
  { id: "events", label: "Upcoming Events" },
  { id: "stories", label: "Community Stories" },
  { id: "impactStories", label: "Our Impact — Read More Pages" },
  { id: "categories", label: "Story Categories" },
  { id: "eventsBlog", label: "Events Blog" },
  { id: "councilors", label: "Councilors" },
  { id: "timeline", label: "Timeline" },
  { id: "contact", label: "Contact Info" },
  { id: "roles", label: "User & Role Management" },
] as const;

export function AdminPage({
  onExit,
  onContentSaved,
  siteData,
  onSiteDataChange,
}: {
  onExit: () => void;
  onContentSaved: (c: ContentMap) => void;
  siteData: SiteData;
  onSiteDataChange: (d: SiteData) => void;
}) {
  const existing = useContent();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [draft, setDraft] = useState<ContentMap>({ ...existing });
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("submissions");
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser>(() => getCurrentAdminSession());

  const isDirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(existing);
  }, [draft, existing]);

  useEffect(() => {
    const unsubscribe = onAdminAuthChange((isLoggedIn) => {
      setLoggedIn(isLoggedIn);
      if (isLoggedIn) {
        setDraft({ ...existing });
        setCurrentAdminUser(getCurrentAdminSession());
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;
    let timer: NodeJS.Timeout;

    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await signOutAdmin();
        clearAdminSession();
        setLoggedIn(false);
        toast.error("Signed out automatically after 5 minutes of inactivity");
        onExit();
      }, INACTIVITY_LIMIT_MS);
    }

    const activityEvents = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [loggedIn]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    const result = await signInAdmin(email, password);
    setSigningIn(false);
    if (!result.ok) return toast.error(result.error || "Incorrect email or password");

    setCurrentAdminSession(email);
    const userSession = getCurrentAdminSession();
    setCurrentAdminUser(userSession);
    setLoggedIn(true);
    setDraft({ ...existing });
    const userRole = getRoleById(userSession.roleId);
    toast.success(`Signed in as ${userRole.name}`);
  }

  async function handleLogout() {
    await signOutAdmin();
    clearAdminSession();
    setLoggedIn(false);
    toast("Signed out");
    onExit();
  }

  async function handleSave() {
    setSaving(true);
    const ok = await saveAllContent(draft);
    setSaving(false);
    if (ok) {
      onContentSaved(draft);
      toast.success("Changes saved and published!");
    } else {
      toast.error("Save failed — changes were NOT stored. Open the browser console (F12) for details.");
    }
  }

  const inputBase = "w-full border border-[#a65a4a]/30 rounded-lg px-3 py-2 text-[14px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a] font-['Inter',sans-serif] bg-white";

  if (loggedIn === null) {
    return (
      <main className="min-h-screen bg-[#f4efe7] flex items-center justify-center px-4">
        <p className="font-['Inter',sans-serif] text-[#1e1e1e]/50 text-[14px]">Checking session…</p>
      </main>
    );
  }

  if (!loggedIn) {
    return (
      <main className="min-h-screen bg-[#f4efe7] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-[420px] overflow-hidden">
          <div className="bg-[#a65a4a] px-7 py-6">
            <h1 className="font-['Fraunces',serif] text-[#f4efe7] text-[24px] font-semibold" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              Admin Panel
            </h1>
            <p className="font-['Inter',sans-serif] text-[#f4efe7]/70 text-[13px] mt-1">Mahila Action — Content &amp; Role Management</p>
          </div>
          <form onSubmit={handleLogin} className="p-7 flex flex-col gap-4">
            <div>
              <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider block mb-1.5">Admin Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@organization.org" className={inputBase} autoFocus required />
            </div>
            <div>
              <label className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider block mb-1.5">Admin Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className={inputBase} required />
            </div>
            <button type="submit" disabled={signingIn} className="w-full bg-[#a65a4a] text-[#f4efe7] font-['Inter',sans-serif] font-semibold text-[15px] py-3 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2 disabled:opacity-60">
              {signingIn ? "Signing in…" : "Sign In"}
            </button>
            <button type="button" onClick={onExit} className="w-full text-[#1e1e1e]/50 font-['Inter',sans-serif] text-[13px] cursor-pointer hover:text-[#a65a4a] transition-colors">
              ← Back to website
            </button>
          </form>
        </div>
      </main>
    );
  }

  const visibleTabs = CUSTOM_TABS.filter((t) => hasPermission(currentAdminUser, t.id as AdminModule, "view"));
  const hasViewAccess = hasPermission(currentAdminUser, activeSection as AdminModule, "view");
  const customTab = CUSTOM_TABS.find(t => t.id === activeSection);
  const currentRole = getRoleById(currentAdminUser.roleId);

  function updateSiteData(patch: Partial<SiteData>) {
    onSiteDataChange({ ...siteData, ...patch });
  }

  return (
    <main className="min-h-screen bg-[#f0ebe3] flex flex-col">
      <div className="bg-[#a65a4a] px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <LogoMark invert />
          <div>
            <p className="font-['Fraunces',serif] text-[#f4efe7] text-[18px] font-semibold" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>Admin Panel</p>
            <p className="font-['Inter',sans-serif] text-[#f4efe7]/65 text-[11px]">Changes go live immediately after saving</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#f4efe7]/15 border border-[#f4efe7]/30 text-[#f4efe7] text-[12px]">
            <div className="w-6 h-6 rounded-full bg-[#f4efe7] text-[#a65a4a] font-bold text-[11px] flex items-center justify-center shrink-0">
              {currentAdminUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-medium">{currentAdminUser.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-[#f4efe7] text-[#a65a4a]">
                {currentRole.name}
              </span>
            </div>
          </div>

          {isDirty && (
            <span className="bg-amber-300 text-amber-950 font-['Inter',sans-serif] text-[11px] font-bold px-3 py-1 rounded-full animate-pulse">
              Unsaved Changes
            </span>
          )}
          <button onClick={handleLogout} className="font-['Inter',sans-serif] border border-[#f4efe7]/40 text-[#f4efe7] text-[13px] px-4 py-2 rounded-full hover:bg-[#f4efe7]/10 transition-colors cursor-pointer">
            Sign Out
          </button>
          <button onClick={onExit} className="font-['Inter',sans-serif] border border-[#f4efe7]/40 text-[#f4efe7] text-[13px] px-4 py-2 rounded-full hover:bg-[#f4efe7]/10 transition-colors cursor-pointer">
            ← View Site
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-[250px] shrink-0 bg-white border-r border-[#a65a4a]/15 py-4 hidden md:block overflow-y-auto">
          <p className="px-5 pb-2 font-['Inter',sans-serif] text-[10px] font-bold text-[#1e1e1e]/35 uppercase tracking-wider">Manage Content &amp; Access</p>
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveSection(t.id)}
              className={`w-full text-left px-5 py-3 font-['Inter',sans-serif] text-[13px] font-medium transition-colors cursor-pointer ${activeSection === t.id ? "bg-[#a65a4a]/10 text-[#a65a4a] border-r-2 border-[#a65a4a]" : "text-[#1e1e1e]/60 hover:text-[#a65a4a] hover:bg-[#a65a4a]/5"}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="md:hidden w-full px-4 pt-4">
          <select value={activeSection} onChange={e => setActiveSection(e.target.value)} className={`${inputBase} mb-4`}>
            {visibleTabs.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <h2 className="font-['Fraunces',serif] text-[#1e1e1e] text-[22px] font-semibold mb-6" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
            {customTab?.label}
          </h2>

          {!hasViewAccess ? (
            <div className="bg-white rounded-2xl p-8 border border-[#a65a4a]/15 text-center max-w-lg mx-auto my-12">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                🔒
              </div>
              <h3 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">Access Restricted</h3>
              <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/60 mt-2">
                Your role <strong>({currentRole.name})</strong> does not have permission to view the <strong>{customTab?.label}</strong> module.
              </p>
              {visibleTabs.length > 0 && (
                <button
                  onClick={() => setActiveSection(visibleTabs[0].id)}
                  className="mt-5 px-5 py-2.5 bg-[#a65a4a] text-white text-[13px] font-semibold rounded-full hover:bg-[#993925] transition-colors"
                >
                  Return to {visibleTabs[0].label}
                </button>
              )}
            </div>
          ) : (
            <>
              {activeSection === "roles" && (
                <RolesAdmin onSessionChange={(u) => setCurrentAdminUser(u)} />
              )}
              {activeSection === "submissions" && (
                <SubmissionsAdmin />
              )}
              {activeSection === "contentTypeBuilder" && (
                <ContentTypeBuilderAdmin />
              )}
              {activeSection === "events" && (
                <EventsAdmin events={siteData.events} categories={siteData.categories} onChange={(events) => updateSiteData({ events })} />
              )}
              {activeSection === "stories" && (
                <BlogPostsAdmin
                  section="story"
                  posts={siteData.blogPosts}
                  categories={siteData.categories}
                  onChange={(blogPosts) => updateSiteData({ blogPosts })}
                />
              )}
              {activeSection === "eventsBlog" && (
                <BlogPostsAdmin
                  section="event"
                  posts={siteData.blogPosts}
                  categories={siteData.categories}
                  onChange={(blogPosts) => updateSiteData({ blogPosts })}
                />
              )}
              {activeSection === "impactStories" && (
                <BlogPostsAdmin
                  section="impact"
                  posts={siteData.blogPosts}
                  categories={siteData.categories}
                  onChange={(blogPosts) => updateSiteData({ blogPosts })}
                />
              )}
              {activeSection === "categories" && (
                <CategoriesAdmin
                  categories={siteData.categories}
                  posts={siteData.blogPosts}
                  onCategoriesChange={(categories) => updateSiteData({ categories })}
                  onPostsChange={(blogPosts) => updateSiteData({ blogPosts })}
                />
              )}
              {activeSection === "councilors" && (
                <CouncilorsAdmin councilors={siteData.councilors} onChange={(councilors) => updateSiteData({ councilors })} />
              )}
              {activeSection === "timeline" && (
                <TimelineAdmin timeline={siteData.timeline} onChange={(timeline) => updateSiteData({ timeline })} />
              )}
              {activeSection === "contact" && (
                <ContactAdmin contact={siteData.contact} onChange={(contact) => updateSiteData({ contact })} />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
