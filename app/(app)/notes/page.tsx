import { headers } from "next/headers";
import { NoteManager } from "@/components/note-manager";
import { noteAuthor } from "@/lib/note-author";
import { currentUser } from "@/lib/session";
import { getSettings, listPendingNotes, listUsers } from "@/lib/store";

export const metadata = { title: "Notes" };

export default async function NotesPage() {
  const settings = getSettings();
  const names = new Map(listUsers().map((person) => [person.id, person.name]));
  const notes = listPendingNotes().map((note) => ({
    id: note.id,
    author: noteAuthor(note, names),
    body: note.body,
    source: note.source,
    createdAt: note.createdAt,
  }));
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const origin = process.env.APP_URL?.replace(/\/$/, "") || (host ? `${proto}://${host}` : "");
  const user = await currentUser();
  const canManage = user?.role === "owner";
  const shareUrl = canManage ? `${origin}/p/${settings.publicToken}` : "";
  return (
    <>
      <h1 className="font-serif text-4xl tracking-tight">Notes</h1>
      <p className="mt-3 max-w-xl text-muted">Notes stay on the slip until a print succeeds.</p>
      <NoteManager notes={notes} shareUrl={shareUrl} canManage={canManage} authorName={user?.name ?? ""} />
    </>
  );
}
