"use client";

import * as React from "react";

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, className = "", id, rows = 3, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/60 uppercase tracking-wider block"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full border border-[#a65a4a]/30 rounded-lg px-3.5 py-2.5 text-[14px] text-[#1e1e1e] placeholder:text-[#1e1e1e]/40 focus:outline-none focus:border-[#a65a4a] focus:ring-1 focus:ring-[#a65a4a] font-['Inter',sans-serif] bg-white transition-colors resize-y disabled:opacity-50 disabled:bg-gray-50 ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""
          } ${className}`}
          {...props}
        />
        {error && <span className="font-['Inter',sans-serif] text-[12px] text-red-600">{error}</span>}
        {helperText && !error && (
          <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/50">{helperText}</span>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
