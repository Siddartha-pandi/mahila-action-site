"use client";

import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger" | "outline";
  size?: "sm" | "md";
  children: React.ReactNode;
}

export function Badge({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: BadgeProps) {
  const variantStyles = {
    primary: "bg-[#a65a4a] text-[#f4efe7]",
    secondary: "bg-[#a65a4a]/15 text-[#a65a4a]",
    success: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    warning: "bg-amber-100 text-amber-800 border border-amber-300",
    danger: "bg-red-100 text-red-800 border border-red-300",
    outline: "border border-[#a65a4a]/40 text-[#a65a4a]",
  };

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 font-medium rounded-md",
    md: "text-[12px] px-3 py-1 font-semibold rounded-full",
  };

  return (
    <span
      className={`inline-flex items-center tracking-wide uppercase font-['Inter',sans-serif] ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
