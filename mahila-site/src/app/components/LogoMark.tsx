"use client";

import { imgLogo } from "../constants/images";
import { fraunces } from "./shared/styleHelpers";

export function LogoMark({ invert = false }: { invert?: boolean }) {
  const textColor = invert
    ? "text-[#f4efe7]"
    : "text-[#1e1e1e]";
  return (
    <div className="flex gap-3 items-center">
      <div className="relative size-12 rounded-md overflow-hidden shrink-0">
        <img loading="eager" decoding="async"
          src={imgLogo}
          alt="Mahila Action logo"
          className="absolute w-[220%] h-[210%] max-w-none left-[-57%] top-[-53%] object-cover"
          style={invert ? { filter: "brightness(0) invert(1) sepia(8%) saturate(0.6)" } : undefined}
        />
      </div>
      <div
        className={`${fraunces()} ${textColor} text-[22px] leading-tight`}
        style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
      >
        <div>Mahila</div>
        <div>Action</div>
      </div>
    </div>
  );
}
