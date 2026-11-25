import { getDbSetting, setDbSetting } from "./siteSettings";
import { AdminRole, DEFAULT_ROLES, mergeRolesWithDefaults } from "./permissions";

const ROLES_SETTINGS_KEY = "rbac_roles";
const CACHE_TTL_MS = 5000;

let cachedRoles: AdminRole[] | null = null;
let cachedAt = 0;

/**
 * Loads RBAC role definitions from PostgreSQL (`site_settings.rbac_roles`),
 * merged with system defaults so API permission enforcement reflects Role Matrix edits.
 */
export async function getServerRoles(bypassCache = false): Promise<AdminRole[]> {
  if (!bypassCache && cachedRoles && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedRoles;
  }

  try {
    const stored = await getDbSetting<AdminRole[] | null>(ROLES_SETTINGS_KEY, null);
    const merged = mergeRolesWithDefaults(stored);
    cachedRoles = merged;
    cachedAt = Date.now();
    return merged;
  } catch {
    return DEFAULT_ROLES;
  }
}

/**
 * Persists updated RBAC roles to PostgreSQL (`site_settings.rbac_roles`) and refreshes cache.
 */
export async function saveServerRoles(roles: AdminRole[]): Promise<AdminRole[]> {
  const merged = mergeRolesWithDefaults(roles);
  const ok = await setDbSetting(ROLES_SETTINGS_KEY, merged);
  if (!ok) {
    throw new Error("Failed to persist role matrix to database.");
  }
  cachedRoles = merged;
  cachedAt = Date.now();
  return merged;
}

export function invalidateServerRolesCache() {
  cachedRoles = null;
  cachedAt = 0;
}
