"use client";

import * as React from "react";
import { inter } from "./shared/styleHelpers";
import { SafeImage } from "./SafeImage";

export interface StoryCardProps {
  id?: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  fallbackImage?: string;
  onClick: () => void;
  ctaText?: string;
  className?: string;
}

export function StoryCard({
  title,
  excerpt,
  coverImage,
  onClick,
  ctaText = "Read Story →",
  className = "",
}: StoryCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl overflow-hidden group cursor-pointer h-full flex flex-col transition-shadow hover:shadow-lg ${className}`}
    >
      <div className="h-[220px] shrink-0 overflow-hidden rounded-t-2xl bg-[#a35848]/20 relative">
        <SafeImage
          src={coverImage}
          alt={title}
          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
          containerClassName="size-full flex flex-col items-center justify-center bg-[#a35848]/20 text-[#f4efe7]/80 gap-2 select-none"
          errorText="Image not available"
          iconSize={32}
        />
      </div>
      <div className="bg-[#a35848] p-6 rounded-b-2xl flex flex-col flex-1">
        <p className={`${inter()} text-[#f4efe7] text-[22px] font-semibold capitalize line-clamp-2`}>
          {title}
        </p>
        {excerpt && (
          <p className={`${inter()} text-[#f4efe7]/85 text-[17px] leading-relaxed mt-3 line-clamp-3`}>
            {excerpt}
          </p>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={`${inter()} text-[#f4efe7] text-[14px] font-semibold mt-auto pt-4 opacity-85 group-hover:opacity-100 transition-opacity cursor-pointer text-left`}
        >
          {ctaText}
        </button>
      </div>
    </div>
  );
}
