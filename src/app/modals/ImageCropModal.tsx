"use client";

import { useRef, useState } from "react";
import { X, Check, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/Button";

type Box = { x: number; y: number; w: number; h: number };
type DragMode = "move" | "nw" | "ne" | "sw" | "se" | null;

const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
];

const MIN_SIZE = 40;

function clampBox(box: Box, bounds: { w: number; h: number }): Box {
  let { x, y, w, h } = box;
  w = Math.max(MIN_SIZE, Math.min(w, bounds.w));
  h = Math.max(MIN_SIZE, Math.min(h, bounds.h));
  x = Math.max(0, Math.min(x, bounds.w - w));
  y = Math.max(0, Math.min(y, bounds.h - h));
  return { x, y, w, h };
}

export function ImageCropModal({
  src,
  onCancel,
  onConfirm,
}: {
  src: string;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; startBox: Box } | null>(null);

  function initBox(w: number, h: number, lockAspect: number | null) {
    let bw = w * 0.8;
    let bh = h * 0.8;
    if (lockAspect) {
      if (bw / bh > lockAspect) bw = bh * lockAspect;
      else bh = bw / lockAspect;
    }
    setBox(clampBox({ x: (w - bw) / 2, y: (h - bh) / 2, w: bw, h: bh }, { w, h }));
  }

  function handleImgLoad() {
    const el = imgRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    setDisplaySize({ w, h });
    initBox(w, h, aspect);
  }

  function applyAspect(a: number | null) {
    setAspect(a);
    if (displaySize) initBox(displaySize.w, displaySize.h, a);
  }

  function onPointerDown(mode: DragMode, e: React.PointerEvent) {
    if (!box) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startBox: box };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || !drag.mode || !displaySize) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const bounds = displaySize;
    let next: Box = { ...drag.startBox };

    if (drag.mode === "move") {
      next.x = drag.startBox.x + dx;
      next.y = drag.startBox.y + dy;
    } else {
      let { x, y, w, h } = drag.startBox;
      if (drag.mode === "se") {
        w = drag.startBox.w + dx;
        h = aspect ? w / aspect : drag.startBox.h + dy;
      } else if (drag.mode === "nw") {
        w = drag.startBox.w - dx;
        h = aspect ? w / aspect : drag.startBox.h - dy;
        x = drag.startBox.x + (drag.startBox.w - w);
        y = drag.startBox.y + (drag.startBox.h - h);
      } else if (drag.mode === "ne") {
        w = drag.startBox.w + dx;
        h = aspect ? w / aspect : drag.startBox.h - dy;
        y = drag.startBox.y + (drag.startBox.h - h);
      } else if (drag.mode === "sw") {
        w = drag.startBox.w - dx;
        h = aspect ? w / aspect : drag.startBox.h + dy;
        x = drag.startBox.x + (drag.startBox.w - w);
      }
      next = { x, y, w, h };
    }
    setBox(clampBox(next, bounds));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function handleConfirm() {
    const imgEl = imgRef.current;
    if (!imgEl || !box || !displaySize) return;
    try {
      const scaleX = imgEl.naturalWidth / displaySize.w;
      const scaleY = imgEl.naturalHeight / displaySize.h;
      const sx = box.x * scaleX;
      const sy = box.y * scaleY;
      const sw = box.w * scaleX;
      const sh = box.h * scaleY;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no ctx");
      ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const isPng = src.startsWith("data:image/png") || src.toLowerCase().endsWith(".png");
      const dataUrl = isPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.92);
      onConfirm(dataUrl);
    } catch {
      setError(
        "This image can't be cropped in the browser because it's hosted on a site that blocks cross-origin access. Try uploading the file directly instead of using its URL."
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[500] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1e1e1e]/10">
          <h3 className="font-['Inter',sans-serif] font-semibold text-[15px] text-[#1e1e1e]">Crop Image</h3>
          <button
            onClick={onCancel}
            className="size-8 flex items-center justify-center rounded-full hover:bg-[#1e1e1e]/5 cursor-pointer text-[#1e1e1e]/60"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-[#1e1e1e]/10 bg-[#faf7f3]">
          <span className="font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/45 uppercase tracking-wider mr-1">
            Aspect
          </span>
          {ASPECTS.map((a) => (
            <button
              key={a.label}
              onClick={() => applyAspect(a.value)}
              className={`px-3 py-1 rounded-full text-[12px] font-['Inter',sans-serif] font-medium cursor-pointer transition-colors ${
                aspect === a.value
                  ? "bg-[#a65a4a] text-white"
                  : "bg-white border border-[#a65a4a]/25 text-[#1e1e1e]/70 hover:border-[#a65a4a]"
              }`}
            >
              {a.label}
            </button>
          ))}
          {displaySize && (
            <button
              onClick={() => initBox(displaySize.w, displaySize.h, aspect)}
              className="ml-auto flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-['Inter',sans-serif] font-medium text-[#1e1e1e]/60 hover:text-[#a65a4a] cursor-pointer"
            >
              <RotateCcw size={12} /> Reset
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center bg-[#1e1e1e]/90 p-6">
          <div className="relative select-none" style={{ touchAction: "none" }}>
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              onLoad={handleImgLoad}
              className="block max-w-[560px] max-h-[60vh] w-auto h-auto"
              draggable={false}
            />
            {box && (
              <>
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    clipPath: `polygon(0% 0%, 0% 100%, ${box.x}px 100%, ${box.x}px ${box.y}px, ${box.x + box.w}px ${box.y}px, ${box.x + box.w}px ${box.y + box.h}px, ${box.x}px ${box.y + box.h}px, ${box.x}px 100%, 100% 100%, 100% 0%)`,
                    background: "rgba(0,0,0,0.55)",
                  }}
                />
                <div
                  onPointerDown={(e) => onPointerDown("move", e)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  className="absolute border-2 border-white cursor-move"
                  style={{ left: box.x, top: box.y, width: box.w, height: box.h, boxShadow: "0 0 0 1px rgba(0,0,0,0.3)" }}
                >
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border border-white/25" />
                    ))}
                  </div>
                  {(["nw", "ne", "sw", "se"] as DragMode[]).map((corner) => (
                    <div
                      key={corner}
                      onPointerDown={(e) => onPointerDown(corner, e)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      className={`absolute size-4 bg-white border-2 border-[#a65a4a] rounded-full ${
                        corner === "nw" ? "-top-2 -left-2 cursor-nwse-resize" : ""
                      } ${corner === "ne" ? "-top-2 -right-2 cursor-nesw-resize" : ""} ${
                        corner === "sw" ? "-bottom-2 -left-2 cursor-nesw-resize" : ""
                      } ${corner === "se" ? "-bottom-2 -right-2 cursor-nwse-resize" : ""}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="px-5 py-2 text-[12px] font-['Inter',sans-serif] text-red-600 bg-red-50 border-t border-red-100 font-medium">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#1e1e1e]/10">
          <Button variant="ghost" onClick={onCancel} size="sm">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm} size="sm" leftIcon={<Check size={14} />}>
            Apply Crop
          </Button>
        </div>
      </div>
    </div>
  );
}
