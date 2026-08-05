"use client";

import React from "react";
import { Search, X, Filter, RotateCcw } from "lucide-react";

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  displayValue?: string;
}

export interface TableFilterProps {
  search: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  activeFilters?: ActiveFilter[];
  onRemoveFilter?: (key: string) => void;
  onResetFilters?: () => void;
  resultCount?: number;
  className?: string;
}

export function TableFilter({
  search,
  onSearchChange,
  searchPlaceholder = "Search records…",
  filters,
  activeFilters = [],
  onRemoveFilter,
  onResetFilters,
  resultCount,
  className = "",
}: TableFilterProps) {
  const hasActiveFilters = search.trim().length > 0 || activeFilters.length > 0;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1e1e1e]/40 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-white border border-[#a65a4a]/25 rounded-xl pl-9 pr-8 py-2 text-[13px] text-[#1e1e1e] placeholder-[#1e1e1e]/40 focus:outline-none focus:border-[#a65a4a] focus:ring-2 focus:ring-[#a65a4a]/10 font-['Inter',sans-serif] transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#1e1e1e]/40 hover:text-[#a65a4a] rounded-full hover:bg-black/5 cursor-pointer transition-colors"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Custom Filter Controls Dropdowns */}
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      </div>

      {/* Active Filter Chips / Reset */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1 font-['Inter',sans-serif]">
          <span className="text-[11px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider flex items-center gap-1">
            <Filter size={11} /> Filters:
          </span>

          {search.trim() && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] bg-[#a65a4a]/10 text-[#a65a4a] border border-[#a65a4a]/20 font-medium">
              Search: "{search}"
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="hover:bg-[#a65a4a]/20 rounded-full p-0.5 cursor-pointer"
              >
                <X size={11} />
              </button>
            </span>
          )}

          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] bg-[#a65a4a]/10 text-[#a65a4a] border border-[#a65a4a]/20 font-medium"
            >
              {f.label}: <strong className="font-semibold">{f.displayValue || f.value}</strong>
              {onRemoveFilter && (
                <button
                  type="button"
                  onClick={() => onRemoveFilter(f.key)}
                  className="hover:bg-[#a65a4a]/20 rounded-full p-0.5 cursor-pointer"
                >
                  <X size={11} />
                </button>
              )}
            </span>
          ))}

          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] text-red-600 hover:bg-red-50 font-medium cursor-pointer transition-colors ml-auto"
            >
              <RotateCcw size={12} /> Clear all
            </button>
          )}

          {resultCount !== undefined && (
            <span className="text-[12px] text-[#1e1e1e]/50 font-medium ml-auto">
              {resultCount} match{resultCount !== 1 ? "es" : ""} found
            </span>
          )}
        </div>
      )}
    </div>
  );
}
