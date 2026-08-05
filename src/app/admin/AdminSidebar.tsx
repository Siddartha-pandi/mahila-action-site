"use client";

import React, { useState } from "react";
import { LucideIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_sidebar_collapsed") === "true";
    }
    return false;
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  return (
    <>
      {/* Desktop Sidebar Nav */}
      <nav
        className={`${
          collapsed ? "w-[68px]" : "w-[240px]"
        } shrink-0 bg-white border-r border-[#a65a4a]/15 py-3 hidden md:flex flex-col h-full min-h-0 overflow-y-auto font-['Inter',sans-serif] transition-all duration-300 relative select-none`}
      >
        {/* Sidebar Header & Minimize Toggle */}
        <div className={`px-3 pb-3 flex items-center ${collapsed ? "justify-center" : "justify-between"} border-b border-[#a65a4a]/10 mb-2`}>
          {!collapsed && (
            <p className="px-2 text-[10px] font-bold text-[#1e1e1e]/40 uppercase tracking-wider truncate">
              Manage Content &amp; Access
            </p>
          )}
          <button
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-lg text-[#1e1e1e]/60 hover:text-[#a65a4a] hover:bg-[#a65a4a]/10 transition-colors cursor-pointer shrink-0"
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {/* Nav Links */}
        <div className="flex-1 flex flex-col gap-1 px-2">
          {visibleTabs.map((t) => {
            const IconComp = t.icon;
            const isActive = activeSection === t.id;
            return (
              <div key={t.id} className="relative group">
                <button
                  onClick={() => onSelectSection(t.id)}
                  className={`w-full flex items-center ${
                    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                  } text-[13px] font-medium transition-all rounded-xl cursor-pointer ${
                    isActive
                      ? "bg-[#a65a4a]/10 text-[#a65a4a] font-semibold"
                      : "text-[#1e1e1e]/70 hover:text-[#a65a4a] hover:bg-[#a65a4a]/5"
                  }`}
                >
                  <div className="relative flex items-center justify-center shrink-0">
                    <IconComp className={`w-4 h-4 ${isActive ? "text-[#a65a4a]" : "text-[#1e1e1e]/55"}`} />
                    {collapsed && t.id === "trash" && trashCount > 0 && (
                      <span className="absolute -top-1 -right-1 size-2 rounded-full bg-rose-600 ring-2 ring-white" />
                    )}
                  </div>

                  {!collapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{t.label}</span>
                      {t.id === "trash" && trashCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          {trashCount}
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* Floating Tooltip when Collapsed */}
                {collapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-2.5 py-1 bg-gray-900 text-white text-[12px] font-medium rounded-md shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    {t.label} {t.id === "trash" && trashCount > 0 ? `(${trashCount})` : ""}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
