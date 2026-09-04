import { AdminApp } from "@/components/AdminApp";
import { getAdminIdentity } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const identity = await getAdminIdentity();
  if (!identity) redirect("/sign-in?redirect_url=/admin");
  return <AdminApp identity={identity} />;
}
