import { useState } from "react";
import {
  Users,
  Shield,
  ShieldCheck,
  UserPlus,
  Edit,
  Trash2,
  Check,
  X,
  Search,
  Lock,
  Eye,
  Edit3,
  Key,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  AdminUser,
  AdminRole,
  AdminModule,
  MODULE_LABELS,
  getStoredAdminUsers,
  getStoredRoles,
  saveAdminUser,
  deleteAdminUser,
  saveRole,
  deleteRole,
  getCurrentAdminSession,
  setCurrentAdminSession,
  hasPermission,
} from "../../lib/permissions";
import { toast } from "sonner";

export function RolesAdmin({
  onSessionChange,
}: {
  onSessionChange?: (user: AdminUser) => void;
}) {
  const [activeTab, setActiveTab] = useState<"users" | "matrix">("users");
  const [users, setUsers] = useState<AdminUser[]>(() => getStoredAdminUsers());
  const [roles, setRoles] = useState<AdminRole[]>(() => getStoredRoles());
  const [currentSession, setCurrentSession] = useState<AdminUser>(() => getCurrentAdminSession());

  // Search & Filter
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<AdminUser> | null>(null);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);

  const isSuperAdmin = currentSession.roleId === "superadmin";
  const canEditRoles = hasPermission(currentSession, "roles", "edit");
  const canDeleteRoles = hasPermission(currentSession, "roles", "delete");

  function refreshData() {
    const updatedUsers = getStoredAdminUsers();
    const updatedRoles = getStoredRoles();
    const active = getCurrentAdminSession();
    setUsers(updatedUsers);
    setRoles(updatedRoles);
    setCurrentSession(active);
    if (onSessionChange) onSessionChange(active);
  }

  // ── User Handlers ─────────────────────────────────────────────────────────

  function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser?.email || !editingUser.name) {
      return toast.error("Please fill in both name and email.");
    }
    try {
      const saved = saveAdminUser({
        id: editingUser.id,
        name: editingUser.name,
        email: editingUser.email,
        roleId: editingUser.roleId || "user",
        status: editingUser.status || "Active",
      });
      toast.success(editingUser.id ? `Updated user ${saved.name}` : `Created user account for ${saved.name}`);
      setShowUserModal(false);
      setEditingUser(null);
      refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user account");
    }
  }

  function handleDeleteUser(user: AdminUser) {
    if (!canDeleteRoles) return toast.error("You do not have permission to delete user accounts.");
    if (user.roleId === "superadmin") return toast.error("The Super Admin account cannot be deleted.");
    if (user.id === currentSession.id) return toast.error("You cannot delete your own active user account.");
    if (!confirm(`Are you sure you want to delete admin account "${user.name}" (${user.email})?`)) return;

    try {
      deleteAdminUser(user.id);
      toast.success(`User ${user.name} removed.`);
      refreshData();
    } catch (err: any) {
      toast.error(err.message || "Cannot delete user.");
    }
  }

  // ── Role Matrix Handlers ──────────────────────────────────────────────────

  function handleTogglePermission(roleId: string, module: AdminModule, action: "view" | "edit" | "delete") {
    if (!canEditRoles) return toast.error("You do not have permission to modify roles.");
    if (roleId === "superadmin") {
      return toast.error("Super Admin permissions are locked to full access for security.");
    }

    const targetRole = roles.find(r => r.id === roleId);
    if (!targetRole) return;

    const currentPerm = targetRole.permissions[module]?.[action] || false;
    const updatedPermissions = {
      ...targetRole.permissions,
      [module]: {
        ...targetRole.permissions[module],
        [action]: !currentPerm,
        // If edit or delete is enabled, view must automatically be enabled
        view: (!currentPerm && (action === "edit" || action === "delete")) ? true : (action === "view" && currentPerm ? false : targetRole.permissions[module]?.view),
      },
    };

    // If view is toggled off, also turn off edit & delete
    if (action === "view" && currentPerm) {
      updatedPermissions[module] = { view: false, edit: false, delete: false };
    }

    const updatedRole: AdminRole = {
      ...targetRole,
      permissions: updatedPermissions,
    };

    saveRole(updatedRole);
    toast.success(`Updated ${targetRole.name} → ${MODULE_LABELS[module]} [${action.toUpperCase()}]`);
    refreshData();
  }

  function handleSaveCustomRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRole?.name) return toast.error("Role name is required.");

    try {
      saveRole(editingRole);
      toast.success(`Saved role "${editingRole.name}"`);
      setShowRoleModal(false);
      setEditingRole(null);
      refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save role.");
    }
  }

  function handleDeleteCustomRole(role: AdminRole) {
    if (!canDeleteRoles) return toast.error("You do not have permission to delete roles.");
    if (role.isSystem) return toast.error("System roles (Super Admin, Admin, User) cannot be deleted.");

    const assignedCount = users.filter(u => u.roleId === role.id).length;
    if (assignedCount > 0) {
      return toast.error(`Cannot delete role "${role.name}" because ${assignedCount} user(s) are assigned to it.`);
    }

    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) return;

    try {
      deleteRole(role.id);
      toast.success(`Role ${role.name} deleted.`);
      refreshData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete role.");
    }
  }

  // Helper styling for roles
  function getRoleBadgeLabel(roleId: string) {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : roleId;
  }

  function getRoleBadgeStyle(roleId: string) {
    switch (roleId) {
      case "superadmin":
        return "bg-amber-100 text-amber-900 border-amber-300 font-semibold";
      case "admin":
        return "bg-[#a65a4a]/10 text-[#a65a4a] border-[#a65a4a]/30 font-semibold";
      case "user":
        return "bg-slate-100 text-slate-700 border-slate-300 font-medium";
      default:
        return "bg-purple-100 text-purple-800 border-purple-300 font-medium";
    }
  }

  const filteredUsers = users.filter(u => {
    if (roleFilter !== "all" && u.roleId !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const inputBase = "w-full border border-[#a65a4a]/30 rounded-lg px-3 py-2 text-[14px] text-[#1e1e1e] focus:outline-none focus:border-[#a65a4a] font-['Inter',sans-serif] bg-white";

  return (
    <div className="space-y-6 font-['Inter',sans-serif]">
      {/* Top Banner: Active Session Context */}
      <div className="bg-white rounded-xl p-5 border border-[#a65a4a]/15 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#a65a4a] text-[#f4efe7] font-bold text-lg flex items-center justify-center shadow-md">
            {currentSession.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-['Fraunces',serif] text-[18px] font-semibold text-[#1e1e1e]">
                {currentSession.name}
              </h3>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(currentSession.roleId)}`}>
                {getRoleBadgeLabel(currentSession.roleId)}
              </span>
            </div>
            <p className="text-[12px] text-[#1e1e1e]/60 mt-0.5">
              Active Session Email: <span className="font-mono text-[#a65a4a] font-medium">{currentSession.email}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between border-b border-[#a65a4a]/20 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-[13px] transition-colors cursor-pointer ${
              activeTab === "users"
                ? "bg-[#a65a4a] text-white shadow-sm font-semibold"
                : "bg-white text-[#1e1e1e]/70 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a]"
            }`}
          >
            <Users className="w-4 h-4" />
            User Accounts ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-[13px] transition-colors cursor-pointer ${
              activeTab === "matrix"
                ? "bg-[#a65a4a] text-white shadow-sm font-semibold"
                : "bg-white text-[#1e1e1e]/70 hover:bg-[#a65a4a]/10 hover:text-[#a65a4a]"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Roles & Permissions Matrix ({roles.length})
          </button>
        </div>

        {activeTab === "users" && (
          <button
            onClick={() => {
              if (!canEditRoles) return toast.error("Permission denied.");
              setEditingUser({ roleId: "user", status: "Active" });
              setShowUserModal(true);
            }}
            disabled={!canEditRoles}
            className="flex items-center gap-2 bg-[#a65a4a] text-white px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            Add Admin User
          </button>
        )}

        {activeTab === "matrix" && (
          <button
            onClick={() => {
              if (!canEditRoles) return toast.error("Permission denied.");
              setEditingRole({
                id: `custom_${Date.now()}`,
                name: "",
                description: "",
                permissions: {
                  submissions: { view: true, edit: false, delete: false },
                  events: { view: true, edit: false, delete: false },
                  stories: { view: true, edit: false, delete: false },
                  impactStories: { view: true, edit: false, delete: false },
                  categories: { view: true, edit: false, delete: false },
                  eventsBlog: { view: true, edit: false, delete: false },
                  councilors: { view: true, edit: false, delete: false },
                  timeline: { view: true, edit: false, delete: false },
                  contact: { view: true, edit: false, delete: false },
                  roles: { view: false, edit: false, delete: false },
                },
              });
              setShowRoleModal(true);
            }}
            disabled={!canEditRoles}
            className="flex items-center gap-2 bg-[#a65a4a] text-white px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Shield className="w-4 h-4" />
            Create Custom Role
          </button>
        )}
      </div>

      {/* ── USER ACCOUNTS TAB ──────────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-[#a65a4a]/15 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#1e1e1e]/40" />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#a65a4a]"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#a65a4a] bg-white"
            >
              <option value="all">All Roles</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-xl border border-[#a65a4a]/15 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#f0ebe3] text-[#1e1e1e]/70 uppercase text-[11px] font-semibold tracking-wider border-b border-[#a65a4a]/15">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Created Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-[#1e1e1e]/50">
                        No admin user accounts found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] font-bold text-sm flex items-center justify-center">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-[#1e1e1e]">{u.name}</p>
                              <p className="text-[12px] text-[#1e1e1e]/50 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] border ${getRoleBadgeStyle(u.roleId)}`}>
                            {getRoleBadgeLabel(u.roleId)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                            u.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === "Active" ? "bg-emerald-500" : "bg-gray-400"}`} />
                            {u.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[#1e1e1e]/60 text-[12px]">
                          {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setShowUserModal(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-[#a65a4a] hover:bg-[#a65a4a]/10 rounded-lg transition-colors cursor-pointer"
                              title="Edit user role or status"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={u.roleId === "superadmin" || u.id === currentSession.id || !canDeleteRoles}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={u.roleId === "superadmin" ? "The Super Admin account cannot be deleted" : "Delete user account"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PERMISSIONS MATRIX TAB ─────────────────────────────────────────── */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[13px] text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Granular Access Control Rules:</p>
              <p className="mt-0.5 text-amber-800/90">
                • <strong>Super Admin</strong> retains full access across all modules.<br />
                • <strong>Admin</strong> has full CRUD permissions across content modules by default.<br />
                • <strong>User (Staff)</strong> provides read-only view access across modules.<br />
                • Toggling <strong>EDIT</strong> or <strong>DELETE</strong> automatically ensures <strong>VIEW</strong> permission is enabled.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#a65a4a]/15 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="bg-[#f0ebe3] border-b border-[#a65a4a]/15">
                    <th className="px-5 py-4 font-['Fraunces',serif] text-[15px] font-semibold text-[#1e1e1e] min-w-[240px]">
                      Module / Section
                    </th>
                    {roles.map((r) => (
                      <th key={r.id} className="px-4 py-4 min-w-[180px] text-center border-l border-gray-200/80">
                        <div className="flex flex-col items-center">
                          <span className={`px-3 py-1 rounded-full text-[11px] border mb-1 ${getRoleBadgeStyle(r.id)}`}>
                            {r.name}
                          </span>
                          <span className="text-[11px] font-normal text-[#1e1e1e]/50">
                            {users.filter(u => u.roleId === r.id).length} User(s)
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(Object.keys(MODULE_LABELS) as AdminModule[]).map((modKey) => (
                    <tr key={modKey} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3.5 font-medium text-[#1e1e1e]">
                        {MODULE_LABELS[modKey]}
                      </td>
                      {roles.map((r) => {
                        const perm = r.permissions[modKey] || { view: false, edit: false, delete: false };
                        const isSuper = r.id === "superadmin";

                        return (
                          <td key={r.id} className="px-3 py-3 border-l border-gray-100 text-center">
                            <div className="flex items-center justify-center gap-3 text-[11px]">
                              {/* View */}
                              <label className={`flex items-center gap-1 cursor-pointer ${isSuper ? "opacity-70" : ""}`} title="View Access">
                                <input
                                  type="checkbox"
                                  checked={perm.view}
                                  disabled={isSuper || !canEditRoles}
                                  onChange={() => handleTogglePermission(r.id, modKey, "view")}
                                  className="rounded text-[#a65a4a] focus:ring-[#a65a4a] cursor-pointer"
                                />
                                <span className={perm.view ? "text-emerald-700 font-semibold" : "text-gray-400"}>View</span>
                              </label>

                              {/* Edit */}
                              <label className={`flex items-center gap-1 cursor-pointer ${isSuper ? "opacity-70" : ""}`} title="Edit Access">
                                <input
                                  type="checkbox"
                                  checked={perm.edit}
                                  disabled={isSuper || !canEditRoles}
                                  onChange={() => handleTogglePermission(r.id, modKey, "edit")}
                                  className="rounded text-[#a65a4a] focus:ring-[#a65a4a] cursor-pointer"
                                />
                                <span className={perm.edit ? "text-[#a65a4a] font-semibold" : "text-gray-400"}>Edit</span>
                              </label>

                              {/* Delete */}
                              <label className={`flex items-center gap-1 cursor-pointer ${isSuper ? "opacity-70" : ""}`} title="Delete Access">
                                <input
                                  type="checkbox"
                                  checked={perm.delete}
                                  disabled={isSuper || !canEditRoles}
                                  onChange={() => handleTogglePermission(r.id, modKey, "delete")}
                                  className="rounded text-[#a65a4a] focus:ring-[#a65a4a] cursor-pointer"
                                />
                                <span className={perm.delete ? "text-red-700 font-semibold" : "text-gray-400"}>Del</span>
                              </label>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT USER MODAL ─────────────────────────────────────────── */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-[440px] w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-['Fraunces',serif] text-[18px] font-semibold text-[#1e1e1e]">
                {editingUser?.id ? "Edit Admin User Account" : "Add New Admin User"}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-[13px]">
              <div>
                <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Rao"
                  value={editingUser?.name || ""}
                  onChange={e => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ananya@mahilaaction.org"
                  value={editingUser?.email || ""}
                  onChange={e => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                  className={inputBase}
                />
              </div>

              {editingUser?.roleId === "superadmin" ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[12px] text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Super Admin role and Active status are locked for system security.</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Assigned Role</label>
                    <select
                      value={editingUser?.roleId || "user"}
                      onChange={e => setEditingUser(prev => ({ ...prev, roleId: e.target.value }))}
                      className={inputBase}
                    >
                      {roles.filter(r => r.id !== "superadmin").map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} — ({r.description})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Account Status</label>
                    <select
                      value={editingUser?.status || "Active"}
                      onChange={e => setEditingUser(prev => ({ ...prev, status: e.target.value as any }))}
                      className={inputBase}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#a65a4a] text-white font-semibold hover:bg-[#993925] text-[13px]"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE CUSTOM ROLE MODAL ───────────────────────────────────────── */}
      {showRoleModal && editingRole && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-[500px] w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-['Fraunces',serif] text-[18px] font-semibold text-[#1e1e1e]">
                Create Custom Admin Role
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomRole} className="space-y-4 text-[13px]">
              <div>
                <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Submissions Coordinator"
                  value={editingRole.name}
                  onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Brief role summary..."
                  value={editingRole.description}
                  onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                  className={inputBase}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 rounded-lg border text-gray-600 hover:bg-gray-50 text-[13px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#a65a4a] text-white font-semibold hover:bg-[#993925] text-[13px]"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
