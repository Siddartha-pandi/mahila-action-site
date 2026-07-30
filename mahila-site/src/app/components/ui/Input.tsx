"use client";

import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = "", id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/60 uppercase tracking-wider block"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && <div className="absolute left-3 text-[#1e1e1e]/40 shrink-0">{leftIcon}</div>}
          <input
            ref={ref}
            id={inputId}
            className={`w-full border border-[#a65a4a]/30 rounded-lg px-3.5 py-2.5 text-[14px] text-[#1e1e1e] placeholder:text-[#1e1e1e]/40 focus:outline-none focus:border-[#a65a4a] focus:ring-1 focus:ring-[#a65a4a] font-['Inter',sans-serif] bg-white transition-colors disabled:opacity-50 disabled:bg-gray-50 ${
              leftIcon ? "pl-10" : ""
            } ${rightIcon ? "pr-10" : ""} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""} ${className}`}
            {...props}
          />
          {rightIcon && <div className="absolute right-3 text-[#1e1e1e]/40 shrink-0">{rightIcon}</div>}
        </div>
        {error && <span className="font-['Inter',sans-serif] text-[12px] text-red-600">{error}</span>}
        {helperText && !error && (
          <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/50">{helperText}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
