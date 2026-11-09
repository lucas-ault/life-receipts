import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { isRole, memberMayOpen } from "@/lib/access";
import { safeNextPath } from "@/lib/origin";
import { currentUser } from "@/lib/session";
import { getOwner } from "@/lib/store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!getOwner()) redirect("/setup");
  const headerList = await headers();
  const path = headerList.get("x-pathname") ?? "/";
  const user = await currentUser();
  if (!user || !isRole(user.role)) {
    const next = safeNextPath(path) ?? "/";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (user.role === "member" && !memberMayOpen(path)) redirect("/todos");
  return <Shell role={user.role}>{children}</Shell>;
}
