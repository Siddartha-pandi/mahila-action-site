"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { saveAllContent, type ContentMap } from "@/lib/content";
import { type SiteData } from "@/lib/data";
import { signInAdmin, signOutAdmin, onAdminAuthChange } from "@/lib/backend";
import {
  getCurrentAdminSession,
  setCurrentAdminSession,
  clearAdminSession,
  hasPermission,
  getRoleById,
  type AdminUser,
  type AdminModule,
} from "@/lib/permissions";
import {
  Inbox,
  Wrench,
  Calendar,
  BookOpen,
  Sparkles,
  Tags,
  Newspaper,
  UserCheck,
  History,
  PhoneCall,
  ShieldCheck,
  LogOut,
  Globe,
  AlertTriangle,
  Lock,
  Trash2,
  Heart,
} from "lucide-react";
import { SubmissionsAdmin } from "@/app/admin/SubmissionsAdmin";
import { ContentTypeBuilderAdmin } from "@/app/admin/ContentTypeBuilderAdmin";
import { EventsAdmin } from "@/app/admin/EventsAdmin";
import { BlogPostsAdmin } from "@/app/admin/BlogPostsAdmin";
import { CategoriesAdmin } from "@/app/admin/CategoriesAdmin";
import { CouncilorsAdmin } from "@/app/admin/CouncilorsAdmin";
import { TimelineAdmin } from "@/app/admin/TimelineAdmin";
import { ContactAdmin } from "@/app/admin/ContactAdmin";
import { CampaignsAdmin } from "@/app/admin/CampaignsAdmin";
import { RolesAdmin } from "@/app/admin/RolesAdmin";
import { RecycleBinAdmin } from "@/app/admin/RecycleBinAdmin";
import { getTrashItems } from "@/lib/recycleBin";
import { useContent } from "../context/ContentContext";
import { LogoMark } from "../components/LogoMark";

import { AdminSidebar } from "@/app/admin/AdminSidebar";

