"use client";

import { fraunces } from "./shared/styleHelpers";

export function PageBanner({
  img,
  title,
}: {
  img: string;
  title: string;
}) {
  return (
    <div className="relative h-[220px] sm:h-[340px] md:h-[520px] overflow-hidden">
      <img loading="eager" fetchPriority="high" decoding="async"
        src={img}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-black/45" />
      <div className="relative h-full flex items-center justify-center">
        <h1
          className={`${fraunces()} text-[#f4efe7] text-[32px] sm:text-[52px] md:text-[96px] font-normal text-center leading-none`}
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
