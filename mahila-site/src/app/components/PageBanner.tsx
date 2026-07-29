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
        img ? "h-[220px] sm:h-[340px] md:h-[520px]" : "py-12 sm:py-16 md:py-20"
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
      <div className="relative z-10 flex items-center justify-center px-4">
        <h1
          className={`${fraunces()} text-[#f4efe7] text-[36px] sm:text-[56px] md:text-[80px] font-normal text-center leading-none`}
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
