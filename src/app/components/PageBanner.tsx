"use client";

import { fraunces } from "./shared/styleHelpers";

export function PageBanner({
  img,
  title,
}: {
  img?: string;
  title: string;
}) {
  return (
    <div
      className={`relative ${
        img ? "h-[190px] sm:h-[320px] md:h-[480px]" : "py-10 sm:py-16 md:py-20"
      } bg-[#a65a4a] overflow-hidden flex items-center justify-center`}
    >
      {img && (
        <>
          <img
            loading="eager"
            fetchPriority="high"
            decoding="async"
            src={img}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      )}
      <div className="relative z-10 flex items-center justify-center px-4 w-full">
        <h1
          className={`${fraunces()} text-[#f4efe7] text-[28px] xs:text-[34px] sm:text-[54px] md:text-[76px] font-normal text-center leading-tight whitespace-pre-line max-w-[960px]`}
          style={{
            fontVariationSettings: '"SOFT" 0, "WONK" 1',
          }}
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
