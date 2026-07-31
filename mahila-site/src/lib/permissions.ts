export type AdminModule =
  | "submissions"
  | "events"
  | "contentTypeBuilder"
  | "stories"
  | "impactStories"
  | "categories"
  | "eventsBlog"
  | "councilors"
  | "timeline"
  | "contact"
  | "roles";

export type PermissionAction = "view" | "edit" | "delete";

export interface ModulePermission {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export type PermissionMatrix = Record<AdminModule, ModulePermission>;

export interface AdminRole {
  id: string; // e.g. "superadmin", "admin", "user", or custom "custom_xyz"
  name: string;
  description: string;
  isSystem?: boolean; // Built-in roles (superadmin, admin, user)
  permissions: PermissionMatrix;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  status: "Active" | "Inactive";
  createdAt: string;
  lastActiveAt?: string;
  avatarUrl?: string;
}

export const MODULE_LABELS: Record<AdminModule, string> = {
  submissions: "Form Submissions & Applications",
  events: "Upcoming Events",
  contentTypeBuilder: "Content-Type Builder",
  stories: "Community Stories",
  impactStories: "Our Impact Stories",
  categories: "Story Categories",
  eventsBlog: "Events Blog",
  councilors: "Councilors",
  timeline: "Timeline Entries",
  contact: "Contact Information",
  roles: "User & Role Management",
};

// ── Built-in Role Definitions ──────────────────────────────────────────────

const FULL_PERMISSIONS: PermissionMatrix = {
  submissions: { view: true, edit: true, delete: true },
  events: { view: true, edit: true, delete: true },
  contentTypeBuilder: { view: true, edit: true, delete: true },
  stories: { view: true, edit: true, delete: true },
  impactStories: { view: true, edit: true, delete: true },
  categories: { view: true, edit: true, delete: true },
  eventsBlog: { view: true, edit: true, delete: true },
  councilors: { view: true, edit: true, delete: true },
  timeline: { view: true, edit: true, delete: true },
  contact: { view: true, edit: true, delete: true },
  roles: { view: true, edit: true, delete: true },
};

const ADMIN_PERMISSIONS: PermissionMatrix = {
  submissions: { view: true, edit: true, delete: true },
  events: { view: true, edit: true, delete: true },
  contentTypeBuilder: { view: true, edit: true, delete: true },
  stories: { view: true, edit: true, delete: true },
  impactStories: { view: true, edit: true, delete: true },
  categories: { view: true, edit: true, delete: true },
  eventsBlog: { view: true, edit: true, delete: true },
  councilors: { view: true, edit: true, delete: true },
  timeline: { view: true, edit: true, delete: true },
  contact: { view: true, edit: true, delete: true },
  roles: { view: true, edit: true, delete: true },
};

const USER_PERMISSIONS: PermissionMatrix = {
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
};

export const DEFAULT_ROLES: AdminRole[] = [
  {
    id: "superadmin",
    name: "Super Admin",
    description: "Unrestricted total access to all content sections, platform settings, user management, and permissions.",
    isSystem: true,
    permissions: FULL_PERMISSIONS,
  },
  {
    id: "admin",
    name: "Admin",
    description: "Full content management access to view, create, edit, and publish content across all public modules.",
    isSystem: true,
    permissions: ADMIN_PERMISSIONS,
  },
  {
    id: "user",
    name: "User",
    description: "Standard user access with view-only permissions for content and submissions.",
    isSystem: true,
    permissions: USER_PERMISSIONS,
  },
];

const envSuperAdminEmail = typeof process !== "undefined" ? (process.env.SUPERADMIN_EMAIL || process.env.EMAIL_FROM || "admin@organization.org") : "admin@organization.org";

export const DEFAULT_ADMIN_USERS: AdminUser[] = [
  {
    id: "usr_superadmin",
    name: "Lead Super Admin",
    email: envSuperAdminEmail.toLowerCase().trim(),
    roleId: "superadmin",
    status: "Active",
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
];

// ── Storage Keys ────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  ROLES: "mahila_admin_roles_v1",
  USERS: "mahila_admin_users_v1",
  SESSION: "mahila_admin_active_session_v1",
};

// ── Helper Functions ────────────────────────────────────────────────────────

export function getStoredRoles(): AdminRole[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ROLES);
    if (!raw) return DEFAULT_ROLES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ROLES;
  } catch {
    return DEFAULT_ROLES;
  }
}

export function saveStoredRoles(roles: AdminRole[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
  } catch (e) {
    console.error("Failed to save roles:", e);
  }
}

