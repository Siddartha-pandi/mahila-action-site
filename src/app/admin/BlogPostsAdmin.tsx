import { useState } from "react";
import { toast } from "sonner";
import { Globe, EyeOff } from "lucide-react";
import { AdminListEditor, GalleryField, ImageField, TagsField, inputBase, labelBase } from "../adminWidgets";
import { BlogContentEditor } from "../BlogContentEditor";
import { BlogPost, Category, newBlogPost, saveBlogPost, deleteBlogPost, findCategory } from "../../lib/data";

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
  const [activeId, setActiveId] = useState<string | null>(filtered[0]?.id ? String(filtered[0].id) : null);
  const active = posts.find((p) => String(p.id) === String(activeId) && p.section === section) ?? filtered[0] ?? null;
  const usesCategories = section === "story" || section === "impact";
  const sectionNoun = section === "story" ? "Story" : section === "impact" ? "Impact page" : "Event blog";

  function update(patch: Partial<BlogPost>) {
    if (!active) return;
    const updated = { ...active, ...patch };
    onChange(posts.map((p) => (String(p.id) === String(active.id) ? updated : p)));
  }

  function handleAdd() {
    const post = newBlogPost(section, usesCategories ? categories[0]?.id ?? null : null);
    onChange([...posts, post]);
    setActiveId(post.id);
  }

  async function handleDelete(id: string) {
    await deleteBlogPost(id);
    const next = posts.filter((p) => String(p.id) !== String(id));
    onChange(next);
    if (String(activeId) === String(id)) setActiveId(next.filter((p) => p.section === section)[0]?.id ? String(next.filter((p) => p.section === section)[0].id) : null);
    toast.success(`${sectionNoun} deleted successfully.`);
  }

  async function handleTogglePublish(targetPost?: BlogPost) {
    const post = targetPost || active;
    if (!post) return;
    const nextPublished = post.published === false;
    const updated = { ...post, published: nextPublished };
    onChange(posts.map((p) => (String(p.id) === String(post.id) ? updated : p)));
    await saveBlogPost(updated);
    if (nextPublished) {
      toast.success(`"${post.title}" is now Published and live on the website!`);
    } else {
      toast.success(`"${post.title}" is now Unpublished (Draft) and hidden from the website.`);
    }
  }

  async function handleSave(forcePublished?: boolean) {
    if (!active) return;
    const postToSave = forcePublished !== undefined ? { ...active, published: forcePublished } : active;
    if (forcePublished !== undefined) {
      update({ published: forcePublished });
    }
    const ok = await saveBlogPost(postToSave);
    const isPub = postToSave.published !== false;
    if (ok) {
      toast.success(`${sectionNoun} saved as ${isPub ? "Published (Live)" : "Draft"}!`);
    } else {
      toast.error(`Failed to save ${sectionNoun.toLowerCase()}.`);
    }
  }

  return (
    <AdminListEditor
      items={filtered}
      activeId={activeId}
      onSelect={setActiveId}
      onAdd={handleAdd}
      onDelete={handleDelete}
      itemLabel={(p) => p.title}
      itemSubLabel={(p) => {
        const catOrDate = usesCategories
          ? findCategory(categories, p.categoryId)?.name ?? "Uncategorized"
          : new Date(p.createdAt).toLocaleDateString();
        return `${p.published === false ? "⚠️ [Draft] • " : "🟢 "}${catOrDate}`;
      }}
      itemAction={(p) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleTogglePublish(p);
          }}
          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
            p.published !== false
              ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
              : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
          }`}
          title={p.published !== false ? "Live on website. Click to unpublish." : "Draft. Click to publish."}
        >
          {p.published !== false ? <Globe size={11} className="text-emerald-600" /> : <EyeOff size={11} className="text-amber-600" />}
          <span>{p.published !== false ? "Live" : "Draft"}</span>
        </button>
      )}
      addLabel={section === "story" ? "Add New Story" : section === "impact" ? "Add New Impact Story" : "Add New Event Blog"}
      emptyLabel="Nothing here yet."
    >
      {!active ? (
        <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[14px]">Select or add a post to edit it.</p>
      ) : (
        <div className="flex flex-col gap-5 max-w-[640px]">
          {/* Publication Status Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[#a65a4a]/20 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div
                className={`size-3 rounded-full shrink-0 ${
                  active.published !== false
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-['Fraunces',serif] text-[15px] font-semibold text-[#1e1e1e]">
                    {active.published !== false ? "Published & Live" : "Draft (Unpublished)"}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                      active.published !== false
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {active.published !== false ? "Live on Web" : "Draft"}
                  </span>
                </div>
                <p className="font-['Inter',sans-serif] text-[11px] text-[#1e1e1e]/55 mt-0.5">
                  {active.published !== false
                    ? "Visible to public visitors across stories, homepage, and blogs."
                    : "Hidden from public visitors. Only visible to administrators in CMS."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {active.published !== false ? (
                <button
                  type="button"
                  onClick={() => handleTogglePublish(active)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                  title="Unpublish this post to hide it from visitors"
                >
                  <EyeOff size={14} className="text-amber-600" />
                  <span>Unpublish (Draft)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTogglePublish(active)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm"
                  title="Publish this post to make it live for visitors"
                >
                  <Globe size={14} />
                  <span>Publish Post</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className={labelBase}>Title</label>
            <input value={active.title} onChange={(e) => update({ title: e.target.value })} className={inputBase} />
          </div>
          {usesCategories && (
            <div>
              <label className={labelBase}>Category</label>
              <select
                value={findCategory(categories, active.categoryId)?.id ?? (active.categoryId ? String(active.categoryId) : "")}
                onChange={(e) => update({ categoryId: e.target.value || null })}
                className={`${inputBase} cursor-pointer`}
              >
                {categories.length === 0 && <option value="">No categories yet</option>}
                {categories.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className={labelBase}>Card Excerpt (shown on the card, keep it short)</label>
            <textarea value={active.excerpt} onChange={(e) => update({ excerpt: e.target.value })} rows={2} className={`${inputBase} resize-y`} />
          </div>
          <TagsField label="Tags" value={active.tags ?? []} onChange={(v) => update({ tags: v })} />
          <ImageField label="Cover Image" value={active.coverImage} onChange={(v) => update({ coverImage: v })} />
          <div>
            <label className={labelBase}>Full {section === "impact" ? "Page" : "Blog"} Content</label>
            <BlogContentEditor key={active.id} value={active.content} onChange={(html) => update({ content: html })} />
          </div>
          <GalleryField label="Gallery Images (optional — add as many as you like)" value={active.gallery} onChange={(v) => update({ gallery: v })} />
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

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleSave()}
              className="bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-[#993925] transition-colors cursor-pointer"
            >
              {active.published !== false ? "Save Changes" : "Save as Draft"}
            </button>

            {active.published === false ? (
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white font-['Inter',sans-serif] font-semibold text-[14px] px-6 py-2.5 rounded-full hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm"
              >
                <Globe size={15} />
                <span>Publish & Save</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-300 font-['Inter',sans-serif] font-semibold text-[13px] px-5 py-2.5 rounded-full hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <EyeOff size={14} className="text-amber-700" />
                <span>Unpublish (Move to Draft)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </AdminListEditor>
  );
}