const CUSTOM_TABS = [
  { id: "submissions", label: "Form Submissions & Applications", icon: Inbox },
  { id: "events", label: "Upcoming Events", icon: Calendar },
  { id: "stories", label: "Community Stories", icon: BookOpen },
  { id: "impactStories", label: "Our Impact Pages", icon: Sparkles },
  { id: "categories", label: "Story Categories", icon: Tags },
  { id: "eventsBlog", label: "Events Blog", icon: Newspaper },
  { id: "councilors", label: "Councilors", icon: UserCheck },
  { id: "timeline", label: "Timeline", icon: History },
  { id: "contact", label: "Contact Info", icon: PhoneCall },
  { id: "campaigns", label: "Campaigns", icon: Heart },
  { id: "trash", label: "Recycle Bin", icon: Trash2 },
  { id: "roles", label: "User & Role Management", icon: ShieldCheck },
  { id: "contentTypeBuilder", label: "Content-Type Builder", icon: Wrench, isSuperAdminOnly: true },
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
  const prevExistingJson = useRef<string>(JSON.stringify(existing));
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("submissions");
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser>(() => getCurrentAdminSession());
  const [trashCount, setTrashCount] = useState<number>(() => getTrashItems().length);

  useEffect(() => {
    function syncTrash() {
      setTrashCount(getTrashItems().length);
    }
    syncTrash();
    window.addEventListener("mahila_trash_changed", syncTrash);
    window.addEventListener("storage", syncTrash);
    return () => {
      window.removeEventListener("mahila_trash_changed", syncTrash);
      window.removeEventListener("storage", syncTrash);
    };
  }, []);

  const isDirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(existing);
  }, [draft, existing]);

  useEffect(() => {
    const existingJson = JSON.stringify(existing);
    if (existingJson !== prevExistingJson.current) {
      const draftJson = JSON.stringify(draft);
      const wasDraftSyncedWithPrevExisting = draftJson === prevExistingJson.current;
      prevExistingJson.current = existingJson;

      if (loggedIn && wasDraftSyncedWithPrevExisting) {
        setDraft({ ...existing });
      }
    }
  }, [existing, loggedIn, draft]);

  useEffect(() => {
    let mounted = true;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const unsubscribe = onAdminAuthChange((isLoggedIn) => {
      if (!mounted) return;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      setLoggedIn(isLoggedIn);
      if (isLoggedIn) {
        setDraft({ ...existing });
        setCurrentAdminUser(getCurrentAdminSession());
      }
    });

    fallbackTimer = setTimeout(() => {
      if (mounted) {
        setLoggedIn((current) => (current === null ? false : current));
      }
    }, 1500);

    return () => {
      mounted = false;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      unsubscribe();
    };
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

    const cleanEmail = email.trim().toLowerCase();
    setCurrentAdminSession(cleanEmail);
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

  const visibleTabs = CUSTOM_TABS.filter((t) => {
    if ((t as any).isSuperAdminOnly && currentAdminUser.roleId !== "superadmin") {
      return false;
    }
    return hasPermission(currentAdminUser, t.id as AdminModule, "view");
  });

  const hasViewAccess = hasPermission(currentAdminUser, activeSection as AdminModule, "view");
  const customTab = CUSTOM_TABS.find(t => t.id === activeSection);
  const currentRole = getRoleById(currentAdminUser.roleId);

  function updateSiteData(patch: Partial<SiteData>) {
    onSiteDataChange({ ...siteData, ...patch });
  }

  return (
    <main className="h-full w-full overflow-hidden bg-[#f0ebe3] flex flex-col">
      {/* Admin Header Bar */}
      <div className="bg-[#a65a4a] px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10 shadow-md shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LogoMark invert />
          <div className="hidden xs:block">
            <p className="font-['Fraunces',serif] text-[#f4efe7] text-[16px] sm:text-[18px] font-semibold" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>Admin Panel</p>
            <p className="font-['Inter',sans-serif] text-[#f4efe7]/65 text-[10px] sm:text-[11px] hidden sm:block">Changes go live immediately after saving</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#f4efe7]/15 border border-[#f4efe7]/30 text-[#f4efe7] text-[12px]">
            <div className="w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-[#f4efe7] text-[#a65a4a] font-bold text-[10px] sm:text-[11px] flex items-center justify-center shrink-0">
              {currentAdminUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="font-medium">{currentAdminUser.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-[#f4efe7] text-[#a65a4a]">
                {currentRole.name}
              </span>
            </div>
          </div>

          {isDirty && (
            <span className="bg-amber-300 text-amber-950 font-['Inter',sans-serif] text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Unsaved
            </span>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 font-['Inter',sans-serif] border border-[#f4efe7]/40 text-[#f4efe7] text-[11px] sm:text-[13px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-[#f4efe7]/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 font-['Inter',sans-serif] border border-[#f4efe7]/40 text-[#f4efe7] text-[11px] sm:text-[13px] px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-[#f4efe7]/10 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Site</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 h-full overflow-hidden">
        <AdminSidebar
          visibleTabs={visibleTabs}
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          trashCount={trashCount}
        />

        {/* Main Content Area */}
        <div className="flex-1 h-full min-h-0 overflow-y-auto p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            {customTab?.icon && (
              <div className="w-10 h-10 rounded-xl bg-[#a65a4a]/10 text-[#a65a4a] flex items-center justify-center shadow-xs">
                <customTab.icon className="w-5 h-5" />
              </div>
            )}
            <h2 className="font-['Fraunces',serif] text-[#1e1e1e] text-[22px] font-semibold" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
              {customTab?.label}
            </h2>
          </div>

          {!hasViewAccess || visibleTabs.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-[#a65a4a]/15 text-center max-w-lg mx-auto my-12 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 text-xl">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-['Fraunces',serif] text-[20px] font-semibold text-[#1e1e1e]">Access Restricted</h3>
              <p className="font-['Inter',sans-serif] text-[13px] text-[#1e1e1e]/60 mt-2">
                Standard user accounts <strong>({currentRole.name})</strong> are not permitted to access the Admin Panel. Access is restricted to Super Admin, Admin, and Staff.
              </p>
              {visibleTabs.length > 0 ? (
                <button
                  onClick={() => setActiveSection(visibleTabs[0].id)}
                  className="mt-5 px-5 py-2.5 bg-[#a65a4a] text-white text-[13px] font-semibold rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
                >
                  Return to {visibleTabs[0].label}
                </button>
              ) : (
                <button
                  onClick={onExit}
                  className="mt-5 px-5 py-2.5 bg-[#a65a4a] text-white text-[13px] font-semibold rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
                >
                  ← Back to Website
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
              {activeSection === "campaigns" && (
                <CampaignsAdmin />
              )}
              {activeSection === "trash" && (
                <RecycleBinAdmin />
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
