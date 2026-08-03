"use client";

import { useState, useEffect } from "react";
import {
  LogIn,
  Menu,
  X,
  User,
  Heart,
  Home,
  Users,
  BookOpen,
  Calendar,
  Mail,
  ChevronRight,
} from "lucide-react";
import { getSavedUserSession, type VolunteerAccountProfile } from "@/lib/backend";
import { LogoMark } from "./LogoMark";
import { useModal } from "../hooks/useModal";
import { clearIntendedDestination } from "../hooks/useAuthGuard";
import { inter, type Page } from "./shared/styleHelpers";

export function Navigation({
  page,
  setPage,
}: {
  page: Page;
  setPage: (p: Page) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userSession, setUserSession] = useState<VolunteerAccountProfile | null>(getSavedUserSession);
  const { openModal } = useModal();

  useEffect(() => {
    function syncSession() {
      setUserSession(getSavedUserSession());
    }
    window.addEventListener("mahila_user_session_changed", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("mahila_user_session_changed", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Handle ESC key to close mobile menu
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const links: { label: string; page: Page; icon: typeof Home }[] = [
    { label: "Home", page: "home", icon: Home },
    { label: "Who Are We", page: "about", icon: Users },
    { label: "Our Stories", page: "stories", icon: BookOpen },
    { label: "Events", page: "eventsBlog", icon: Calendar },
    { label: "Contact Us", page: "contact", icon: Mail },
  ];

  function nav(p: Page) {
    setPage(p);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <header className="sticky top-0 z-50 bg-[#f4efe7]/95 backdrop-blur-md border-b border-[#a65a4a]/15 shadow-xs transition-all">
      <div className="max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          onClick={() => nav("home")}
          className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a65a4a] rounded-lg transition-transform active:scale-95 shrink-0"
          aria-label="Mahila Action Home"
        >
          <LogoMark />
        </button>

        {/* Navigation Links (Tablet & Desktop: md & lg & xl) */}
        <nav className="hidden md:flex items-center gap-0.5 lg:gap-1.5 xl:gap-2">
          {links.map((l) => {
            const isActive = page === l.page;
            return (
              <button
                key={l.page}
                onClick={() => nav(l.page)}
                className={`${inter()} px-2.5 lg:px-4 py-1.5 lg:py-2 text-[13px] lg:text-[15px] font-medium rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#a65a4a]/12 text-[#a65a4a] font-semibold"
                    : "text-[#1e1e1e]/80 hover:text-[#a65a4a] hover:bg-[#a65a4a]/6"
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3">
          {/* Donate CTA (Visible on tablet & desktop >= 640px) */}
          <button
            onClick={() => nav("donate")}
            className={`hidden sm:inline-flex items-center gap-1.5 lg:gap-2 ${inter()} bg-[#a65a4a] text-[#f4efe7] text-[12px] sm:text-[13px] lg:text-[15px] font-medium px-3.5 sm:px-4.5 lg:px-6 py-1.5 sm:py-2 lg:py-2.5 rounded-full hover:bg-[#993925] hover:shadow-md transition-all cursor-pointer shrink-0 whitespace-nowrap`}
          >
            <Heart size={15} className="fill-[#f4efe7] shrink-0" />
            <span>Donate Now</span>
          </button>

          {/* User Profile / Login */}
          {!userSession ? (
            <button
              onClick={() => {
                // Signing in deliberately from the header should land on the
                // account page, not resume a gate the visitor walked away from.
                clearIntendedDestination();
                openModal("login");
              }}
              className={`${inter()} border-2 border-[#a65a4a] text-[#a65a4a] hover:bg-[#a65a4a] hover:text-[#f4efe7] text-[12px] sm:text-[14px] font-semibold px-3 sm:px-5 py-1 sm:py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap`}
            >
              <LogIn size={14} className="shrink-0" />
              <span>Login</span>
            </button>
          ) : (
            <button
              onClick={() => nav("account")}
              className={`${inter()} border-2 border-[#a65a4a] text-[12px] sm:text-[14px] font-semibold px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 ${
                page === "account"
                  ? "bg-[#a65a4a] text-[#f4efe7] hover:bg-[#993925]"
                  : "bg-[#a65a4a]/10 text-[#a65a4a] hover:bg-[#a65a4a]/15 hover:text-[#993925]"
              }`}
              title="View My Account Profile"
            >
              <div
                className={`size-5 sm:size-6 rounded-full font-bold text-[10px] sm:text-[12px] flex items-center justify-center shrink-0 transition-colors ${
                  page === "account"
                    ? "bg-[#f4efe7] text-[#a65a4a]"
                    : "bg-[#a65a4a] text-[#f4efe7]"
                }`}
              >
                {userSession.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[55px] sm:max-w-[100px] lg:max-w-[140px] truncate">
                {userSession.name.split(" ")[0]}
              </span>
            </button>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            className="md:hidden p-1.5 sm:p-2 rounded-xl text-[#1e1e1e] hover:text-[#a65a4a] hover:bg-[#a65a4a]/10 transition-colors cursor-pointer shrink-0"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (Mobile Screens < 768px) */}
      {menuOpen && (
        <div className="fixed inset-0 top-[56px] sm:top-[68px] z-40 md:hidden flex flex-col justify-start">
          {/* Semi-transparent backdrop overlay */}
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
          />

          {/* Drawer menu body */}
          <div className="relative z-10 bg-[#f4efe7] border-b-2 border-[#a65a4a]/30 shadow-2xl rounded-b-3xl px-4 sm:px-6 pt-3 pb-6 flex flex-col gap-1 max-h-[calc(100vh-75px)] overflow-y-auto">
            <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#a65a4a] px-3 py-1 mb-1">
              Navigation Menu
            </div>

            {links.map((l) => {
              const isActive = page === l.page;
              const Icon = l.icon;
              return (
                <button
                  key={l.page}
                  onClick={() => nav(l.page)}
                  className={`${inter()} flex items-center justify-between w-full px-4 py-3 text-[14px] sm:text-[15px] font-medium rounded-2xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#a65a4a] text-[#f4efe7] font-semibold shadow-xs"
                      : "text-[#1e1e1e] hover:bg-[#a65a4a]/10 hover:text-[#a65a4a]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className={isActive ? "text-[#f4efe7]" : "text-[#a65a4a]"} />
                    <span>{l.label}</span>
                  </div>
                  <ChevronRight
                    size={16}
                    className={isActive ? "text-[#f4efe7]/80" : "text-[#1e1e1e]/30"}
                  />
                </button>
              );
            })}

            <div className="pt-4 mt-2 border-t border-[#a65a4a]/20 flex flex-col gap-2.5 sm:gap-3">
              {/* Mobile Donate Button */}
              <button
                onClick={() => nav("donate")}
                className={`w-full ${inter()} bg-[#a65a4a] text-[#f4efe7] text-[14px] sm:text-[15px] font-semibold px-6 py-3 sm:py-3.5 rounded-2xl cursor-pointer hover:bg-[#993925] transition-all flex items-center justify-center gap-2 shadow-sm`}
              >
                <Heart size={18} className="fill-[#f4efe7]" />
                <span>Donate Now</span>
              </button>

              {/* Mobile Auth Button */}
              {!userSession ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    clearIntendedDestination();
                    openModal("login");
                  }}
                  className={`${inter()} w-full border-2 border-[#a65a4a] text-[#a65a4a] text-[14px] sm:text-[15px] font-semibold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer hover:bg-[#a65a4a] hover:text-[#f4efe7] transition-all`}
                >
                  <LogIn size={18} />
                  <span>Sign In / Register</span>
                </button>
              ) : (
                <button
                  onClick={() => nav("account")}
                  className={`${inter()} w-full bg-[#a65a4a]/10 border-2 border-[#a65a4a] text-[#a65a4a] text-[14px] sm:text-[15px] font-semibold px-6 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer hover:bg-[#a65a4a] hover:text-[#f4efe7] transition-all`}
                >
                  <User size={18} />
                  <span>{userSession.name} (My Account)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
