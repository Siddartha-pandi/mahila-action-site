"use client";

import * as React from "react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, children, className = "", id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/60 uppercase tracking-wider block"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full border border-[#a65a4a]/30 rounded-lg px-3.5 py-2.5 text-[14px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a] focus:ring-1 focus:ring-[#a65a4a] font-['Inter',sans-serif] bg-white transition-colors cursor-pointer disabled:opacity-50 ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
          } ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <span className="font-['Inter',sans-serif] text-[12px] text-red-600">{error}</span>}
        {helperText && !error && (
          <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/50">{helperText}</span>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
