import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  ImagePlus,
  Crop,
  UploadCloud,
  Search,
  Loader2,
  Check,
  Link2,
  RefreshCw,
} from "lucide-react";
import { ImageCropModal } from "./modals/ImageCropModal";
import { Pagination } from "./components/ui/Pagination";
import { usePagination } from "./hooks/usePagination";
import { fileToDataUrl, urlToDataUrl, uploadMediaToDb } from "@/lib/media";

export const inputBase =
  "w-full border border-[#a65a4a]/30 rounded-lg px-3 py-2 text-[14px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a] font-['Inter',sans-serif] bg-white";
export const labelBase =
  "font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider block mb-1.5";

/** A single image field: Drag and drop or browse to upload with cloud sync, or paste a URL. */
export function ImageField({
  label,
  value = "",
  onChange,
  title,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  title?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [resolvingCrop, setResolvingCrop] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const safeVal = typeof value === "string" ? value : "";

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP, SVG, GIF)");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Image file is too large (max 25MB)");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMediaToDb(file, file.name, title);
      if (url.startsWith("data:")) {
        toast.warning("Image could not be saved to media table (saved locally).");
      } else {
        toast.success("Image saved successfully!");
      }
      onChange(url);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      setIsDragging(true);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  }

  async function openCrop() {
    if (safeVal.startsWith("data:")) {
      setCropSrc(safeVal);
      setCropping(true);
      return;
    }
    setResolvingCrop(true);
    const resolved = await urlToDataUrl(safeVal);
    setResolvingCrop(false);
    setCropSrc(resolved ?? safeVal);
    setCropping(true);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className={labelBase}>{label}</label>
        {safeVal && (
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] font-medium text-[#a65a4a] hover:underline cursor-pointer flex items-center gap-1"
          >
            <Link2 size={12} />
            {showUrlInput ? "Hide Link" : "Edit URL"}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {/* Hidden/Collapsible Direct URL Input */}
      {showUrlInput && (
        <div className="flex gap-2 p-2 bg-[#faf7f3] border border-[#a65a4a]/20 rounded-lg animate-in fade-in">
          <input
            type="text"
            value={urlDraft || (safeVal.startsWith("data:") ? "" : safeVal)}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="Paste image URL (/api/media/... or external link)"
            className={inputBase}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (urlDraft.trim()) {
                  onChange(urlDraft.trim());
                  setUrlDraft("");
                  setShowUrlInput(false);
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (urlDraft.trim()) {
                onChange(urlDraft.trim());
                setUrlDraft("");
                setShowUrlInput(false);
              }
            }}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#a65a4a] text-white text-[12px] font-medium hover:bg-[#8f4738] cursor-pointer transition-colors"
          >
            Apply
          </button>
        </div>
      )}

      {!safeVal ? (
        /* Empty State Dropzone */
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`relative group rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer select-none ${
            isDragging
              ? "border-[#a65a4a] bg-[#F6ECE9] ring-4 ring-[#a65a4a]/20 scale-[1.01]"
              : "border-[#a65a4a]/30 hover:border-[#a65a4a] bg-[#faf7f3]/50 hover:bg-[#faf7f3]"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center justify-center py-2 gap-2 text-[#a65a4a]">
              <Loader2 size={28} className="animate-spin text-[#a65a4a]" />
              <p className="text-[13px] font-semibold">Uploading to database...</p>
              <span className="text-[11px] text-[#1e1e1e]/50">Computing hash & securing storage</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2">
              <div
                className={`p-3 rounded-full transition-all ${
                  isDragging
                    ? "bg-[#a65a4a] text-white scale-110 shadow-md"
                    : "bg-[#a65a4a]/10 text-[#a65a4a] group-hover:bg-[#a65a4a]/20 group-hover:scale-105"
                }`}
              >
                <UploadCloud size={24} className={isDragging ? "animate-bounce" : ""} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#1e1e1e]">
                  {isDragging ? (
                    "Release to upload image!"
                  ) : (
                    <span>
                      Drag & drop image here, or{" "}
                      <span className="text-[#a65a4a] underline decoration-[#a65a4a]/40 underline-offset-2">
                        browse files
                      </span>
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-[#1e1e1e]/50 mt-0.5">
                  Supports PNG, JPG, WebP, SVG up to 25MB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUrlInput(!showUrlInput);
                }}
                className="mt-1 text-[11px] text-[#a65a4a] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Link2 size={12} />
                Or paste image link
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Populated State with Preview & Drop Replacement */
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border p-3 bg-white transition-all overflow-hidden ${
            isDragging
              ? "border-[#a65a4a] ring-2 ring-[#a65a4a]/20 bg-[#F6ECE9]/40"
              : "border-[#a65a4a]/20 hover:border-[#a65a4a]/40 shadow-xs"
          }`}
        >
          {isDragging && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#F6ECE9]/95 backdrop-blur-xs border-2 border-dashed border-[#a65a4a] rounded-xl text-[#a65a4a] font-medium text-[13px] gap-2 pointer-events-none">
              <RefreshCw size={24} className="animate-spin" />
              <span>Drop to replace this image</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs rounded-xl text-[#a65a4a] font-medium text-[13px] gap-2">
              <Loader2 size={24} className="animate-spin" />
              <span>Uploading new image...</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative group shrink-0 size-24 sm:size-28 rounded-lg overflow-hidden border border-[#a65a4a]/15 bg-[#faf7f3] flex items-center justify-center">
              <img
                src={safeVal}
                alt="preview"
                className="size-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            </div>

            <div className="flex-1 min-w-0 w-full space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F6ECE9] text-[#A84E3D]">
                  <Check size={12} />
                  {safeVal.startsWith("/api/media/")
                    ? "Database Stored"
                    : safeVal.startsWith("data:")
                    ? "Local Preview"
                    : "Direct Link"}
                </span>
                <span className="text-[11px] text-[#1e1e1e]/40 truncate font-mono" title={safeVal}>
                  {safeVal.slice(0, 36)}
                  {safeVal.length > 36 ? "…" : ""}
                </span>
              </div>

              <p className="text-[11px] text-[#1e1e1e]/60">
                Drag and drop a new file onto this card anytime to replace it.
              </p>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#a65a4a]/30 text-[#a65a4a] text-[12px] font-medium hover:bg-[#a65a4a]/5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={13} className={uploading ? "animate-spin" : ""} />
                  Replace
                </button>
                <button
                  type="button"
                  onClick={openCrop}
                  disabled={resolvingCrop || uploading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#a65a4a]/30 text-[#a65a4a] text-[12px] font-medium hover:bg-[#a65a4a]/5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {resolvingCrop ? <Loader2 size={13} className="animate-spin" /> : <Crop size={13} />}
                  Crop & Adjust
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[#a65a4a] hover:bg-red-50 hover:text-red-600 text-[12px] font-medium cursor-pointer transition-colors ml-auto"
                  title="Remove image"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cropping && cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onCancel={() => {
            setCropping(false);
            setCropSrc(null);
          }}
          onConfirm={async (cropped) => {
            setCropping(false);
            setCropSrc(null);
            setUploading(true);
            try {
              const url = await uploadMediaToDb(
                cropped,
                `${title ? title + "-cropped" : "cropped"}.png`,
                title
              );
              if (url.startsWith("data:")) {
                toast.warning("Cropped image could not be saved to media table (saved locally).");
              } else {
                toast.success("Cropped image saved to media library!");
              }
              onChange(url);
            } catch (err: any) {
              toast.error(err?.message || "Failed to upload cropped image");
            } finally {
              setUploading(false);
            }
          }}
        />
      )}
    </div>
  );
}

/** A multi-image gallery field: add/remove any number of images via drag & drop or file upload. */
export function GalleryField({
  label,
  value = [],
  onChange,
  title,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  title?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [urlDraft, setUrlDraft] = useState("");
  const [showUrlDrawer, setShowUrlDrawer] = useState(false);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  const safeList = Array.isArray(value) ? value : [];

  async function processFiles(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) {
      toast.error("Please drop or select valid image files");
      return;
    }
    setUploading(true);
    setUploadCount(imageFiles.length);
    try {
      const uploaded = await Promise.all(
        imageFiles.map((f, idx) =>
          uploadMediaToDb(f, f.name, title ? `${title}-${safeList.length + idx + 1}` : f.name)
        )
      );
      const hasFallback = uploaded.some((u) => u.startsWith("data:"));
      if (hasFallback) {
        toast.warning("Some images could not be saved to media table (saved locally).");
      } else {
        toast.success(
          `${uploaded.length} image${uploaded.length > 1 ? "s" : ""} saved successfully!`
        );
      }
      onChange([...safeList, ...uploaded]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload gallery images");
    } finally {
      setUploading(false);
      setUploadCount(0);
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    await processFiles(files);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      setIsDragging(true);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) {
      await processFiles(files);
    }
  }

  async function openCrop(i: number) {
    const img = safeList[i];
    if (!img) return;
    if (img.startsWith("data:")) {
      setCropSrc(img);
      setCropIndex(i);
      return;
    }
    setResolvingIndex(i);
    const resolved = await urlToDataUrl(img);
    setResolvingIndex(null);
    setCropSrc(resolved ?? img);
    setCropIndex(i);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={labelBase}>
          {label} {safeList.length > 0 && <span className="text-[#a65a4a]">({safeList.length})</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlDrawer(!showUrlDrawer)}
          className="text-[11px] font-medium text-[#a65a4a] hover:underline cursor-pointer flex items-center gap-1"
        >
          <Link2 size={12} />
          {showUrlDrawer ? "Hide URL Input" : "Add via URL"}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      {showUrlDrawer && (
        <div className="flex gap-2 p-2 bg-[#faf7f3] border border-[#a65a4a]/20 rounded-lg animate-in fade-in">
          <input
            type="text"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="Paste image URL (/api/media/... or external link)"
            className={inputBase}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (urlDraft.trim()) {
                  onChange([...safeList, urlDraft.trim()]);
                  setUrlDraft("");
                }
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (urlDraft.trim()) {
                onChange([...safeList, urlDraft.trim()]);
                setUrlDraft("");
              }
            }}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#a65a4a] text-white text-[12px] font-medium hover:bg-[#8f4738] cursor-pointer transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {/* Main Drag-and-Drop Gallery Container */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 transition-all p-3 ${
          isDragging
            ? "border-dashed border-[#a65a4a] bg-[#F6ECE9] ring-4 ring-[#a65a4a]/20"
            : safeList.length === 0
            ? "border-dashed border-[#a65a4a]/30 hover:border-[#a65a4a] bg-[#faf7f3]/40"
            : "border-solid border-[#a65a4a]/20 bg-white"
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#F6ECE9]/95 backdrop-blur-xs border-2 border-dashed border-[#a65a4a] rounded-xl text-[#a65a4a] font-medium text-[13px] gap-2 pointer-events-none">
            <UploadCloud size={28} className="animate-bounce" />
            <span>Drop images here to add to gallery</span>
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-2.5 p-2.5 mb-3 rounded-lg bg-[#F6ECE9] text-[#A84E3D] text-[12px] font-medium animate-pulse">
            <Loader2 size={16} className="animate-spin shrink-0" />
            <span>Uploading {uploadCount} image{uploadCount > 1 ? "s" : ""} to database...</span>
          </div>
        )}

        {safeList.length === 0 ? (
          /* Empty Gallery Drop Area */
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            className="flex flex-col items-center justify-center py-6 text-center cursor-pointer group"
          >
            <div className="p-3 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] group-hover:bg-[#a65a4a]/20 group-hover:scale-105 transition-all mb-2">
              <UploadCloud size={24} />
            </div>
            <p className="text-[13px] font-semibold text-[#1e1e1e]">
              Drag & drop multiple images here, or{" "}
              <span className="text-[#a65a4a] underline decoration-[#a65a4a]/40 underline-offset-2">
                browse files
              </span>
            </p>
            <p className="text-[11px] text-[#1e1e1e]/50 mt-0.5">
              Select one or multiple images • Automatically uploaded and organized
            </p>
          </div>
        ) : (
          /* Populated Gallery Grid with dedicated Add Card */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            {safeList.map((img, i) => (
              <div
                key={i}
                className="group relative aspect-square rounded-lg overflow-hidden border border-[#a65a4a]/20 bg-[#faf7f3] shadow-2xs"
              >
                <img
                  src={img}
                  alt={`gallery-${i + 1}`}
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
                
                {/* Index badge */}
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-semibold tracking-wide pointer-events-none">
                  #{i + 1}
                </span>

                {/* Hover Action Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openCrop(i)}
                    disabled={resolvingIndex === i || uploading}
                    className="size-7 rounded-full bg-white text-[#a65a4a] hover:bg-[#a65a4a] hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                    title="Crop image"
                  >
                    {resolvingIndex === i ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Crop size={12} />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(safeList.filter((_, idx) => idx !== i))}
                    className="size-7 rounded-full bg-white text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center cursor-pointer transition-colors shadow-sm"
                    title="Remove image"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add More Drop Card */}
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-[#a65a4a]/30 hover:border-[#a65a4a] hover:bg-[#F6ECE9]/30 flex flex-col items-center justify-center gap-1 text-[#a65a4a] cursor-pointer transition-all group"
              title="Add more images"
            >
              <div className="p-1.5 rounded-full bg-[#a65a4a]/10 group-hover:bg-[#a65a4a]/20 group-hover:scale-110 transition-all">
                <Plus size={16} />
              </div>
              <span className="text-[11px] font-semibold text-[#1e1e1e]/80">Add More</span>
            </div>
          </div>
        )}
      </div>

      {cropIndex !== null && cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onCancel={() => {
            setCropIndex(null);
            setCropSrc(null);
          }}
          onConfirm={async (cropped) => {
            const targetIndex = cropIndex;
            setCropIndex(null);
            setCropSrc(null);
            if (targetIndex === null) return;
            setUploading(true);
            try {
              const url = await uploadMediaToDb(cropped, "gallery-cropped.png", title);
              if (url.startsWith("data:")) {
                toast.warning("Cropped image could not be saved to media table (saved locally).");
              } else {
                toast.success("Cropped image saved to media library!");
              }
              onChange(safeList.map((v, idx) => (idx === targetIndex ? url : v)));
            } catch (err: any) {
              toast.error(err?.message || "Failed to upload cropped image");
            } finally {
              setUploading(false);
            }
          }}
        />
      )}
    </div>
  );
}

/** A chip-style tag input: type a tag and press Enter or comma to add it, click × to remove. */
export function TagsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      <label className={labelBase}>{label}</label>
      <div className="flex flex-wrap items-center gap-1.5 border border-[#a65a4a]/30 rounded-lg px-2.5 py-2 bg-white focus-within:border-[#a65a4a]">
        {value.map((tag, i) => (
          <span
            key={i}
            className="flex items-center gap-1 bg-[#a65a4a]/10 text-[#a65a4a] text-[12px] font-['Inter',sans-serif] font-medium pl-2.5 pr-1.5 py-1 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="size-3.5 flex items-center justify-center rounded-full hover:bg-[#a65a4a]/20 cursor-pointer"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag(draft)}
          placeholder={value.length === 0 ? "Type a tag and press Enter…" : "Add another…"}
          className="flex-1 min-w-[120px] text-[13px] font-['Inter',sans-serif] text-[#1e1e1e] outline-none py-0.5"
        />
      </div>
    </div>
  );
}

/**
 * Generic "list on the left, editor on the right" CRUD scaffold shared by
 * every new admin section (Events, Stories, Councilors, Timeline, Categories).
 */
export function AdminListEditor<T extends { id: string }>({
  items,
  activeId,
  onSelect,
  onAdd,
  onDelete,
  itemLabel,
  itemSubLabel,
  itemAction,
  addLabel,
  emptyLabel,
  children,
}: {
  items: T[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd?: () => void;
  onDelete?: (id: string) => void;
  itemLabel: (item: T) => string;
  itemSubLabel?: (item: T) => string;
  itemAction?: (item: T) => React.ReactNode;
  addLabel?: string;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const [search, setSearch] = useState("");

  const filteredItems = items.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const lbl = itemLabel(item).toLowerCase();
    const sub = itemSubLabel ? itemSubLabel(item).toLowerCase() : "";
    return lbl.includes(q) || sub.includes(q);
  });

  const {
    page,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems,
    setPage,
  } = usePagination(filteredItems, { initialPageSize: 8 });

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-2">
        {onAdd && (
          <button
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-2 bg-[#a65a4a] text-white text-[13px] font-semibold py-2.5 rounded-lg hover:bg-[#993925] transition-colors cursor-pointer mb-1"
          >
            <Plus size={15} /> {addLabel}
          </button>
        )}

        {/* Real-time Search Input */}
        {items.length > 3 && (
          <div className="relative mb-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#1e1e1e]/40 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search list…"
              className="w-full bg-white border border-[#a65a4a]/25 rounded-lg pl-8 pr-7 py-1.5 text-[12px] text-[#1e1e1e] placeholder-[#1e1e1e]/40 focus:outline-none focus:border-[#a65a4a] font-['Inter',sans-serif]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[#1e1e1e]/40 hover:text-[#a65a4a] cursor-pointer"
                title="Clear"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {filteredItems.length === 0 && (
          <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[13px] px-1 py-2">{emptyLabel}</p>
        )}

        <div className="flex flex-col gap-1.5 max-h-[240px] sm:max-h-[320px] md:max-h-[460px] overflow-y-auto pr-1">
          {paginatedItems.map((item, index) => (
            <div
              key={`${item.id}_${index}`}
              onClick={() => onSelect(String(item.id))}
              className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer border transition-colors ${
                String(activeId) === String(item.id)
                  ? "bg-[#a65a4a]/10 border-[#a65a4a]"
                  : "bg-white border-[#a65a4a]/15 hover:border-[#a65a4a]/40"
              }`}
            >
              <div className="min-w-0">
                <p className="font-['Inter',sans-serif] text-[13px] font-medium text-[#1e1e1e] truncate">{itemLabel(item)}</p>
                {itemSubLabel && <p className="font-['Inter',sans-serif] text-[11px] text-[#1e1e1e]/45 truncate">{itemSubLabel(item)}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {itemAction && itemAction(item)}
                <Pencil size={13} className="text-[#a65a4a]/50" />
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${itemLabel(item)}"? This can't be undone.`)) onDelete(item.id);
                    }}
                    className="text-[#1e1e1e]/30 hover:text-red-600 cursor-pointer p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Compact Pagination */}
        {totalItems > pageSize && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            compact
          />
        )}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
