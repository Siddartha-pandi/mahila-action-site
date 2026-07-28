"use client";

import { useState, useEffect } from "react";
import { LogIn, Menu, X, User } from "lucide-react";
import { getSavedUserSession, type VolunteerAccountProfile } from "@/lib/backend";
import { LogoMark } from "./LogoMark";
import { useModal } from "../hooks/useModal";
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

  const links: { label: string; page: Page }[] = [
    { label: "Home", page: "home" },
    { label: "Who Are We", page: "about" },
    { label: "Our Stories", page: "stories" },
    { label: "Events Blog", page: "eventsBlog" },
    { label: "Contact Us", page: "contact" },
  ];

  function nav(p: Page) {
    setPage(p);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }

  return (
    <header className="sticky top-0 z-50 bg-[#f4efe7] shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => nav("home")}
          className="cursor-pointer"
        >
          <LogoMark />
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <button
              key={l.page}
              onClick={() => nav(l.page)}
              className={`${inter()} px-5 py-3 text-[15px] font-medium rounded-lg transition-colors cursor-pointer ${page === l.page
                ? "text-[#a65a4a]"
                : "text-[#1e1e1e] hover:text-[#a65a4a]"
                }`}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Donate Now Button */}
          <button
            onClick={() => nav("donate")}
            className={`hidden md:flex ${inter()} bg-[#a65a4a] text-[#f4efe7] text-[15px] font-medium px-7 py-3 rounded-full hover:bg-[#993925] transition-colors cursor-pointer`}
          >
            Donate Now
          </button>

          {/* User Auth Status */}
          {!userSession ? (
            <button
              onClick={() => openModal("login")}
              className={`${inter()} border-2 border-[#a65a4a] text-[#a65a4a] hover:bg-[#a65a4a] hover:text-[#f4efe7] text-[13px] sm:text-[15px] font-medium px-4 sm:px-6 py-2 sm:py-2.5 rounded-full transition-colors cursor-pointer flex items-center gap-1.5 sm:gap-2`}
            >
              <LogIn size={15} />
              <span>Login</span>
            </button>
          ) : (
            <button
              onClick={() => nav("account")}
              className={`${inter()} bg-[#a65a4a]/10 border-2 border-[#a65a4a] text-[#a65a4a] hover:bg-[#a65a4a] hover:text-[#f4efe7] text-[13px] sm:text-[14px] font-semibold px-3 sm:px-4.5 py-1.5 sm:py-2.5 rounded-full transition-colors cursor-pointer flex items-center gap-2 shadow-sm ${page === "account" ? "bg-[#a65a4a] text-[#f4efe7]" : ""}`}
              title="View My Registered Events & Account Profile"
            >
              <div className="size-5 sm:size-6 rounded-full bg-[#a65a4a] text-[#f4efe7] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">
                {userSession.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[75px] sm:max-w-[120px] truncate">{userSession.name.split(" ")[0]}</span>
            </button>
          )}

          <button
            className="md:hidden p-2 cursor-pointer text-[#1e1e1e] hover:text-[#a65a4a]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#f4efe7] border-t border-[#a65a4a]/20 px-6 pb-5 pt-2">
          {links.map((l) => (
            <button
              key={l.page}
              onClick={() => nav(l.page)}
              className={`${inter()} block w-full text-left px-2 py-3 text-[15px] font-medium border-b border-[#a65a4a]/10 cursor-pointer ${page === l.page
                ? "text-[#a65a4a]"
                : "text-[#1e1e1e]"
                }`}
            >
              {l.label}
            </button>
          ))}

          <div className="pt-4 flex flex-col gap-2.5">
            <button
              onClick={() => nav("donate")}
              className={`w-full ${inter()} bg-[#a65a4a] text-[#f4efe7] text-[15px] font-medium px-7 py-3 rounded-full cursor-pointer hover:bg-[#993925] transition-colors`}
            >
              Donate Now
            </button>

            {!userSession ? (
              <button
                onClick={() => { setMenuOpen(false); openModal("login"); }}
                className={`${inter()} w-full border-2 border-[#a65a4a] text-[#a65a4a] text-[15px] font-medium px-6 py-3 rounded-full flex items-center justify-center gap-2 cursor-pointer hover:bg-[#a65a4a] hover:text-[#f4efe7] transition-colors`}
              >
                <LogIn size={16} />
                Login
              </button>
            ) : (
              <button
                onClick={() => nav("account")}
                className={`${inter()} w-full bg-[#a65a4a]/10 border-2 border-[#a65a4a] text-[#a65a4a] text-[15px] font-semibold px-6 py-3 rounded-full flex items-center justify-center gap-2 cursor-pointer`}
              >
                <User size={16} />
                {userSession.name} (My Account)
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
