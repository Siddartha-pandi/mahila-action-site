"use client";

import * as React from "react";
import { inter } from "../shared/styleHelpers";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles = `${inter()} inline-flex items-center justify-center font-semibold rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#a65a4a]/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`;

    const variantStyles = {
      primary: "bg-[#a65a4a] text-[#f4efe7] hover:bg-[#993925]",
      secondary: "bg-[#f4efe7] text-[#a65a4a] hover:bg-white border border-[#a65a4a]/20",
      outline: "bg-transparent border border-[#a65a4a] text-[#a65a4a] hover:bg-[#a65a4a]/10",
      ghost: "bg-transparent text-[#1e1e1e]/80 hover:bg-[#1e1e1e]/5 hover:text-[#1e1e1e]",
      danger: "bg-red-600 text-white hover:bg-red-700",
    };

    const sizeStyles = {
      sm: "text-[13px] px-3.5 py-1.5 gap-1.5",
      md: "text-[14px] px-5 py-2.5 gap-2",
      lg: "text-[16px] px-8 py-3.5 gap-2.5",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin size-4 shrink-0 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
