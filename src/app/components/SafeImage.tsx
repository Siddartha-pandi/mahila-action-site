"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  errorText?: string;
  iconSize?: number;
}

export function SafeImage({
  src,
  alt,
  className = "size-full object-cover",
  containerClassName = "size-full flex flex-col items-center justify-center bg-[#a65a4a]/10 text-[#a65a4a]/70 gap-2 select-none",
  errorText = "Image not available",
  iconSize = 32,
  onError,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div className={containerClassName} role="img" aria-label={`${alt || "Image"} (not available)`}>
        <ImageOff size={iconSize} className="opacity-75" />
        {errorText ? <span className="text-xs font-medium tracking-wide">{errorText}</span> : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        setHasError(true);
        onError?.(e);
      }}
      {...props}
    />
  );
}

