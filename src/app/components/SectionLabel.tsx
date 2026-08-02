"use client";

import { inter, fraunces } from "./shared/styleHelpers";

export function SectionLabel({ text }: { text: string }) {
  return (
    <p
      className={`${inter()} text-[14px] text-[#1e1e1e]/60 tracking-wider uppercase`}
    >
      {text}
    </p>
  );
}

export function SectionTitle({
  text,
  center = false,
}: {
  text: string;
  center?: boolean;
}) {
  return (
    <h2
      className={`${fraunces()} text-[26px] sm:text-[36px] md:text-[52px] text-[#1e1e1e] leading-tight capitalize ${center ? "text-center" : ""}`}
      style={{ fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
    >
      {text}
    </h2>
  );
}
