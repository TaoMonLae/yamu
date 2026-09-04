import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const ADMIN_ROLES = ["admin", "manager", "editor"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminCapability =
  | "catalog:read"
  | "catalog:write"
  | "catalog:delete"
  | "catalog:export"
  | "catalog:import"
  | "suggestions:review"
  | "branding:manage"
  | "team:manage";

export type AdminIdentity = {
  userId: string;
  role: AdminRole;
  name: string;
  email: string;
  imageUrl: string;
};

const ROLE_CAPABILITIES: Record<AdminRole, ReadonlySet<AdminCapability>> = {
  admin: new Set(["catalog:read", "catalog:write", "catalog:delete", "catalog:export", "catalog:import", "suggestions:review", "branding:manage", "team:manage"]),
  manager: new Set(["catalog:read", "catalog:write", "catalog:delete", "catalog:export", "catalog:import", "suggestions:review"]),
  editor: new Set(["catalog:read", "catalog:write", "catalog:export"]),
};

function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && ADMIN_ROLES.includes(value as AdminRole);
}

function primaryEmail(user: {
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
}) {
  return user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress
    ?? user.emailAddresses[0]?.emailAddress
    ?? "";
}

function displayName(user: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.username || primaryEmail(user) || "Catalog teammate";
}

export function can(role: AdminRole, capability: AdminCapability) {
  return ROLE_CAPABILITIES[role].has(capability);
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const client = await clerkClient();
  let user = await client.users.getUser(userId);
  const storedRole = user.publicMetadata.role;
  if (!isAdminRole(storedRole)) {
    const firstPage = await client.users.getUserList({ limit: 1, orderBy: "+created_at" });
    if (firstPage.data[0]?.id !== userId) return null;
    user = await client.users.updateUserMetadata(userId, { publicMetadata: { role: "admin" } });
  }

  const role = isAdminRole(user.publicMetadata.role) ? user.publicMetadata.role : "admin";

  return {
    userId,
    role,
    name: displayName(user),
    email: primaryEmail(user),
    imageUrl: user.imageUrl,
  };
}

export async function requireCapability(capability: AdminCapability) {
  const identity = await getAdminIdentity();
  if (!identity) {
    return { ok: false as const, response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }
  if (!can(identity.role, capability)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: `The ${identity.role} role cannot perform this action.` }, { status: 403 }),
    };
  }
  return { ok: true as const, identity };
}
