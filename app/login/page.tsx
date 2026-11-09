import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { safeNextPath } from "@/lib/origin";
import { currentUser } from "@/lib/session";
import { getOwner } from "@/lib/store";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const nextPath = safeNextPath((await searchParams).next) ?? "/";
  if (!getOwner()) redirect("/setup");
  if (await currentUser()) redirect(nextPath);
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="font-serif text-3xl italic">Roundup</p>
      <h1 className="mt-8 font-serif text-4xl tracking-tight">Sign in</h1>
      <LoginForm nextPath={nextPath} />
    </div>
  );
}
