import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { inputBase, labelBase } from "../adminWidgets";
import {
  BlogPost,
  Category,
  newCategory,
  saveCategory,
  deleteCategory,
  reassignCategoryPosts,
  deleteCategoryPosts,
} from "../../lib/data";

export function CategoriesAdmin({
  categories,
  posts,
  onCategoriesChange,
  onPostsChange,
}: {
  categories: Category[];
  posts: BlogPost[];
  onCategoriesChange: (next: Category[]) => void;
  onPostsChange: (next: BlogPost[]) => void;
}) {
  const [nameDraft, setNameDraft] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<Category | null>(null);
  const [reassignTo, setReassignTo] = useState<string>("");
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);

  function draftFor(c: Category) {
    return nameDraft[c.id] ?? c.name;
  }

  async function handleAdd() {
    const cat = newCategory();
    await saveCategory(cat);
    onCategoriesChange([...categories, cat]);
    toast.success("Category created!");
  }

  async function handleRename(c: Category) {
    const name = (nameDraft[c.id] ?? c.name).trim();
    if (!name) return toast.error("Category name can't be empty");
    const updated = { ...c, name };
    await saveCategory(updated);
    onCategoriesChange(categories.map((x) => (x.id === c.id ? updated : x)));
    toast.success("Category updated");
  }

  function openRemove(c: Category) {
    setRemoving(c);
    setReassignTo("");
    setSelectedPostIds(postsIn(c.id).map((p) => p.id));
  }

  function postsIn(categoryId: string) {
    return posts.filter((p) => p.categoryId === categoryId);
  }

  async function confirmRemoveMoveAll() {
    if (!removing) return;
    if (!reassignTo) return toast.error("Choose a category to move the blogs to");
    const next = await reassignCategoryPosts(posts, removing.id, reassignTo);
    onPostsChange(next);
    const ok = await deleteCategory(removing.id);
    if (!ok) { toast.error("Failed to remove category — check the console for details."); return; }
    onCategoriesChange(categories.filter((c) => c.id !== removing.id));
    setRemoving(null);
    toast.success("Blogs moved and category removed");
  }

  async function confirmRemoveDeleteAll() {
    if (!removing) return;
    const next = await deleteCategoryPosts(posts, removing.id);
    onPostsChange(next);
    const ok = await deleteCategory(removing.id);
    if (!ok) { toast.error("Failed to remove category — check the console for details."); return; }
    onCategoriesChange(categories.filter((c) => c.id !== removing.id));
    setRemoving(null);
    toast.success("Category and its blogs removed");
  }

  return (
    <div className="max-w-[720px]">
      <button
        onClick={handleAdd}
        className="bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[13px] px-5 py-2.5 rounded-lg hover:bg-[#993925] transition-colors cursor-pointer mb-5"
      >
        + Add New Category
      </button>

      <div className="flex flex-col gap-3">
        {categories.map((c) => {
          const count = postsIn(c.id).length;
          return (
            <div key={c.id} className="border border-[#a65a4a]/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                value={draftFor(c)}
                onChange={(e) => setNameDraft((d) => ({ ...d, [c.id]: e.target.value }))}
                className={`${inputBase} sm:flex-1`}
              />
              <span className="font-['Inter',sans-serif] text-[12px] text-[#1e1e1e]/45 shrink-0">
                {count} {count === 1 ? "story" : "stories"}
                {count === 0 && " — viewers see “Something big is cooking!”"}
              </span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleRename(c)}
                  className="text-[13px] font-['Inter',sans-serif] font-medium text-[#a65a4a] border border-[#a65a4a]/30 px-4 py-2 rounded-lg hover:bg-[#a65a4a]/5 cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => openRemove(c)}
                  className="text-[13px] font-['Inter',sans-serif] font-medium text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
        {categories.length === 0 && (
          <p className="font-['Inter',sans-serif] text-[#1e1e1e]/40 text-[14px]">No categories yet — add one above.</p>
        )}
      </div>

      {/* Remove-category modal */}
      {removing && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Fraunces',serif] text-[#1e1e1e] text-[20px] font-semibold">Remove "{removing.name}"?</h3>
              <button onClick={() => setRemoving(null)} className="cursor-pointer text-[#1e1e1e]/50 hover:text-[#1e1e1e]"><X size={18} /></button>
            </div>
            {postsIn(removing.id).length === 0 ? (
              <>
                <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/70 mb-5">This category has no stories in it. It will be removed.</p>
                <button
                  onClick={confirmRemoveDeleteAll}
                  className="w-full bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] py-3 rounded-full hover:bg-[#993925] cursor-pointer"
                >
                  Remove Category
                </button>
              </>
            ) : (
              <>
                <p className="font-['Inter',sans-serif] text-[14px] text-[#1e1e1e]/70 mb-4">
                  This category has {postsIn(removing.id).length} {postsIn(removing.id).length === 1 ? "story" : "stories"}. What should happen to them?
                </p>
                <div className="mb-4">
                  <label className={labelBase}>Move stories to…</label>
                  <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className={`${inputBase} cursor-pointer`}>
                    <option value="">Choose a category…</option>
                    {categories.filter((c) => c.id !== removing.id).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={confirmRemoveMoveAll}
                    className="w-full bg-[#a65a4a] text-white font-['Inter',sans-serif] font-semibold text-[14px] py-3 rounded-full hover:bg-[#993925] cursor-pointer"
                  >
                    Move Stories &amp; Remove Category
                  </button>
                  <button
                    onClick={confirmRemoveDeleteAll}
                    className="w-full border border-red-300 text-red-600 font-['Inter',sans-serif] font-semibold text-[14px] py-3 rounded-full hover:bg-red-50 cursor-pointer"
                  >
                    Delete Stories &amp; Remove Category
                  </button>
                  <button
                    onClick={() => setRemoving(null)}
                    className="w-full text-[#1e1e1e]/50 font-['Inter',sans-serif] text-[13px] py-2 cursor-pointer hover:text-[#1e1e1e]"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
