"use client";

import * as React from "react";

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  color = "text-[#a65a4a]",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "size-4 border-2",
    md: "size-8 border-3",
    lg: "size-12 border-4",
  };

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div
        className={`animate-spin rounded-full border-solid border-t-transparent ${color} ${sizeClasses[size]}`}
        style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
