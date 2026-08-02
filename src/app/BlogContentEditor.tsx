import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Link as LinkIcon,
  ImagePlus,
  Minus,
  Plus,
  Eraser,
} from "lucide-react";
import { ImageCropModal } from "./modals/ImageCropModal";

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isLikelyHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

/** Migrates the legacy "blank-line separated paragraphs" plain text format into HTML. */
function plainTextToHtml(s: string) {
  const paragraphs = s.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) return "<p><br/></p>";
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

const BLOCK_TAGS = ["P", "H2", "H3", "BLOCKQUOTE", "LI", "DIV"];

// ─────────────────────────────────────────────────────────────────────────
// Small UI atoms
// ─────────────────────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="size-8 flex items-center justify-center rounded-md text-[#1e1e1e]/70 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a] transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

function BubbleButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="size-7 flex items-center justify-center rounded-md text-white/85 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main editor
// ─────────────────────────────────────────────────────────────────────────

export function BlogContentEditor({
  value,
  onChange,
  placeholder = "Tell your story… select text to format it, or use + to add an image, quote, or divider.",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  const [bubble, setBubble] = useState<{ top: number; left: number } | null>(null);
  const [plusPos, setPlusPos] = useState<{ top: number } | null>(null);
  const [insertMenuOpen, setInsertMenuOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState<{ src: string; forImg: HTMLImageElement | null } | null>(null);

  // Initialize contentEditable HTML once, migrating legacy plain-text content.
  useEffect(() => {
    if (initialized.current || !editorRef.current) return;
    const html = value && isLikelyHtml(value) ? value : plainTextToHtml(value || "");
    editorRef.current.innerHTML = html || "<p><br/></p>";
    initialized.current = true;
  }, [value]);

  function emitChange() {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function exec(command: string, arg?: string) {
    focusEditor();
    document.execCommand(command, false, arg);
    emitChange();
  }

  function toggleBlock(tag: string) {
    focusEditor();
    document.execCommand("formatBlock", false, tag);
    emitChange();
  }

  function insertLink() {
    const url = window.prompt("Paste a link URL");
    if (!url) return;
    exec("createLink", url);
  }

  function insertDivider() {
    focusEditor();
    document.execCommand("insertHTML", false, "<hr/><p><br/></p>");
    emitChange();
  }

  function insertImageHtml(src: string) {
    focusEditor();
    document.execCommand(
      "insertHTML",
      false,
      `<figure><img src="${src}" alt=""/></figure><p><br/></p>`
    );
    emitChange();
  }

  function insertImageFromUrl() {
    const url = window.prompt("Paste an image URL");
    if (!url) return;
    setCropTarget({ src: url, forImg: null });
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await fileToDataUrl(file);
      setCropTarget({ src: dataUrl, forImg: null });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleEditorDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.tagName === "IMG") {
      setCropTarget({ src: (target as HTMLImageElement).src, forImg: target as HTMLImageElement });
    }
  }

  function handleCropConfirm(croppedDataUrl: string) {
    if (cropTarget?.forImg) {
      // Re-cropping an image already placed in the content — update it in place.
      cropTarget.forImg.src = croppedDataUrl;
      emitChange();
    } else {
      insertImageHtml(croppedDataUrl);
    }
    setCropTarget(null);
  }

  // Floating selection bubble menu (Medium-style: select text to format it).
  const updateBubble = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !editorRef.current || !wrapperRef.current) {
      setBubble(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      setBubble(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setBubble(null);
      return;
    }
    const containerRect = wrapperRef.current.getBoundingClientRect();
    setBubble({
      top: rect.top - containerRect.top - 46,
      left: rect.left - containerRect.left + rect.width / 2,
    });
  }, []);

  // "+" block inserter that appears next to the current empty line, like Medium.
  const updatePlus = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.isCollapsed || sel.rangeCount === 0 || !editorRef.current || !wrapperRef.current) {
      setPlusPos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      setPlusPos(null);
      return;
    }
    let node: Node | null = range.startContainer;
    let block: HTMLElement | null = node.nodeType === 3 ? node.parentElement : (node as HTMLElement);
    while (block && block !== editorRef.current && !BLOCK_TAGS.includes(block.tagName)) {
      block = block.parentElement;
    }
    if (!block || block === editorRef.current || block.tagName === "LI") {
      setPlusPos(null);
      return;
    }
    const isEmpty = (block.textContent || "").trim().length === 0;
    if (!isEmpty) {
      setPlusPos(null);
      return;
    }
    const rect = block.getBoundingClientRect();
    const containerRect = wrapperRef.current.getBoundingClientRect();
    setPlusPos({ top: rect.top - containerRect.top });
  }, []);

  useEffect(() => {
    function handler() {
      updateBubble();
      updatePlus();
    }
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [updateBubble, updatePlus]);

  return (
    <div ref={wrapperRef} className="relative">
      {/* Fixed formatting toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border border-[#a65a4a]/30 border-b-0 rounded-t-lg bg-[#faf7f3] px-1.5 py-1">
        <ToolbarButton onClick={() => exec("bold")} title="Bold">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} title="Italic">
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("underline")} title="Underline">
          <Underline size={15} />
        </ToolbarButton>
        <span className="w-px h-5 bg-[#a65a4a]/20 mx-1" />
        <ToolbarButton onClick={() => toggleBlock("h2")} title="Heading">
          <Heading2 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggleBlock("h3")} title="Subheading">
          <Heading3 size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggleBlock("blockquote")} title="Quote">
          <Quote size={15} />
        </ToolbarButton>
        <span className="w-px h-5 bg-[#a65a4a]/20 mx-1" />
        <ToolbarButton onClick={() => exec("insertUnorderedList")} title="Bullet list">
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("insertOrderedList")} title="Numbered list">
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={insertLink} title="Link">
          <LinkIcon size={15} />
        </ToolbarButton>
        <span className="w-px h-5 bg-[#a65a4a]/20 mx-1" />
        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Insert image">
          <ImagePlus size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={insertDivider} title="Divider">
          <Minus size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggleBlock("p")} title="Clear formatting">
          <Eraser size={15} />
        </ToolbarButton>
      </div>

      {/* Editable surface */}
      <div className="blog-editor-surface border border-[#a65a4a]/30 rounded-b-lg bg-white px-5 py-4">
        {bubble && (
          <div
            className="absolute z-30 flex items-center gap-0.5 bg-[#1e1e1e] rounded-lg px-1 py-1 shadow-lg -translate-x-1/2"
            style={{ top: bubble.top, left: bubble.left }}
          >
            <BubbleButton onClick={() => exec("bold")} title="Bold">
              <Bold size={13} />
            </BubbleButton>
            <BubbleButton onClick={() => exec("italic")} title="Italic">
              <Italic size={13} />
            </BubbleButton>
            <BubbleButton onClick={() => exec("underline")} title="Underline">
              <Underline size={13} />
            </BubbleButton>
            <span className="w-px h-4 bg-white/20 mx-0.5" />
            <BubbleButton onClick={() => toggleBlock("h2")} title="Heading">
              <Heading2 size={13} />
            </BubbleButton>
            <BubbleButton onClick={() => toggleBlock("h3")} title="Subheading">
              <Heading3 size={13} />
            </BubbleButton>
            <BubbleButton onClick={() => toggleBlock("blockquote")} title="Quote">
              <Quote size={13} />
            </BubbleButton>
            <BubbleButton onClick={insertLink} title="Link">
              <LinkIcon size={13} />
            </BubbleButton>
          </div>
        )}

        {plusPos && (
          <div className="absolute z-30" style={{ top: plusPos.top, left: -6 }}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setInsertMenuOpen((s) => !s);
              }}
              className="size-7 flex items-center justify-center rounded-full border border-[#a65a4a]/40 bg-white text-[#a65a4a] hover:bg-[#a65a4a]/10 transition-colors cursor-pointer shadow-sm"
              title="Add image, quote, or divider"
            >
              <Plus size={14} className={insertMenuOpen ? "rotate-45 transition-transform" : "transition-transform"} />
            </button>
            {insertMenuOpen && (
              <div className="absolute top-9 left-0 bg-white border border-[#a65a4a]/20 rounded-lg shadow-lg py-1 flex flex-col min-w-[190px] font-['Inter',sans-serif]">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setInsertMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#1e1e1e] hover:bg-[#a65a4a]/5 cursor-pointer text-left"
                >
                  <ImagePlus size={14} className="text-[#a65a4a]" /> Upload image
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setInsertMenuOpen(false);
                    insertImageFromUrl();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#1e1e1e] hover:bg-[#a65a4a]/5 cursor-pointer text-left"
                >
                  <ImagePlus size={14} className="text-[#a65a4a]" /> Image from URL
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setInsertMenuOpen(false);
                    toggleBlock("blockquote");
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#1e1e1e] hover:bg-[#a65a4a]/5 cursor-pointer text-left"
                >
                  <Quote size={14} className="text-[#a65a4a]" /> Quote
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setInsertMenuOpen(false);
                    insertDivider();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#1e1e1e] hover:bg-[#a65a4a]/5 cursor-pointer text-left"
                >
                  <Minus size={14} className="text-[#a65a4a]" /> Divider
                </button>
              </div>
            )}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          onDoubleClick={handleEditorDoubleClick}
          data-placeholder={placeholder}
          className="blog-rich-content focus:outline-none"
        />
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChosen} />

      {cropTarget && (
        <ImageCropModal
          src={cropTarget.src}
          onCancel={() => setCropTarget(null)}
          onConfirm={handleCropConfirm}
        />
      )}

      <p className="font-['Inter',sans-serif] text-[11px] text-[#1e1e1e]/40 mt-1.5">
        Select any text to format it. Click the <span className="font-semibold">+</span> next to an empty line to
        insert an image, quote, or divider — just like Medium. Double-click any image in your story to re-crop it.
      </p>
    </div>
  );
}