export function getStoredAdminUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) return DEFAULT_ADMIN_USERS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Strictly enforce that ONLY ONE user has the superadmin roleId
      let superAdminCount = 0;
      const sanitized = parsed.map((user, idx) => {
        if (user.roleId === "superadmin") {
          superAdminCount++;
          if (superAdminCount > 1) {
            return { ...user, roleId: "user" }; // Demote excess superadmins
          }
        }
        return user;
      });

      // If no superadmin exists, make the very first user the single Super Admin
      if (superAdminCount === 0 && sanitized[0]) {
        sanitized[0].roleId = "superadmin";
      }

      return sanitized;
    }
    return DEFAULT_ADMIN_USERS;
  } catch {
    return DEFAULT_ADMIN_USERS;
  }
}

export function saveStoredAdminUsers(users: AdminUser[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (e) {
    console.error("Failed to save admin users:", e);
  }
}

export function saveAdminUser(user: Partial<AdminUser> & { email: string }): AdminUser {
  const users = getStoredAdminUsers();
  const existingIndex = users.findIndex(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());

  if (existingIndex >= 0) {
    const updated: AdminUser = {
      ...users[existingIndex],
      ...user,
    };
    users[existingIndex] = updated;
    saveStoredAdminUsers(users);
    return updated;
  } else {
    // Only one superadmin allowed in system
    const hasSuperAdmin = users.some(u => u.roleId === "superadmin");
    const roleId = (!hasSuperAdmin && user.roleId === "superadmin") ? "superadmin" : (user.roleId === "superadmin" ? "user" : (user.roleId || "user"));

    const newUser: AdminUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: user.name || user.email.split("@")[0],
      email: user.email,
      roleId,
      status: user.status || "Active",
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    users.unshift(newUser);
    saveStoredAdminUsers(users);
    return newUser;
  }
}

export function deleteAdminUser(id: string): boolean {
  const users = getStoredAdminUsers();
  const target = users.find(u => u.id === id);
  if (target?.roleId === "superadmin") {
    throw new Error("The Super Admin account cannot be deleted.");
  }
  const filtered = users.filter(u => u.id !== id);
  saveStoredAdminUsers(filtered);
  return true;
}

export function saveRole(role: AdminRole): AdminRole {
  const roles = getStoredRoles();
  const index = roles.findIndex(r => r.id === role.id);
  if (index >= 0) {
    roles[index] = role;
  } else {
    roles.push(role);
  }
  saveStoredRoles(roles);
  return role;
}

export function deleteRole(roleId: string): boolean {
  if (["superadmin", "admin", "user"].includes(roleId)) {
    throw new Error("System roles (Super Admin, Admin, User) cannot be deleted.");
  }
  const roles = getStoredRoles();
  const filtered = roles.filter(r => r.id !== roleId);
  saveStoredRoles(filtered);
  return true;
}

export function getRoleById(roleId: string): AdminRole {
  const roles = getStoredRoles();
  const found = roles.find(r => r.id === roleId);
  if (found) return found;
  return DEFAULT_ROLES.find(r => r.id === "user") || DEFAULT_ROLES[0];
}

// ── Active Session Management ────────────────────────────────────────────────

export function getCurrentAdminSession(): AdminUser {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) {
        const users = getStoredAdminUsers();
        const active = users.find(u => u.email.toLowerCase() === parsed.email.toLowerCase());
        if (active && active.status === "Active") return active;
      }
    }
  } catch {}

  const defaultUser = getStoredAdminUsers()[0] || DEFAULT_ADMIN_USERS[0];
  return defaultUser;
}

export function setCurrentAdminSession(email: string) {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const users = getStoredAdminUsers();
    let match = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (normalizedEmail === envSuperAdminEmail.toLowerCase().trim()) {
      match = saveAdminUser({
        email: normalizedEmail,
        name: "Lead Super Admin",
        roleId: "superadmin",
        status: "Active",
      });
    } else if (!match) {
      // If user does not exist, check if a superadmin exists. If so, assign staff ("user") role.
      const hasSuperAdmin = users.some(u => u.roleId === "superadmin");
      const roleId = !hasSuperAdmin ? "superadmin" : (normalizedEmail.includes("admin") ? "admin" : "user");

      match = saveAdminUser({
        email: normalizedEmail,
        name: normalizedEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        roleId,
        status: "Active",
      });
    }
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify({ email: match.email, timestamp: Date.now() }));
  } catch (e) {
    console.error("Failed to set session:", e);
  }
}

export function clearAdminSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

// ── Permission Evaluation ───────────────────────────────────────────────────

export function hasPermission(
  roleIdOrUser: string | AdminUser | undefined | null,
  module: AdminModule,
  action: PermissionAction
): boolean {
  if (!roleIdOrUser) return false;

  let roleId = typeof roleIdOrUser === "string" ? roleIdOrUser : roleIdOrUser.roleId;
  const role = getRoleById(roleId);

  if (role.id === "superadmin") return true;

  const modulePerms = role.permissions?.[module];
  if (!modulePerms) return false;

  return Boolean(modulePerms[action]);
}
