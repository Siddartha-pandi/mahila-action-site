"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  isSuperAdminOnly?: boolean;
}

interface AdminSidebarProps {
  visibleTabs: readonly TabItem[];
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  trashCount: number;
}

export function AdminSidebar({
  visibleTabs,
  activeSection,
  onSelectSection,
  trashCount,
}: AdminSidebarProps) {
  return (
    <>
      {/* Desktop Sidebar Nav */}
      <nav className="w-[250px] shrink-0 bg-white border-r border-[#a65a4a]/15 py-4 hidden md:block h-full min-h-0 overflow-y-auto font-['Inter',sans-serif]">
        <p className="px-5 pb-3 text-[10px] font-bold text-[#1e1e1e]/40 uppercase tracking-wider">
          Manage Content &amp; Access
        </p>
        {visibleTabs.map((t) => {
          const IconComp = t.icon;
          const isActive = activeSection === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectSection(t.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-[13px] font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-[#a65a4a]/10 text-[#a65a4a] border-r-3 border-[#a65a4a] font-semibold"
                  : "text-[#1e1e1e]/70 hover:text-[#a65a4a] hover:bg-[#a65a4a]/5"
              }`}
            >
              <IconComp className={`w-4 h-4 shrink-0 ${isActive ? "text-[#a65a4a]" : "text-[#1e1e1e]/45"}`} />
              <span className="truncate flex-1 text-left">{t.label}</span>
              {t.id === "trash" && trashCount > 0 && (
                <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  {trashCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile Dropdown Nav */}
      <div className="md:hidden w-full px-4 pt-4 font-['Inter',sans-serif]">
        <select
          value={activeSection}
          onChange={(e) => onSelectSection(e.target.value)}
          className="w-full border border-[#a65a4a]/30 rounded-lg px-3 py-2 text-[14px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a] bg-white mb-4"
        >
          {visibleTabs.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} {t.id === "trash" && trashCount > 0 ? `(${trashCount})` : ""}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
