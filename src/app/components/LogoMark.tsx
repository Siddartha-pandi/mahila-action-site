"use client";

import { imgLogo } from "../constants/images";
import { fraunces } from "./shared/styleHelpers";

export function LogoMark({ invert = false }: { invert?: boolean }) {
  const textColor = invert
    ? "text-[#f4efe7]"
    : "text-[#1e1e1e]";
  return (
    <div className="flex gap-1.5 sm:gap-2.5 md:gap-3 items-center shrink-0">
      <div className="relative size-8 sm:size-10 md:size-12 rounded-md overflow-hidden shrink-0">
        <img loading="eager" decoding="async"
          src={imgLogo}
          alt="Mahila Action logo"
          className="absolute w-[220%] h-[210%] max-w-none left-[-57%] top-[-53%] object-cover"
          style={invert ? { filter: "brightness(0) invert(1) sepia(8%) saturate(0.6)" } : undefined}
        />
      </div>
      <div
        className={`${fraunces()} ${textColor} text-[15px] sm:text-[19px] md:text-[22px] leading-tight font-semibold`}
        style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
      >
        <div>Mahila</div>
        <div>Action</div>
      </div>
    </div>
  );
}
