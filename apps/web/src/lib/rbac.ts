export type WorkspaceRoleType =
  | "OWNER"
  | "ADMIN"
  | "AGENCY_MANAGER"
  | "EDITOR"
  | "VIEWER";

export const ROLE_LABELS: Record<WorkspaceRoleType, string> = {
  OWNER: "בעלים",
  ADMIN: "מנהל",
  AGENCY_MANAGER: "משווק",
  EDITOR: "עריכה",
  VIEWER: "צפייה",
};

export const ROLE_BADGE_CLASSES: Record<WorkspaceRoleType, string> = {
  OWNER: "bg-violet-100 text-violet-700 ring-1 ring-violet-200",
  ADMIN: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  AGENCY_MANAGER: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  EDITOR: "bg-teal-100 text-teal-700 ring-1 ring-teal-200",
  VIEWER: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

// Can manage workspace: invite members, end campaigns, configure settings
export const MANAGE_ROLES: WorkspaceRoleType[] = [
  "OWNER",
  "ADMIN",
  "AGENCY_MANAGER",
];

// Can edit content: campaigns, messages, bot logic
export const EDIT_ROLES: WorkspaceRoleType[] = [
  "OWNER",
  "ADMIN",
  "AGENCY_MANAGER",
  "EDITOR",
];

// All roles that can view workspace data
export const VIEW_ROLES: WorkspaceRoleType[] = [
  "OWNER",
  "ADMIN",
  "AGENCY_MANAGER",
  "EDITOR",
  "VIEWER",
];

export function canManage(role: string | null | undefined): boolean {
  return MANAGE_ROLES.includes(role as WorkspaceRoleType);
}

export function canEdit(role: string | null | undefined): boolean {
  return EDIT_ROLES.includes(role as WorkspaceRoleType);
}

export function canView(role: string | null | undefined): boolean {
  return VIEW_ROLES.includes(role as WorkspaceRoleType);
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as WorkspaceRoleType] ?? role;
}

export function roleBadgeClass(role: string): string {
  return ROLE_BADGE_CLASSES[role as WorkspaceRoleType] ?? "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
}

export interface WorkspaceSummary {
  workspaceId: string;
  workspaceName: string;
  ownerEmail: string | null;
  role: WorkspaceRoleType;
  accountStatus: string;
}
