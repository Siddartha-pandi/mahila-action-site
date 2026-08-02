"use client";

import * as React from "react";
import { useEffect } from "react";
import { X } from "lucide-react";
import { fraunces } from "../shared/styleHelpers";

export interface ModalShellProps {
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  children: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
}

export function ModalShell({
  isOpen = true,
  onClose,
  title,
  subtitle,
  maxWidth = "xl",
  children,
  showCloseButton = true,
  className = "",
}: ModalShellProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} max-h-[90vh] bg-[#f4efe7] border border-[#a65a4a]/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${className}`}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 pb-4 border-b border-[#a65a4a]/15 shrink-0">
            <div>
              {title && (
                <h3
                  className={`${fraunces()} text-[24px] sm:text-[28px] text-[#1e1e1e] font-semibold leading-tight`}
                  style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/60 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 rounded-full text-[#1e1e1e]/60 hover:text-[#1e1e1e] hover:bg-[#a65a4a]/10 transition-colors cursor-pointer ml-auto shrink-0"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
