"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { inter } from "../components/shared/styleHelpers";

export function CampaignsAdmin() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/campaigns');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (!mounted) return;
        setCampaigns(data || []);
      } catch (err) {
        toast.error('Could not load campaigns');
      } finally { setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Create new campaign
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newGoal, setNewGoal] = useState<number | "">("");

  function startEdit(i: number) {
    setEditingIdx(i);
    setDraft({ ...campaigns[i] });
  }

  function cancelEdit() {
    setEditingIdx(null);
    setDraft(null);
  }

  async function saveEdit() {
    if (!draft) return;
    try {
      const res = await fetch('/api/campaigns', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Save failed');
      const copy = campaigns.slice();
      const idx = copy.findIndex(c => c.id === draft.id);
      if (idx !== -1) copy[idx] = data.campaign;
      setCampaigns(copy);
      toast.success('Saved');
      cancelEdit();
      window.dispatchEvent(new Event('mahila_campaigns_changed'));
    } catch (err: any) {
      toast.error(err?.message || 'Save failed');
    }
  }

  async function createCampaign() {
    if (!newId.trim()) return toast.error('Campaign id is required');
    try {
      const body = { id: newId.trim(), name: newName.trim() || newId.trim(), tag: newTag.trim() || 'General', goal: Number(newGoal || 0) };
      const res = await fetch('/api/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Create failed');
      setCampaigns((c) => [data.campaign, ...(c || [])]);
      setNewId(''); setNewName(''); setNewTag(''); setNewGoal('');
      toast.success('Campaign created');
      window.dispatchEvent(new Event('mahila_campaigns_changed'));
    } catch (err: any) {
      toast.error(err?.message || 'Create failed');
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign? This action cannot be undone.')) return;
    try {
      const res = await fetch('/api/campaigns', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      setCampaigns((c) => c.filter(x => x.id !== id));
      toast.success('Deleted');
      window.dispatchEvent(new Event('mahila_campaigns_changed'));
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    }
  }

  if (loading) return <p className={`${inter()} text-[14px]`}>Loading...</p>;

  return (
    <div>
      {/* Create new campaign */}
      <div className="bg-white p-4 rounded-2xl border border-[#a65a4a]/10 mb-6">
        <h3 className="font-semibold mb-3">Create New Campaign</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input placeholder="id (slug)" value={newId} onChange={e => setNewId(e.target.value)} className="p-2 border" />
          <input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} className="p-2 border" />
          <input placeholder="Tag" value={newTag} onChange={e => setNewTag(e.target.value)} className="p-2 border" />
          <input placeholder="Goal (₹)" value={newGoal as any} onChange={e => setNewGoal(e.target.value ? Number(e.target.value) : '')} className="p-2 border" />
        </div>
        <div className="mt-3">
          <button onClick={createCampaign} className="px-4 py-2 bg-[#a65a4a] text-[#f4efe7] rounded-full">Create Campaign</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {campaigns.map((c, i) => (
          <div key={c.id} className="bg-white p-4 rounded-2xl border border-[#a65a4a]/10">
            {editingIdx === i ? (
              <div className="flex flex-col gap-3">
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="w-full p-2 border" />
                <input value={draft.tag} onChange={e => setDraft({ ...draft, tag: e.target.value })} className="w-full p-2 border" />
                <input value={draft.raised} onChange={e => setDraft({ ...draft, raised: Number(e.target.value) })} className="w-full p-2 border" />
                <input value={draft.goal} onChange={e => setDraft({ ...draft, goal: Number(e.target.value) })} className="w-full p-2 border" />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="px-4 py-2 bg-[#a65a4a] text-[#f4efe7] rounded-full">Save</button>
                  <button onClick={cancelEdit} className="px-4 py-2 border rounded-full">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-sm text-[#666]">{c.tag}</p>
                </div>
                <div className="flex flex-col items-end">
                  <p className="font-semibold">₹{Number(c.raised).toLocaleString('en-IN')}</p>
                  <p className="text-sm text-[#666]">Goal: ₹{Number(c.goal).toLocaleString('en-IN')}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => startEdit(i)} className="px-3 py-1 border rounded-full">Edit</button>
                    <button onClick={() => deleteCampaign(c.id)} className="px-3 py-1 border rounded-full text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
