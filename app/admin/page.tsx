import { AdminApp } from "@/components/AdminApp";
import { getAdminIdentity } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const { userId } = await auth();
  const identity = await getAdminIdentity();
  if (!identity) redirect(userId ? "/" : "/sign-in?redirect_url=/admin");
  return <AdminApp identity={identity} />;
}
