import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ADMIN_ROLES, requireCapability, type AdminRole } from "@/lib/auth";
import { readJsonObject } from "@/lib/http";
import { isTrustedMutation } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function roleOf(value: unknown): AdminRole {
  return typeof value === "string" && ADMIN_ROLES.includes(value as AdminRole)
    ? value as AdminRole
    : "editor";
}

function serializeUser(user: Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>>) {
  const email = user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress
    ?? user.emailAddresses[0]?.emailAddress
    ?? "";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
    || user.username
    || email
    || "Catalog teammate";
  return {
    id: user.id,
    name,
    email,
    imageUrl: user.imageUrl,
    role: roleOf(user.publicMetadata.role),
    createdAt: user.createdAt,
    lastSignInAt: user.lastSignInAt,
  };
}

export async function GET() {
  const access = await requireCapability("team:manage");
  if (!access.ok) return access.response;
  const client = await clerkClient();
  const page = await client.users.getUserList({ limit: 100, orderBy: "+created_at" });
  return NextResponse.json({ users: page.data.map(serializeUser), total: page.totalCount });
}

export async function PATCH(request: Request) {
  if (!isTrustedMutation(request)) {
    return NextResponse.json({ error: "Request rejected." }, { status: 403 });
  }
  const access = await requireCapability("team:manage");
  if (!access.ok) return access.response;
  const body = await readJsonObject<{ userId?: string; role?: string }>(request);
  if (!body?.userId || !body.role || !ADMIN_ROLES.includes(body.role as AdminRole)) {
    return NextResponse.json({ error: "Choose a valid teammate and role." }, { status: 400 });
  }
  if (body.userId === access.identity.userId && body.role !== "admin") {
    return NextResponse.json({ error: "You cannot remove your own admin access." }, { status: 400 });
  }

  const client = await clerkClient();
  const target = await client.users.getUser(body.userId);
  if (roleOf(target.publicMetadata.role) === "admin" && body.role !== "admin") {
    const page = await client.users.getUserList({ limit: 100 });
    const adminCount = page.data.filter((user) => roleOf(user.publicMetadata.role) === "admin").length;
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Assign another admin before changing the last admin." }, { status: 400 });
    }
  }

  const updated = await client.users.updateUserMetadata(body.userId, {
    publicMetadata: { role: body.role },
  });
  return NextResponse.json({ user: serializeUser(updated) });
}
