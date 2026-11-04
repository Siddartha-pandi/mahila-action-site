"use client";

import * as React from "react";
import { User } from "lucide-react";
import { inter, fraunces } from "./shared/styleHelpers";
import { SafeImage } from "./SafeImage";

export interface CouncilorCardProps {
  name: string;
  role: string;
  story: string;
  img?: string;
  className?: string;
}

function getInitials(name: string) {
  return (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function CouncilorCard({ name, role, story, img, className = "" }: CouncilorCardProps) {
  const initials = getInitials(name);

  return (
    <div
      className={`bg-[#f4efe7] border-2 border-[#a65a4a] rounded-2xl p-5 sm:p-8 flex flex-col items-center text-center gap-4 sm:gap-5 transition-transform hover:-translate-y-1 ${className}`}
    >
      <div className="relative size-[140px] sm:size-[170px] md:size-[180px] rounded-full overflow-hidden border-4 border-[#a65a4a] shrink-0 bg-[#a65a4a]/10 shadow-sm">
        {img ? (
          <SafeImage
            src={img}
            alt={name}
            className="absolute inset-0 size-full object-cover"
            fallbackContainer={
              <div className="size-full flex items-center justify-center bg-[#a65a4a]/15 text-[#a65a4a] select-none">
                {initials ? (
                  <span className={`${fraunces()} font-bold text-3xl sm:text-4xl tracking-wider`}>{initials}</span>
                ) : (
                  <User size={40} />
                )}
              </div>
            }
          />
        ) : (
          <div className="size-full flex items-center justify-center bg-[#a65a4a]/15 text-[#a65a4a] select-none">
            {initials ? (
              <span className={`${fraunces()} font-bold text-3xl sm:text-4xl tracking-wider`}>{initials}</span>
            ) : (
              <User size={40} />
            )}
          </div>
        )}
      </div>
      <div>
        <p className={`${inter()} text-[#a65a4a] text-[13px] sm:text-[14px] italic font-medium`}>{role}</p>
        <p className={`${inter()} text-[#a65a4a] text-[19px] sm:text-[22px] font-semibold mt-1`}>{name}</p>
      </div>
      <p className={`${inter()} text-[#a65a4a]/80 text-[15px] sm:text-[17px] leading-relaxed`}>{story}</p>
    </div>
  );
}
