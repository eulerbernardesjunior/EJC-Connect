export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  ENCOUNTERS_VIEW: "encounters.view",
  ENCOUNTERS_MANAGE: "encounters.manage",
  TEAMS_VIEW: "teams.view",
  TEAMS_MANAGE: "teams.manage",
  MEMBERS_VIEW: "members.view",
  MEMBERS_MANAGE: "members.manage",
  IMPORTS_RUN: "imports.run",
  CIRCLES_IMPORT: "circles.import",
  PDF_GENERATE: "pdf.generate",
  ASSETS_VIEW: "assets.view",
  ASSETS_MANAGE: "assets.manage",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage"
};

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

const ROLE_BASE = {
  ADMIN: ALL_PERMISSIONS.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
  EDITOR: {
    [PERMISSIONS.DASHBOARD_VIEW]: true,
    [PERMISSIONS.ENCOUNTERS_VIEW]: true,
    [PERMISSIONS.ENCOUNTERS_MANAGE]: true,
    [PERMISSIONS.TEAMS_VIEW]: true,
    [PERMISSIONS.TEAMS_MANAGE]: true,
    [PERMISSIONS.MEMBERS_VIEW]: true,
    [PERMISSIONS.MEMBERS_MANAGE]: true,
    [PERMISSIONS.IMPORTS_RUN]: true,
    [PERMISSIONS.CIRCLES_IMPORT]: true,
    [PERMISSIONS.PDF_GENERATE]: true,
    [PERMISSIONS.ASSETS_VIEW]: true,
    [PERMISSIONS.ASSETS_MANAGE]: true,
    [PERMISSIONS.USERS_VIEW]: false,
    [PERMISSIONS.USERS_MANAGE]: false
  },
  VISUALIZADOR: {
    [PERMISSIONS.DASHBOARD_VIEW]: true,
    [PERMISSIONS.ENCOUNTERS_VIEW]: true,
    [PERMISSIONS.ENCOUNTERS_MANAGE]: false,
    [PERMISSIONS.TEAMS_VIEW]: true,
    [PERMISSIONS.TEAMS_MANAGE]: false,
    [PERMISSIONS.MEMBERS_VIEW]: true,
    [PERMISSIONS.MEMBERS_MANAGE]: false,
    [PERMISSIONS.IMPORTS_RUN]: false,
    [PERMISSIONS.CIRCLES_IMPORT]: false,
    [PERMISSIONS.PDF_GENERATE]: true,
    [PERMISSIONS.ASSETS_VIEW]: true,
    [PERMISSIONS.ASSETS_MANAGE]: false,
    [PERMISSIONS.USERS_VIEW]: false,
    [PERMISSIONS.USERS_MANAGE]: false
  }
};

function normalizeRole(roleRaw) {
  const role = String(roleRaw || "EDITOR").toUpperCase();
  return ROLE_BASE[role] ? role : "EDITOR";
}

export function getRolePermissions(roleRaw) {
  const role = normalizeRole(roleRaw);
  return { ...ROLE_BASE[role] };
}

export function sanitizePermissions(rawPermissions) {
  if (!rawPermissions || typeof rawPermissions !== "object" || Array.isArray(rawPermissions)) {
    return {};
  }
  const cleaned = {};
  for (const [key, value] of Object.entries(rawPermissions)) {
    if (!ALL_PERMISSIONS.includes(key)) continue;
    cleaned[key] = Boolean(value);
  }
  return cleaned;
}

export function buildEffectivePermissions(roleRaw, customPermissions = {}) {
  const base = getRolePermissions(roleRaw);
  const custom = sanitizePermissions(customPermissions);
  return { ...base, ...custom };
}

export function hasPermission(user, permissionKey) {
  if (!user) return false;
  const effective = buildEffectivePermissions(user.permissao, user.permissions || {});
  return Boolean(effective[permissionKey]);
}

export function allPermissionKeys() {
  return [...ALL_PERMISSIONS];
}
