"use client";

import * as React from "react";
import { BookOpen, Images } from "lucide-react";
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
  galleryCount?: number;
}

export function StoryCard({
  title,
  excerpt,
  coverImage,
  fallbackImage,
  onClick,
  ctaText = "Read Story →",
  className = "",
  galleryCount,
}: StoryCardProps) {
  const imgSrc = coverImage || fallbackImage;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl overflow-hidden group cursor-pointer h-full flex flex-col transition-shadow hover:shadow-lg ${className}`}
    >
      <div className="h-[180px] sm:h-[220px] shrink-0 overflow-hidden rounded-t-2xl bg-[#a35848]/20 relative">
        {imgSrc ? (
          <SafeImage
            src={imgSrc}
            fallbackSrc={fallbackImage}
            alt={title}
            className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
            fallbackContainer={
              <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-[#8a4233] to-[#5a2a20] text-[#f4efe7]/80 gap-2 select-none">
                <BookOpen size={32} className="opacity-75" />
              </div>
            }
          />
        ) : (
          <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-[#8a4233] to-[#5a2a20] text-[#f4efe7]/80 gap-2 select-none">
            <BookOpen size={32} className="opacity-75" />
          </div>
        )}

        {typeof galleryCount === "number" && galleryCount > 0 && (
          <div className="absolute top-3 right-3 bg-black/65 backdrop-blur-md text-white text-[11px] sm:text-[12px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md border border-white/20 pointer-events-none select-none z-10">
            <Images size={13} className="text-[#f4efe7]" />
            <span>
              {galleryCount} {galleryCount === 1 ? "Photo" : "Photos"}
            </span>
          </div>
        )}
      </div>

      <div className="bg-[#a35848] p-5 sm:p-6 rounded-b-2xl flex flex-col flex-1">
        <p className={`${inter()} text-[#f4efe7] text-[19px] sm:text-[22px] font-semibold capitalize line-clamp-2`}>
          {title}
        </p>
        {excerpt && (
          <p className={`${inter()} text-[#f4efe7]/85 text-[15px] sm:text-[17px] leading-relaxed mt-2.5 sm:mt-3 line-clamp-3`}>
            {excerpt}
          </p>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={`${inter()} text-[#f4efe7] text-[13px] sm:text-[14px] font-semibold mt-auto pt-4 opacity-85 group-hover:opacity-100 transition-opacity cursor-pointer text-left`}
        >
          {ctaText}
        </button>
      </div>
    </div>
  );
}
