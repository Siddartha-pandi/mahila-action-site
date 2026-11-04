"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Eye,
  LayoutDashboard,
  ShieldCheck,
  ChevronUp,
  Maximize2,
  Pencil,
  LogOut,
  HeartHandshake,
  PhoneCall,
  SlidersHorizontal,
} from "lucide-react";
import { onAdminAuthChange, signOutAdmin } from "@/lib/backend";
import { getCurrentAdminSession, getRoleById, clearAdminSession, type AdminUser } from "@/lib/permissions";
import { type Page } from "./shared/styleHelpers";

interface AdminObservationBarProps {
  page: Page;
  setPage: (p: Page) => void;
}

export function AdminObservationBar({ page, setPage }: AdminObservationBarProps) {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return Boolean(sessionStorage.getItem("admin_jwt"));
    }
    return false;
  });
  const [adminUser, setAdminUser] = useState<AdminUser>(() => getCurrentAdminSession());
  const [minimized, setMinimized] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("mahila_admin_bar_minimized") === "true";
    }
    return false;
  });

  useEffect(() => {
    const unsub = onAdminAuthChange((loggedIn) => {
      setIsAdmin(loggedIn);
      if (loggedIn) {
        setAdminUser(getCurrentAdminSession());
      }
    });

    const handleStorage = () => {
      const token = sessionStorage.getItem("admin_jwt");
      setIsAdmin(Boolean(token));
      if (token) {
        setAdminUser(getCurrentAdminSession());
      }
    };

    window.addEventListener("mahila_admin_auth_changed", handleStorage);
    window.addEventListener("storage", handleStorage);

    return () => {
      unsub();
      window.removeEventListener("mahila_admin_auth_changed", handleStorage);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function toggleMinimized() {
    const next = !minimized;
    setMinimized(next);
    try {
      sessionStorage.setItem("mahila_admin_bar_minimized", String(next));
    } catch {}
  }

  function handleReturnToAdmin(tab?: string) {
    if (tab) {
      try {
        localStorage.setItem("mahila_admin_active_tab", tab);
      } catch {}
      navigate(`/admin?tab=${encodeURIComponent(tab)}`);
    } else {
      setPage("admin");
    }
  }

  async function handleSignOut() {
    await signOutAdmin();
    clearAdminSession();
    setIsAdmin(false);
    toast.success("Signed out of Admin Panel");
  }

  if (!isAdmin) {
    return null;
  }

  const role = getRoleById(adminUser?.roleId);

  // Contextual shortcut based on the page currently being observed
  let contextualAction: { label: string; tab: string; icon: typeof Pencil } | null = null;
  if (page === "eventsBlog") {
    contextualAction = { label: "Edit Events", tab: "events", icon: Pencil };
  } else if (page === "stories") {
    contextualAction = { label: "Edit Stories", tab: "stories", icon: Pencil };
  } else if (page === "donate") {
    contextualAction = { label: "Manage Donations", tab: "donations", icon: HeartHandshake };
  } else if (page === "contact") {
    contextualAction = { label: "Edit Contact", tab: "contact", icon: PhoneCall };
  } else if (page === "about") {
    contextualAction = { label: "Edit Timeline / Councilors", tab: "timeline", icon: SlidersHorizontal };
  }

  // Minimized floating pill
  if (minimized) {
    return (
      <aside
        aria-label="Admin Observation Controls"
        className="fixed bottom-4 right-4 z-[999] flex items-center gap-2 bg-[#1c1917]/95 backdrop-blur-md text-[#f4efe7] border-2 border-amber-500/50 px-3.5 py-2 rounded-full shadow-2xl animate-in slide-in-from-bottom-2 duration-200"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
        <button
          onClick={() => handleReturnToAdmin()}
          className="font-semibold text-[12px] sm:text-[13px] text-white hover:text-amber-200 cursor-pointer flex items-center gap-1.5 transition-colors"
          title="Return to Admin Panel"
        >
          <span>Return to Admin Panel</span>
        </button>
        <button
          onClick={toggleMinimized}
          className="p-1 text-white/50 hover:text-white rounded-full hover:bg-white/10 ml-0.5 cursor-pointer transition-colors"
          title="Expand observation toolbar"
          aria-label="Expand observation toolbar"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </aside>
    );
  }

  return (
    <div className="bg-[#1c1917] text-[#f4efe7] border-b border-amber-500/30 px-3 sm:px-6 py-2 z-[60] shadow-md transition-all">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-2 text-xs sm:text-[13px]">
        {/* Left: Indicator & Admin Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0 bg-white/10 text-white px-2.5 py-1 rounded-full border border-white/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Eye className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-semibold text-[11px] uppercase tracking-wider text-amber-300">
              Observing Site
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-white/80 truncate text-[12px]">
            <span>Admin:</span>
            <strong className="text-white font-semibold truncate max-w-[120px] md:max-w-none">
              {adminUser.name}
            </strong>
            <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              {role.name}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Contextual Edit Button */}
          {contextualAction && (
            <button
              onClick={() => handleReturnToAdmin(contextualAction?.tab)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-[11px] sm:text-[12px] font-medium transition-colors cursor-pointer border border-white/15"
              title={`Jump to Admin Panel to ${contextualAction.label}`}
            >
              <contextualAction.icon className="w-3.5 h-3.5 text-amber-300" />
              <span>{contextualAction.label}</span>
            </button>
          )}

          {/* Primary CTA: Return to Admin Panel */}
          <button
            onClick={() => handleReturnToAdmin()}
            className="flex items-center gap-1.5 bg-[#a65a4a] hover:bg-[#993925] text-white px-3 sm:px-4 py-1.5 rounded-full font-semibold text-[11px] sm:text-[13px] shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap border border-white/10"
            title="Return to Admin Panel"
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0 text-amber-200" />
            <span>Return to Admin Panel</span>
          </button>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="hidden xs:flex items-center gap-1 px-2.5 py-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 text-[11px] sm:text-[12px] transition-colors cursor-pointer"
            title="Sign out of Admin Session"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>

          {/* Minimize bar */}
          <button
            onClick={toggleMinimized}
            className="p-1.5 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Minimize observation toolbar (restore from floating button)"
            aria-label="Minimize observation toolbar"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

