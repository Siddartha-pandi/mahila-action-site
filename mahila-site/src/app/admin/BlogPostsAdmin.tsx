"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AdminListEditor, GalleryField, ImageField, TagsField, inputBase, labelBase } from "../adminWidgets";
import { BlogContentEditor } from "../BlogContentEditor";
import { BlogPost, Category, newBlogPost, saveBlogPost, deleteBlogPost } from "../../lib/data";
import { getStoredContentTypes, isSystemDefaultField, FieldDefinition } from "../../lib/contentTypeRegistry";
import { moveToRecycleBin } from "../../lib/recycleBin";

export function BlogPostsAdmin({
  section,
  posts,
  categories,
  onChange,
}: {
  section: "story" | "event" | "impact";
  posts: BlogPost[];
  categories: Category[];
  onChange: (next: BlogPost[]) => void;
}) {
  const filtered = posts.filter((p) => p.section === section);
  const [activeId, setActiveId] = useState<string | null>(filtered[0]?.id ?? null);
  const active = posts.find((p) => p.id === activeId) ?? null;
  const usesCategories = section === "story" || section === "impact";
  const sectionNoun = section === "story" ? "Story" : section === "impact" ? "Impact page" : "Event blog";

  // Load Content-Type Builder schema for Blog Posts / Stories
  const blogModel = useMemo(() => {
    const models = getStoredContentTypes();
    return models.find((m) => m.uid === "api::blog-post.blog-post") || models[0];
  }, []);

  const userEditableFields = useMemo(() => {
    return (blogModel?.fields || []).filter((f) => !isSystemDefaultField(f.name));
  }, [blogModel]);

  const fieldsWithRowId = useMemo(() => {
    let currentMaxRow = 0;
    return userEditableFields.map((f) => {
      if (f.rowId === undefined || f.rowId === null) {
        currentMaxRow += 1;
        return { ...f, rowId: currentMaxRow };
      }
      currentMaxRow = Math.max(currentMaxRow, f.rowId);
      return f;
    });
  }, [userEditableFields]);

  const rowGroups = useMemo(() => {
    const map = new Map<number, FieldDefinition[]>();
    fieldsWithRowId.forEach((f) => {
      const rId = f.rowId || 1;
      if (!map.has(rId)) map.set(rId, []);
      map.get(rId)!.push(f);
    });
    return Array.from(map.entries()).map(([rowId, fields]) => ({ rowId, fields }));
  }, [fieldsWithRowId]);

  function update(patch: Partial<BlogPost>) {
    if (!active) return;
    onChange(posts.map((p) => (p.id === active.id ? { ...p, ...patch } : p)));
  }

  function handleAdd() {
    const post = newBlogPost(section, usesCategories ? categories[0]?.id ?? null : null);
    onChange([...posts, post]);
    setActiveId(post.id);
  }

  async function handleDelete(id: string) {
    const target = posts.find((p) => p.id === id);
    if (target) {
      moveToRecycleBin("story", target.title, target);
    }
    await deleteBlogPost(id);
    const next = posts.filter((p) => p.id !== id);
    onChange(next);
    if (activeId === id) setActiveId(next.filter((p) => p.section === section)[0]?.id ?? null);
    toast.success(`'${target?.title || sectionNoun}' moved to Recycle Bin.`);
  }

  async function handleSave() {
    if (!active) return;
    await saveBlogPost(active);
    toast.success(`${sectionNoun} saved and published!`);
  }

  function renderFieldControl(f: FieldDefinition) {
    if (!active) return null;
    const key = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (key === "title") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>{f.description || "Title"}</label>
          <input value={active.title} onChange={(e) => update({ title: e.target.value })} className={inputBase} />
        </div>
      );
    }

    if ((key === "categoryid" || key === "category_id" || key === "category") && usesCategories) {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>Category</label>
          <select value={active.categoryId ?? ""} onChange={(e) => update({ categoryId: e.target.value || null })} className={`${inputBase} cursor-pointer`}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      );
    }

    if (key === "excerpt") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <label className={labelBase}>Card Excerpt (shown on card, keep short)</label>
          <textarea value={active.excerpt} onChange={(e) => update({ excerpt: e.target.value })} rows={2} className={`${inputBase} resize-y`} />
        </div>
      );
    }

    if (key === "tags") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <TagsField label="Tags" value={active.tags ?? []} onChange={(v) => update({ tags: v })} />
        </div>
      );
    }

    if (key === "coverimage" || key === "cover_image" || key === "image") {
      return (
        <div key={f.name} className="flex-1 min-w-[180px]">
          <ImageField label="Cover Image" value={active.coverImage} onChange={(v) => update({ coverImage: v })} />
        </div>
      );
    }

    if (key === "content") {
      return (
        <div key={f.name} className="w-full">
          <label className={labelBase}>Full {section === "impact" ? "Page" : "Blog"} Content</label>
          <BlogContentEditor key={active.id} value={active.content} onChange={(html) => update({ content: html })} />
        </div>
      );
    }

    if (key === "gallery") {
      return (
        <div key={f.name} className="w-full">
          <GalleryField label="Gallery Images (optional — add as many as you like)" value={active.gallery} onChange={(v) => update({ gallery: v })} />
        </div>
      );
    }

    if (key === "section") return null;

    return (
      <div key={f.name} className="flex-1 min-w-[180px]">
        <label className={labelBase}>{f.name}</label>
        <input placeholder={`Enter ${f.name}...`} className={inputBase} />
      </div>
    );
  }

  return (
    <AdminListEditor
      items={filtered}
      activeId={activeId}
      onSelect={setActiveId}
      onAdd={section === "impact" ? undefined : handleAdd}
      onDelete={section === "impact" ? undefined : handleDelete}
      itemLabel={(p) => p.title}
      itemSubLabel={(p) => (usesCategories ? categories.find((c) => c.id === p.categoryId)?.name ?? "Uncategorized" : new Date(p.createdAt).toLocaleDateString())}
      addLabel={section === "story" ? "Add New Story" : section === "impact" ? undefined : "Add New Event Blog"}
      emptyLabel="Nothing here yet."
    >
      {!active ? (
        <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[14px]">Select or add a post to edit it.</p>
      ) : (
        <div className="flex flex-col gap-5 max-w-[720px]">
          {/* Dynamically render row groups configured in Content-Type Builder */}
          {rowGroups.map((group) => (
            <div key={group.rowId} className="flex flex-col sm:flex-row gap-4 w-full items-start">
              {group.fields.map((f) => renderFieldControl(f))}
            </div>
          ))}

          {section === "event" && (
            <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/45 leading-relaxed">
              On the Events Blog reader, visitors can page between posts using Previous / Next, right below the gallery
              (only shown when a gallery is present).
            </p>
          )}
          {section === "impact" && (
            <p className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/45 leading-relaxed">
              This is the page visitors see when they hover an "Our Impact" card on the homepage and click "Read Story".
              There are always exactly 4 of these, matching the 4 homepage cards — they can be edited and updated here,
              but not added or removed. To keep the cards linked correctly, don't change the category assignment above.
            </p>
          )}
          <button onClick={handleSave} className="w-fit bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer mt-2">
            Save Post
          </button>
        </div>
      )}
    </AdminListEditor>
  );
}
