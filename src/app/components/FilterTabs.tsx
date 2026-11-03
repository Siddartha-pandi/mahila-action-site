"use client";

import * as React from "react";
import { inter } from "./shared/styleHelpers";

export interface TabOption {
  id: string;
  name: string;
  count?: number;
}

export interface FilterTabsProps {
  options: TabOption[];
  activeId: string;
  onChange: (id: string) => void;
  showAllOption?: boolean;
  allLabel?: string;
  className?: string;
}

export function FilterTabs({
  options,
  activeId,
  onChange,
  showAllOption = true,
  allLabel = "All",
  className = "",
}: FilterTabsProps) {
  const pillStyle = (isActive: boolean) =>
    `${inter()} text-[13px] sm:text-[15px] md:text-[16px] font-semibold px-4 sm:px-6 py-2 sm:py-2.5 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0 ${
      isActive
        ? "bg-[#a65a4a] text-[#f4efe7] shadow-sm"
        : "bg-[#f4efe7] border border-[#a65a4a]/40 text-[#a65a4a] hover:bg-[#a65a4a]/10"
    }`;

  return (
    <div className={`flex flex-wrap gap-2 sm:gap-3 justify-center items-center px-1 ${className}`}>
      {showAllOption && (
        <button
          type="button"
          onClick={() => onChange("All")}
          className={pillStyle(activeId === "All")}
        >
          {allLabel}
        </button>
      )}
      {options.map((opt, index) => (
        <button
          key={`${opt.id}_${index}`}
          type="button"
          onClick={() => onChange(opt.id)}
          className={pillStyle(activeId === opt.id)}
        >
          {opt.name}
          {opt.count !== undefined && (
            <span className="ml-1.5 opacity-75 text-[13px]">({opt.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
