"use client";

import * as React from "react";
import { ImageOff, Loader2 } from "lucide-react";

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  fallbackSrc?: string;
  fallbackContainer?: React.ReactNode;
  alt: string;
  className?: string;
  containerClassName?: string;
  loadingClassName?: string;
  errorText?: string;
  iconSize?: number;
}

export function SafeImage({
  src,
  fallbackSrc,
  fallbackContainer,
  alt,
  className = "size-full object-cover",
  containerClassName = "size-full flex flex-col items-center justify-center bg-[#a65a4a]/10 text-[#a65a4a]/70 gap-2 select-none",
  loadingClassName,
  errorText,
  iconSize = 32,
  onLoad,
  onError,
  ...props
}: SafeImageProps) {
  const initialSrc = src || fallbackSrc;
  const [currentSrc, setCurrentSrc] = React.useState<string | undefined>(initialSrc);
  const [triedFallback, setTriedFallback] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(Boolean(initialSrc));
  const [hasError, setHasError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const nextSrc = src || fallbackSrc;
    setCurrentSrc(nextSrc);
    setTriedFallback(false);
    setHasError(false);

    if (!nextSrc) {
      setIsLoading(false);
      return;
    }

    if (imgRef.current?.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setHasError(true);
      }
    } else {
      setIsLoading(true);
    }
  }, [src, fallbackSrc]);

  function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
    if (fallbackSrc && !triedFallback && currentSrc !== fallbackSrc) {
      setTriedFallback(true);
      setCurrentSrc(fallbackSrc);
      setIsLoading(true);
      return;
    }

    setIsLoading(false);
    setHasError(true);
    onError?.(e);
  }

  if (!currentSrc || hasError) {
    if (fallbackContainer) {
      return <>{fallbackContainer}</>;
    }
    return (
      <div className={containerClassName} role="img" aria-label={`${alt || "Image"} (not available)`}>
        <ImageOff size={iconSize} className="opacity-75" />
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className={
            loadingClassName ||
            "absolute inset-0 size-full flex flex-col items-center justify-center bg-[#a65a4a]/15 text-[#a65a4a]/60 animate-pulse select-none z-1"
          }
          role="status"
          aria-label="Loading image..."
        >
          <Loader2 size={Math.min(iconSize, 28)} className="animate-spin opacity-70 text-[#a65a4a]" />
        </div>
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${isLoading ? "opacity-0" : "opacity-100"}`}
        onLoad={(e) => {
          setIsLoading(false);
          onLoad?.(e);
        }}
        onError={handleImageError}
        {...props}
      />
    </>
  );
}
