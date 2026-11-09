import { redirect } from "next/navigation";
import { SetupForm } from "@/components/setup-form";
import { currentUser } from "@/lib/session";
import { getOwner } from "@/lib/store";

export const metadata = { title: "Setup" };

export default async function SetupPage() {
  if (getOwner()) {
    if (await currentUser()) redirect("/");
    redirect("/login");
  }
  const zones = Intl.supportedValuesOf("timeZone");
  const serverZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const defaultZone = zones.includes(serverZone) ? serverZone : "America/Los_Angeles";
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="font-serif text-3xl italic">Roundup</p>
      <h1 className="mt-8 font-serif text-4xl tracking-tight">Create the owner account</h1>
      <p className="mt-3 text-muted">This person manages the printer, calendar, places, and who else can add notes and to-dos.</p>
      <SetupForm timeZones={zones} defaultZone={defaultZone} />
    </div>
  );
}
