import { useRef, useState } from "react";
import { Plus, Trash2, Pencil, X, ImagePlus, Crop } from "lucide-react";
import { ImageCropModal } from "./ImageCropModal";

export const inputBase =
  "w-full border border-[#a65a4a]/30 rounded-lg px-3 py-2 text-[14px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a] font-['Inter',sans-serif] bg-white";
export const labelBase =
  "font-['Inter',sans-serif] text-[11px] font-semibold text-[#1e1e1e]/50 uppercase tracking-wider block mb-1.5";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Fetches a remote image URL and converts it to a data URL, so the crop modal
 * always works on same-origin data — this avoids the browser's canvas CORS
 * restriction that otherwise blocks cropping most externally-hosted images.
 * Returns null if the host doesn't allow cross-origin fetches (rare), in
 * which case the caller falls back to cropping the URL directly.
 */
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** A single image field: paste a URL, or upload a file (stored as a data URL — no extra storage setup needed). */
export function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [resolvingCrop, setResolvingCrop] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      onChange(dataUrl);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function openCrop() {
    if (value.startsWith("data:")) {
      setCropSrc(value);
      setCropping(true);
      return;
    }
    setResolvingCrop(true);
    const resolved = await urlToDataUrl(value);
    setResolvingCrop(false);
    setCropSrc(resolved ?? value); // falls back to cropping the URL directly if the host blocks cross-origin fetches
    setCropping(true);
  }

  return (
    <div>
      <label className={labelBase}>{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={value.startsWith("data:") ? "(uploaded image)" : "Paste image URL…"}
          className={inputBase}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a65a4a]/30 text-[#a65a4a] text-[13px] font-medium hover:bg-[#a65a4a]/5 cursor-pointer"
        >
          <ImagePlus size={14} /> {uploading ? "…" : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {value && (
        <div className="relative w-fit mt-2">
          <img
            src={value}
            alt="preview"
            className="h-24 rounded-lg object-cover border border-[#a65a4a]/20"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <button
            type="button"
            onClick={openCrop}
            disabled={resolvingCrop}
            className="absolute -top-1.5 -right-1.5 size-6 bg-[#a65a4a] text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-[#993925] disabled:opacity-60"
            title="Crop image"
          >
            {resolvingCrop ? (
              <svg className="animate-spin size-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <Crop size={12} />
            )}
          </button>
        </div>
      )}
      {cropping && cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onCancel={() => { setCropping(false); setCropSrc(null); }}
          onConfirm={(cropped) => {
            onChange(cropped);
            setCropping(false);
            setCropSrc(null);
          }}
        />
      )}
    </div>
  );
}

/** A multi-image gallery field: add/remove any number of images. */
export function GalleryField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const dataUrls = await Promise.all(files.map(fileToDataUrl));
    onChange([...value, ...dataUrls]);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function openCrop(i: number) {
    const img = value[i];
    if (img.startsWith("data:")) {
      setCropSrc(img);
      setCropIndex(i);
      return;
    }
    setResolvingIndex(i);
    const resolved = await urlToDataUrl(img);
    setResolvingIndex(null);
    setCropSrc(resolved ?? img); // falls back to cropping the URL directly if the host blocks cross-origin fetches
    setCropIndex(i);
  }

  return (
    <div>
      <label className={labelBase}>{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((img, i) => (
          <div key={i} className="relative group">
            <img src={img} alt="" className="size-20 rounded-lg object-cover border border-[#a65a4a]/20" />
            <button
              type="button"
              onClick={() => openCrop(i)}
              disabled={resolvingIndex === i}
              className="absolute -top-1.5 -left-1.5 size-5 bg-white text-[#a65a4a] border border-[#a65a4a]/40 rounded-full flex items-center justify-center cursor-pointer hover:bg-[#a65a4a] hover:text-white disabled:opacity-60"
              title="Crop image"
            >
              {resolvingIndex === i ? (
                <svg className="animate-spin size-2.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <Crop size={11} />
              )}
            </button>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="absolute -top-1.5 -right-1.5 size-5 bg-[#a65a4a] text-white rounded-full flex items-center justify-center cursor-pointer"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="Paste image URL, then Add…"
          className={inputBase}
        />
        <button
          type="button"
          onClick={() => {
            if (!urlDraft.trim()) return;
            onChange([...value, urlDraft.trim()]);
            setUrlDraft("");
          }}
          className="shrink-0 px-3 py-2 rounded-lg border border-[#a65a4a]/30 text-[#a65a4a] text-[13px] font-medium hover:bg-[#a65a4a]/5 cursor-pointer"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#a65a4a]/30 text-[#a65a4a] text-[13px] font-medium hover:bg-[#a65a4a]/5 cursor-pointer"
        >
          <ImagePlus size={14} /> Upload
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>
      {cropIndex !== null && cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onCancel={() => { setCropIndex(null); setCropSrc(null); }}
          onConfirm={(cropped) => {
            onChange(value.map((v, idx) => (idx === cropIndex ? cropped : v)));
            setCropIndex(null);
            setCropSrc(null);
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
  addLabel?: string;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-[260px] shrink-0">
        {onAdd && (
          <button
            onClick={onAdd}
            className="w-full flex items-center justify-center gap-2 bg-[#a65a4a] text-white text-[13px] font-semibold py-2.5 rounded-lg hover:bg-[#993925] transition-colors cursor-pointer mb-3"
          >
            <Plus size={15} /> {addLabel}
          </button>
        )}
        {items.length === 0 && (
          <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[13px] px-1">{emptyLabel}</p>
        )}
        <div className="flex flex-col gap-1.5 max-h-[520px] overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer border transition-colors ${
                activeId === item.id
                  ? "bg-[#a65a4a]/10 border-[#a65a4a]"
                  : "bg-white border-[#a65a4a]/15 hover:border-[#a65a4a]/40"
              }`}
            >
              <div className="min-w-0">
                <p className="font-['Inter',sans-serif] text-[13px] font-medium text-[#1e1e1e] truncate">{itemLabel(item)}</p>
                {itemSubLabel && <p className="font-['Inter',sans-serif] text-[11px] text-[#1e1e1e]/45 truncate">{itemSubLabel(item)}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
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
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
