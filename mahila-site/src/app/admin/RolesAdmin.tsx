import { useState, useEffect } from "react";
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
  getStoredRoles,
  getRoleById,
  saveRole,
  deleteRole,
  getCurrentAdminSession,
  setCurrentAdminSession,
  hasPermission,
} from "../../lib/permissions";

import { api } from "../../lib/api";
import { toast } from "sonner";

export function RolesAdmin({
  onSessionChange,
}: {
  onSessionChange?: (user: AdminUser) => void;
}) {
  const [activeTab, setActiveTab] = useState<"users" | "matrix">("users");
  const [roles, setRoles] = useState<AdminRole[]>(() => getStoredRoles());
  const [currentSession, setCurrentSession] = useState<AdminUser>(() => getCurrentAdminSession());

  // Database Users from PostgreSQL users table
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);

  const isSuperAdmin = currentSession.roleId === "superadmin";
  const canEditRoles = hasPermission(currentSession, "roles", "edit");
  const canDeleteRoles = hasPermission(currentSession, "roles", "delete");

  async function fetchDbUsers() {
    setDbLoading(true);
    setDbError(null);
    try {
      const res = await api.get<any[]>("/api/members");
      if (res.ok && Array.isArray(res.data)) {
        setDbUsers(res.data);
      } else {
        setDbError(res.error || "Failed to fetch user accounts.");
      }
    } catch (err: any) {
      setDbError("Could not load user accounts from database.");
    } finally {
      setDbLoading(false);
    }
  }

  useEffect(() => {
    fetchDbUsers();
  }, []);

  function refreshData() {
    const updatedRoles = getStoredRoles();
    const active = getCurrentAdminSession();
    setRoles(updatedRoles);
    setCurrentSession(active);
    fetchDbUsers();
    if (onSessionChange) onSessionChange(active);
  }

  // ── Database User Handlers ─────────────────────────────────────────────────────────

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser?.email || !editingUser?.name) {
      return toast.error("Please fill in both name and email.");
    }

    try {
      const payload: any = {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        role: editingUser.role || "user",
        kind: editingUser.kind || null,
        status: editingUser.status || "Active",
        skills: editingUser.skills,
        permissions: editingUser.permissions ?? null,
      };

      if (editingUser.id) {
        // Edit existing DB user
        const res = await api.patch(`/api/members/${editingUser.id}`, payload);
        if (!res.ok) throw new Error(res.error || "Failed to update user account.");
        toast.success(`Updated user ${editingUser.name}`);
      } else {
        // Create new user account
        payload.password = editingUser.password || "123456";
        const res = await api.post("/api/members", payload);
        if (!res.ok) throw new Error(res.error || "Failed to create user account.");
        toast.success(`Created user account for ${editingUser.name}`);
      }
      setShowUserModal(false);
      setEditingUser(null);
      fetchDbUsers();
    } catch (err: any) {

      toast.error(err.message || "Failed to save user account");
    }
  }

  async function handleDeleteUser(user: any) {
    if (!canDeleteRoles) return toast.error("You do not have permission to delete user accounts.");
    if (user.role === "superadmin" || user.roleId === "superadmin") return toast.error("The Super Admin account cannot be deleted.");
    if (user.email === currentSession.email) return toast.error("You cannot delete your own active user account.");
    if (!confirm(`Are you sure you want to delete user account "${user.name}" (${user.email})?`)) return;

    try {
      const res = await api.del(`/api/members/${user.id}`);
      if (!res.ok) throw new Error(res.error || "Cannot delete user.");
      toast.success(`User ${user.name} removed.`);
      fetchDbUsers();
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
        view: (!currentPerm && (action === "edit" || action === "delete")) ? true : (action === "view" && currentPerm ? false : targetRole.permissions[module]?.view),
      },
    };

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

    const assignedCount = dbUsers.filter(u => u.role === role.id).length;
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
    switch (roleId) {
      case "superadmin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "staff":
        return "Staff";
      case "volunteer":
        return "Volunteer";
      case "vendor":
        return "Vendor";
      case "attendee":
        return "Attendee";
      case "member":
      case "user":
      default:
        return "User";
    }
  }

  function getRoleBadgeStyle(roleId: string) {
    switch (roleId) {
      case "superadmin":
        return "bg-amber-100 text-amber-900 border-amber-300 font-semibold";
      case "admin":
        return "bg-[#a65a4a]/10 text-[#a65a4a] border-[#a65a4a]/30 font-semibold";
      case "staff":
        return "bg-sky-100 text-sky-800 border-sky-300 font-semibold";
      case "volunteer":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 font-medium";
      case "vendor":
        return "bg-blue-100 text-blue-800 border-blue-300 font-medium";
      case "attendee":
        return "bg-purple-100 text-purple-800 border-purple-300 font-medium";
      case "member":
      case "user":
      default:
        return "bg-slate-100 text-slate-700 border-slate-300 font-medium";
    }
  }

  const filteredUsers = dbUsers.filter(u => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q);
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
            User Accounts ({dbUsers.length})
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
              setEditingUser({ role: "admin", status: "Active" });
              setShowUserModal(true);
            }}
            disabled={!canEditRoles}
            className="flex items-center gap-2 bg-[#a65a4a] text-white px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-[#993925] transition-colors cursor-pointer disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            Add User Account
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
                  contentTypeBuilder: { view: true, edit: false, delete: false },
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
          {/* Filters & Refresh */}
          <div className="bg-white p-4 rounded-xl border border-[#a65a4a]/15 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#1e1e1e]/40" />
                <input
                  type="text"
                  placeholder="Search user by name, email or phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#a65a4a]"
                />
              </div>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#a65a4a] bg-white cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="superadmin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="user">User</option>
                <option value="volunteer">Volunteer</option>
                <option value="vendor">Vendor</option>
                <option value="attendee">Attendee</option>
              </select>
            </div>
            <button
              onClick={fetchDbUsers}
              disabled={dbLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#a65a4a] hover:bg-[#a65a4a]/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dbLoading ? "animate-spin" : ""}`} />
              Refresh Users
            </button>
          </div>

          {/* Unified Database User Accounts Table */}
          <div className="bg-white rounded-xl border border-[#a65a4a]/15 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-[#f0ebe3] text-[#1e1e1e]/70 uppercase text-[11px] font-semibold tracking-wider border-b border-[#a65a4a]/15">
                  <tr>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Account Role</th>
                    <th className="px-5 py-3.5">Kind (Participation)</th>
                    <th className="px-5 py-3.5">Phone</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Created Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dbLoading ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-[#1e1e1e]/40 text-[13px]">
                        Loading user accounts…
                      </td>
                    </tr>
                  ) : dbError ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-6 text-center text-red-500 text-[13px]">
                        {dbError}
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-[#1e1e1e]/50">
                        No user accounts found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#a65a4a]/10 text-[#a65a4a] font-bold text-sm flex items-center justify-center">
                              {(u.name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-[#1e1e1e]">{u.name}</p>
                              <p className="text-[12px] text-[#1e1e1e]/50 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] border ${getRoleBadgeStyle(u.role)}`}>
                              {getRoleBadgeLabel(u.role)}
                            </span>
                            {u.permissions && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-900 border border-purple-300 font-semibold">
                                <ShieldCheck className="w-3 h-3 text-purple-700" />
                                Custom Perms
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {u.kind ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] border bg-emerald-50 text-emerald-800 border-emerald-200 capitalize font-medium">
                              {u.kind}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[12px]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-[#1e1e1e]/70 text-[12px] font-mono">
                          {u.phone || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full ${
                            u.status === "Active" || u.status === "Completed" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === "Active" || u.status === "Completed" ? "bg-emerald-500" : "bg-gray-400"}`} />
                            {u.status || "Active"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[#1e1e1e]/60 text-[12px]">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.role !== "superadmin" && (
                              <button
                                onClick={() => {
                                  const basePerms = u.permissions || getRoleById(u.role).permissions;
                                  setEditingUser({ ...u, permissions: JSON.parse(JSON.stringify(basePerms)) });
                                  setShowUserModal(true);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-pointer"
                                title="Customize individual user permissions"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Permissions
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setShowUserModal(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-[#a65a4a] hover:bg-[#a65a4a]/10 rounded-lg transition-colors cursor-pointer"
                              title="Edit user account details"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={u.role === "superadmin" || u.email === currentSession.email || !canDeleteRoles}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={u.role === "superadmin" ? "The Super Admin account cannot be deleted" : "Delete user account"}
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
                • <strong>Super Admin</strong> retains unrestricted full access across all modules (hidden from matrix).<br />
                • <strong>Admin</strong> has full CRUD permissions across content modules by default.<br />
                • <strong>Staff</strong> provides view-only access across content and submission modules.<br />
                • <strong>User</strong> (End-user accounts) cannot access the admin panel.<br />
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
                    {roles.filter(r => r.id !== "superadmin").map((r) => (
                      <th key={r.id} className="px-4 py-4 min-w-[180px] text-center border-l border-gray-200/80">
                        <div className="flex flex-col items-center">
                          <span className={`px-3 py-1 rounded-full text-[11px] border mb-1 ${getRoleBadgeStyle(r.id)}`}>
                            {r.name}
                          </span>
                          <span className="text-[11px] font-normal text-[#1e1e1e]/50">
                            {dbUsers.filter(u => u.role === r.id).length} User(s)
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
                      {roles.filter(r => r.id !== "superadmin").map((r) => {
                        const perm = r.permissions[modKey] || { view: false, edit: false, delete: false };

                        return (
                          <td key={r.id} className="px-3 py-3 border-l border-gray-100 text-center">
                            <div className="flex items-center justify-center gap-3 text-[11px]">
                              {/* View */}
                              <label className="flex items-center gap-1 cursor-pointer" title="View Access">
                                <input
                                  type="checkbox"
                                  checked={perm.view}
                                  disabled={!canEditRoles}
                                  onChange={() => handleTogglePermission(r.id, modKey, "view")}
                                  className="rounded text-[#a65a4a] focus:ring-[#a65a4a] cursor-pointer"
                                />
                                <span className={perm.view ? "text-emerald-700 font-semibold" : "text-gray-400"}>View</span>
                              </label>

                              {/* Edit */}
                              <label className="flex items-center gap-1 cursor-pointer" title="Edit Access">
                                <input
                                  type="checkbox"
                                  checked={perm.edit}
                                  disabled={!canEditRoles}
                                  onChange={() => handleTogglePermission(r.id, modKey, "edit")}
                                  className="rounded text-[#a65a4a] focus:ring-[#a65a4a] cursor-pointer"
                                />
                                <span className={perm.edit ? "text-[#a65a4a] font-semibold" : "text-gray-400"}>Edit</span>
                              </label>

                              {/* Delete */}
                              <label className="flex items-center gap-1 cursor-pointer" title="Delete Access">
                                <input
                                  type="checkbox"
                                  checked={perm.delete}
                                  disabled={!canEditRoles}
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
                {editingUser?.id ? "Edit User Account" : "Add New User Account"}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-[13px]">
              <div>
                <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Rao"
                  value={editingUser?.name || ""}
                  onChange={e => setEditingUser((prev: any) => ({ ...prev, name: e.target.value }))}
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ananya@mahilaaction.org"
                  value={editingUser?.email || ""}
                  onChange={e => setEditingUser((prev: any) => ({ ...prev, email: e.target.value }))}
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={editingUser?.phone || ""}
                  onChange={e => setEditingUser((prev: any) => ({ ...prev, phone: e.target.value }))}
                  className={inputBase}
                />
              </div>

              {!editingUser?.id && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="Defaults to 123456"
                    value={editingUser?.password || ""}
                    onChange={e => setEditingUser((prev: any) => ({ ...prev, password: e.target.value }))}
                    className={inputBase}
                  />
                </div>
              )}

              {editingUser?.role === "superadmin" ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[12px] text-amber-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Super Admin role and Active status are locked for system security.</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Assigned Account Role</label>
                    <select
                      value={editingUser?.role || editingUser?.roleId || "user"}
                      onChange={e => setEditingUser((prev: any) => ({ ...prev, role: e.target.value }))}
                      className={inputBase}
                    >
                      <option value="admin">Admin (Full Access)</option>
                      <option value="staff">Staff (View Only Admin Access)</option>
                      <option value="user">User (No Admin Access)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Event Participation (Kind)</label>
                    <select
                      value={editingUser?.kind || ""}
                      onChange={e => setEditingUser((prev: any) => ({ ...prev, kind: e.target.value || null }))}
                      className={inputBase}
                    >
                      <option value="">None (Standard User)</option>
                      <option value="volunteer">Volunteer</option>
                      <option value="vendor">Vendor</option>
                      <option value="attendee">Attendee</option>
                      <option value="donor">Donor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#1e1e1e]/60 uppercase mb-1">Account Status</label>
                    <select
                      value={editingUser?.status || "Active"}
                      onChange={e => setEditingUser((prev: any) => ({ ...prev, status: e.target.value }))}
                      className={inputBase}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Per-User Individual Permission Customization Section */}
                  <div className="border-t border-gray-200 pt-4 mt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-semibold text-[#1e1e1e] flex items-center gap-1.5 cursor-pointer">
                        <ShieldCheck className="w-4 h-4 text-[#a65a4a]" />
                        Individual User Permissions Override
                      </label>
                      {editingUser?.permissions && (
                        <button
                          type="button"
                          onClick={() => setEditingUser((prev: any) => ({ ...prev, permissions: null }))}
                          className="text-[11px] text-red-600 hover:underline cursor-pointer font-medium"
                        >
                          Reset to Role Defaults
                        </button>
                      )}
                    </div>

                    {!editingUser?.permissions ? (
                      <button
                        type="button"
                        onClick={() => {
                          const baseRolePerms = getRoleById(editingUser?.role || "user").permissions;
                          setEditingUser((prev: any) => ({
                            ...prev,
                            permissions: JSON.parse(JSON.stringify(baseRolePerms)),
                          }));
                        }}
                        className="w-full py-2 px-3 bg-[#a65a4a]/10 text-[#a65a4a] text-[12px] font-semibold rounded-lg hover:bg-[#a65a4a]/20 transition-colors cursor-pointer text-center"
                      >
                        + Customize Individual Permissions for {editingUser?.name || "this User"}
                      </button>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-[260px] overflow-y-auto space-y-2 text-[12px]">
                        <p className="text-[11px] text-[#1e1e1e]/60 mb-2 font-medium">
                          Custom per-user overrides take precedence over the assigned role default.
                        </p>
                        {(Object.keys(MODULE_LABELS) as AdminModule[]).map((modKey) => {
                          const userPerms = typeof editingUser.permissions === "string"
                            ? JSON.parse(editingUser.permissions)
                            : (editingUser.permissions || {});
                          const modPerm = userPerms[modKey] || { view: false, edit: false, delete: false };

                          const updateModPerm = (action: "view" | "edit" | "delete", val: boolean) => {
                            const nextPerms = {
                              ...userPerms,
                              [modKey]: {
                                ...modPerm,
                                [action]: val,
                                view: val && (action === "edit" || action === "delete") ? true : (!val && action === "view" ? false : modPerm.view),
                              },
                            };
                            setEditingUser((prev: any) => ({ ...prev, permissions: nextPerms }));
                          };

                          return (
                            <div key={modKey} className="flex items-center justify-between border-b border-gray-200/60 pb-1.5 last:border-b-0">
                              <span className="font-medium text-[#1e1e1e]/80 text-[11px]">{MODULE_LABELS[modKey]}</span>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(modPerm.view)}
                                    onChange={(e) => updateModPerm("view", e.target.checked)}
                                    className="rounded text-[#a65a4a] focus:ring-[#a65a4a]"
                                  />
                                  <span className={modPerm.view ? "text-emerald-700 font-semibold" : "text-gray-400"}>View</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(modPerm.edit)}
                                    onChange={(e) => updateModPerm("edit", e.target.checked)}
                                    className="rounded text-[#a65a4a] focus:ring-[#a65a4a]"
                                  />
                                  <span className={modPerm.edit ? "text-[#a65a4a] font-semibold" : "text-gray-400"}>Edit</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer text-[10px]">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(modPerm.delete)}
                                    onChange={(e) => updateModPerm("delete", e.target.checked)}
                                    className="rounded text-[#a65a4a] focus:ring-[#a65a4a]"
                                  />
                                  <span className={modPerm.delete ? "text-red-700 font-semibold" : "text-gray-400"}>Del</span>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
