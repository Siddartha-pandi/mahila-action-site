"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  compact?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 25, 50, 100],
  compact = false,
  className = "",
}: PaginationProps) {
  if (totalItems === 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page range with ellipsis logic
  const getPageNumbers = () => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    pages.push(1);

    if (safeCurrentPage > 3) {
      pages.push("...");
    }

    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(safeTotalPages - 1, safeCurrentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (safeCurrentPage < safeTotalPages - 2) {
      pages.push("...");
    }

    pages.push(safeTotalPages);
    return pages;
  };

  if (compact) {
    return (
      <div className={`flex items-center justify-between gap-2 pt-2 pb-1 px-1 border-t border-[#a65a4a]/15 text-[12px] font-['Inter',sans-serif] ${className}`}>
        <span className="text-[#1e1e1e]/60 font-medium truncate">
          {startItem}-{endItem} of {totalItems}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className="p-1 rounded-md border border-[#a65a4a]/20 text-[#1e1e1e]/70 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-1.5 py-0.5 text-[11px] font-semibold text-[#1e1e1e]/80">
            {safeCurrentPage}/{safeTotalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= safeTotalPages}
            className="p-1 rounded-md border border-[#a65a4a]/20 text-[#1e1e1e]/70 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#a65a4a]/15 text-[13px] font-['Inter',sans-serif] text-[#1e1e1e] ${className}`}
    >
      {/* Left side: Range info and page size selector */}
      <div className="flex flex-wrap items-center gap-3 text-[#1e1e1e]/70">
        <span>
          Showing <strong className="font-semibold text-[#1e1e1e]">{startItem}</strong> to{" "}
          <strong className="font-semibold text-[#1e1e1e]">{endItem}</strong> of{" "}
          <strong className="font-semibold text-[#1e1e1e]">{totalItems}</strong> results
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-[#a65a4a]/20 pl-3">
            <span className="text-[12px] text-[#1e1e1e]/60">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-[#a65a4a]/30 text-[#1e1e1e] text-[12px] rounded-md px-2 py-1 focus:outline-none focus:border-[#a65a4a] cursor-pointer font-medium"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right side: Page navigation buttons */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1}
          className="p-1.5 rounded-lg border border-[#a65a4a]/20 text-[#1e1e1e]/70 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="First Page"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="p-1.5 rounded-lg border border-[#a65a4a]/20 text-[#1e1e1e]/70 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a] disabled:opacity-30 disabled:pointer-events-none transition-colors mr-1"
          title="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Numbers */}
        {getPageNumbers().map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 py-1 text-[#1e1e1e]/40 font-semibold select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p as number)}
              className={`min-w-[32px] h-[32px] px-2 rounded-lg font-medium text-[13px] transition-colors cursor-pointer ${
                safeCurrentPage === p
                  ? "bg-[#a65a4a] text-white shadow-sm font-semibold"
                  : "bg-white border border-[#a65a4a]/20 text-[#1e1e1e]/80 hover:border-[#a65a4a] hover:text-[#a65a4a]"
              }`}
            >
              {p}
            </button>
          )
        )}

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= safeTotalPages}
          className="p-1.5 rounded-lg border border-[#a65a4a]/20 text-[#1e1e1e]/70 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a] disabled:opacity-30 disabled:pointer-events-none transition-colors ml-1"
          title="Next Page"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={safeCurrentPage >= safeTotalPages}
          className="p-1.5 rounded-lg border border-[#a65a4a]/20 text-[#1e1e1e]/70 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          title="Last Page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
}
