"use client";

import * as React from "react";
import { fraunces, inter } from "../shared/styleHelpers";
import { Button } from "./Button";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title = "Something Big Is Cooking!",
  description = "No items available right now — check back soon.",
  icon,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 px-4 flex flex-col items-center justify-center ${className}`}>
      {icon && <div className="mb-4 text-[#a65a4a]/70">{icon}</div>}
      <p
        className={`${fraunces()} text-[#a65a4a] text-[24px] sm:text-[28px] font-semibold mb-2`}
        style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
      >
        {title}
      </p>
      {description && (
        <p className={`${inter()} text-[#1e1e1e]/60 text-[15px] max-w-md mx-auto`}>
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-6">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}
