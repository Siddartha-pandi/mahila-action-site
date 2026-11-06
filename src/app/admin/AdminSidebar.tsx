"use client";

import React, { useState, useEffect } from "react";
import {
  LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

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

interface NavGroupDef {
  key: string;
  title?: string;
  tabIds: string[];
  hideHeader?: boolean;
}

const NAV_GROUPS: NavGroupDef[] = [
  {
    key: "workspace",
    tabIds: ["adminCenter"],
    hideHeader: true,
  },
  {
    key: "operations",
    title: "OPERATIONS",
    tabIds: ["submissions", "donations", "events", "councilors"],
  },
  {
    key: "content_management",
    title: "CONTENT MANAGEMENT",
    tabIds: ["stories", "impactStories", "categories", "eventsBlog"],
  },
  {
    key: "system",
    title: "SYSTEM",
    tabIds: ["timeline", "contact", "trash", "roles", "contentTypeBuilder"],
  },
];

export function AdminSidebar({
  visibleTabs,
  activeSection,
  onSelectSection,
  trashCount,
}: AdminSidebarProps) {
  // Sidebar expanded / collapsed state (persisted)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("admin_sidebar_collapsed") === "true";
    }
    return false;
  });

  // Section groups collapsible state (expanded by default)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("admin_sidebar_collapsed_groups");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Mobile drawer open state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Close mobile drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileDrawerOpen]);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen]);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupKey]: !prev[groupKey] };
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_sidebar_collapsed_groups", JSON.stringify(next));
      }
      return next;
    });
  };

  // Build grouped tab items
  const tabMap = new Map<string, TabItem>();
  visibleTabs.forEach((tab) => tabMap.set(tab.id, tab));

  // Determine active item for mobile trigger display
  const currentActiveTab = visibleTabs.find((t) => t.id === activeSection);
  const ActiveIcon = currentActiveTab?.icon || LayoutDashboard;

  // Track tabs claimed by defined groups
  const claimedTabIds = new Set<string>();
  const renderedGroups = NAV_GROUPS.map((group) => {
    const items: TabItem[] = [];
    group.tabIds.forEach((id) => {
      const item = tabMap.get(id);
      if (item) {
        items.push(item);
        claimedTabIds.add(id);
      }
    });
    return {
      ...group,
      items,
    };
  }).filter((g) => g.items.length > 0);

  // Any visible tabs not explicitly listed in NAV_GROUPS are appended to SYSTEM
  const remainingTabs = visibleTabs.filter((t) => !claimedTabIds.has(t.id));
  if (remainingTabs.length > 0) {
    const systemGroup = renderedGroups.find((g) => g.key === "system");
    if (systemGroup) {
      systemGroup.items.push(...remainingTabs);
    } else {
      renderedGroups.push({
        key: "system",
        title: "SYSTEM",
        tabIds: remainingTabs.map((t) => t.id),
        items: remainingTabs,
      });
    }
  }

  return (
    <>
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR                                         */}
      {/* ======================================================== */}
      <aside
        className={`${
          collapsed ? "w-[72px]" : "w-[270px]"
        } shrink-0 bg-white border-r border-gray-200 hidden md:flex flex-col h-full min-h-0 font-['Inter',sans-serif] transition-all duration-300 relative select-none z-10`}
      >
        {/* Header / Collapse Toggle */}
        <div
          className={`h-[50px] px-3.5 flex items-center ${
            collapsed ? "justify-center" : "justify-between"
          } border-b border-gray-100 shrink-0`}
        >
          {!collapsed && (
            <div className="flex items-center gap-1 overflow-hidden">
              <span className="font-['Fraunces',serif] align-items-center text-[19px] font-bold text-[#1e1e1e] tracking-tight truncate" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                Mahila Action
              </span>
            </div>
          )}

          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg text-stone-500 hover:text-[#A84E3D] hover:bg-[#F6ECE9] transition-colors cursor-pointer shrink-0"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent
                side="right"
                sideOffset={12}
                className="bg-stone-900 text-white font-medium text-[12px] px-2.5 py-1 rounded-lg shadow-lg border-0 z-50"
              >
                Expand sidebar
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Scrollable Navigation Area */}
        <TooltipProvider delayDuration={50}>
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2.5 scrollbar-thin scrollbar-thumb-gray-200">
            {renderedGroups.map((group, groupIdx) => {
              const isGroupCollapsed = !collapsed && !!collapsedGroups[group.key];

              return (
                <div key={group.key} className="space-y-0.5">
                  {/* Group Label / Accordion Header */}
                  {!collapsed && group.title ? (
                    <div
                      onClick={() => toggleGroupCollapse(group.key)}
                      className="flex items-center justify-between px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider text-stone-400 hover:text-stone-600 transition-colors cursor-pointer group select-none"
                      title={`Click to ${isGroupCollapsed ? "expand" : "collapse"} ${group.title}`}
                    >
                      <span>{group.title}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-stone-400 group-hover:text-stone-600 transition-transform duration-200 ${
                          isGroupCollapsed ? "-rotate-90" : "rotate-0"
                        }`}
                      />
                    </div>
                  ) : (
                    // Thin divider between groups when collapsed
                    collapsed && groupIdx > 0 && <div className="border-t border-gray-100 my-1.5 mx-2" />
                  )}

                  {/* Group Items */}
                  {(!isGroupCollapsed || collapsed) && (
                    <div className="space-y-0.5">
                      {group.items.map((tab) => {
                        const IconComp = tab.icon;
                        const isActive = activeSection === tab.id;
                        const isTrash = tab.id === "trash";

                        return (
                          <Tooltip key={tab.id} delayDuration={50}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onSelectSection(tab.id)}
                                className={`relative w-full h-[38px] min-h-[38px] flex items-center ${
                                  collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
                                } rounded-lg text-[14px] font-medium transition-all cursor-pointer ${
                                  isActive
                                    ? "bg-[#F6ECE9] text-[#A84E3D] font-semibold"
                                    : "text-stone-600 hover:text-[#A84E3D] hover:bg-[#F6ECE9]/45"
                                }`}
                              >
                                {/* Small Left Accent Indicator on Active */}
                                {isActive && (
                                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-[#A84E3D]" />
                                )}

                                {/* Icon */}
                                <div className="relative flex items-center justify-center shrink-0">
                                  <IconComp
                                    className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                                      isActive
                                        ? "text-[#A84E3D]"
                                        : "text-stone-400 group-hover:text-[#A84E3D]"
                                    }`}
                                  />

                                  {/* Notification dot when collapsed */}
                                  {collapsed && isTrash && trashCount > 0 && (
                                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[#A84E3D] ring-2 ring-white" />
                                  )}
                                </div>

                                {/* Label & Badges (Expanded View) */}
                                {!collapsed && (
                                  <>
                                    <span className="truncate flex-1 text-left text-[14px]">
                                      {tab.label}
                                    </span>
                                    {isTrash && trashCount > 0 && (
                                      <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#A84E3D]/10 text-[#A84E3D] border border-[#A84E3D]/20">
                                        {trashCount}
                                      </span>
                                    )}
                                  </>
                                )}
                              </button>
                            </TooltipTrigger>

                            {/* Tooltip on hover when collapsed */}
                            {collapsed && (
                              <TooltipContent
                                side="right"
                                sideOffset={12}
                                className="bg-stone-900 text-white font-medium text-[12px] px-2.5 py-1 rounded-lg shadow-lg flex items-center gap-2 z-50 border-0"
                              >
                                <span>{tab.label}</span>
                                {isTrash && trashCount > 0 && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#A84E3D] text-white">
                                    {trashCount}
                                  </span>
                                )}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </aside>

      {/* ======================================================== */}
      {/* MOBILE RESPONSIVE NAVIGATION BAR                         */}
      {/* ======================================================== */}
      <div className="md:hidden w-full px-3.5 py-2.5 bg-white border-b border-gray-200 shrink-0 font-['Inter',sans-serif] flex items-center justify-between z-20">
        {/* Active Section Indicator Pill */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F6ECE9] text-[#A84E3D] text-[14px] font-medium cursor-pointer transition-colors hover:bg-[#F6ECE9]/80 truncate max-w-[70%]"
        >
          <ActiveIcon className="w-4 h-4 text-[#A84E3D] shrink-0" />
          <span className="font-semibold truncate">
            {currentActiveTab?.label || "Navigation"}
          </span>
          {activeSection === "trash" && trashCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#A84E3D] text-white">
              {trashCount}
            </span>
          )}
        </button>

        {/* Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-stone-700 hover:text-[#A84E3D] bg-stone-50 hover:bg-[#F6ECE9]/50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
        >
          <Menu className="w-4 h-4 text-[#A84E3D]" />
          <span>Menu</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* MOBILE SLIDE-OUT DRAWER                                  */}
      {/* ======================================================== */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-[280px] max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-out font-['Inter',sans-serif]">
            {/* Drawer Header */}
            <div className="h-[50px] px-3.5 flex items-center justify-between border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-['Fraunces',serif] text-[16px] font-bold text-[#1e1e1e] tracking-tight" style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}>
                Mahila Action
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-[#F6ECE9] text-[#A84E3D]">
                  Navigation
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                aria-label="Close navigation drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2.5">
              {renderedGroups.map((group) => (
                <div key={group.key} className="space-y-0.5">
                  {group.title && (
                    <p className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      {group.title}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map((tab) => {
                      const IconComp = tab.icon;
                      const isActive = activeSection === tab.id;
                      const isTrash = tab.id === "trash";

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            onSelectSection(tab.id);
                            setMobileDrawerOpen(false);
                          }}
                          className={`relative w-full h-[38px] min-h-[38px] flex items-center gap-2.5 px-2.5 rounded-lg text-[14px] font-medium transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#F6ECE9] text-[#A84E3D] font-semibold"
                              : "text-stone-600 hover:text-[#A84E3D] hover:bg-[#F6ECE9]/45"
                          }`}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-[#A84E3D]" />
                          )}
                          <IconComp
                            className={`w-[18px] h-[18px] shrink-0 ${
                              isActive ? "text-[#A84E3D]" : "text-stone-400"
                            }`}
                          />
                          <span className="truncate flex-1 text-left">
                            {tab.label}
                          </span>
                          {isTrash && trashCount > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#A84E3D]/10 text-[#A84E3D] border border-[#A84E3D]/20">
                              {trashCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-gray-100 bg-stone-50/50 shrink-0">
              <p className="text-[11px] text-stone-400 text-center">
                Select a section to navigate
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
