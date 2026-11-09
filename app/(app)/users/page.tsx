import { redirect } from "next/navigation";
import { UserManager } from "@/components/user-manager";
import { isRole } from "@/lib/access";
import { currentUser } from "@/lib/session";
import { listUsers } from "@/lib/store";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const user = await currentUser();
  if (!user || !isRole(user.role) || user.role !== "owner") redirect("/todos");
  const people = listUsers().flatMap((person) => {
    if (!isRole(person.role)) return [];
    return [{ id: person.id, name: person.name, username: person.username, role: person.role }];
  });
  return (
    <>
      <h1 className="font-serif text-4xl tracking-tight">Users</h1>
      <p className="mt-3 max-w-xl text-muted">
        The owner manages the printer, calendar, and places. Other people can sign in to add notes and to-dos. Their to-dos wait for approval before
        they print. If this app already had a password, it now signs in as <span className="font-mono">owner</span>.
      </p>
      <UserManager people={people} />
    </>
  );
}
