"use client";

import * as React from "react";
import { inter } from "./shared/styleHelpers";

export interface CouncilorCardProps {
  name: string;
  role: string;
  story: string;
  img: string;
  className?: string;
}

export function CouncilorCard({ name, role, story, img, className = "" }: CouncilorCardProps) {
  return (
    <div
      className={`bg-[#f4efe7] border-2 border-[#a65a4a] rounded-2xl p-8 flex flex-col items-center text-center gap-5 transition-transform hover:-translate-y-1 ${className}`}
    >
      <div className="relative size-[180px] rounded-full overflow-hidden border-4 border-[#a65a4a] shrink-0">
        <img
          loading="lazy"
          decoding="async"
          src={img}
          alt={name}
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <div>
        <p className={`${inter()} text-[#a65a4a] text-[14px] italic font-medium`}>{role}</p>
        <p className={`${inter()} text-[#a65a4a] text-[22px] font-semibold mt-1`}>{name}</p>
      </div>
      <p className={`${inter()} text-[#a65a4a]/80 text-[17px] leading-relaxed`}>{story}</p>
    </div>
  );
}
