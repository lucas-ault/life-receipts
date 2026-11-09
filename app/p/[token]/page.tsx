import { notFound } from "next/navigation";
import { PublicNoteForm } from "@/components/public-note-form";
import { tokensMatch } from "@/lib/crypto";
import { noteAuthor } from "@/lib/note-author";
import { getSettings, listPendingNotes, listUsers } from "@/lib/store";
import { formatClock } from "@/lib/time";

export const metadata = { title: "Leave a note" };

export default async function PublicNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const settings = getSettings();
  if (!tokensMatch(token, settings.publicToken)) notFound();
  const names = new Map(listUsers().map((person) => [person.id, person.name]));
  const notes = listPendingNotes();
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="font-serif text-3xl italic">Life Receipts</p>
      <h1 className="mt-8 font-serif text-4xl tracking-tight">Leave a note</h1>
      <p className="mt-3 text-muted">It prints on the next morning slip.</p>
      <PublicNoteForm token={token} />
      <h2 className="mt-12 font-serif text-2xl">Waiting to print</h2>
      {notes.length === 0 ? <p className="mt-3 text-muted">Nothing is waiting.</p> : null}
      <ul className="mt-4 divide-y divide-ink/15 border-t border-ink/15">
        {notes.map((note) => {
          const author = noteAuthor(note, names);
          return (
            <li key={note.id} className="py-4">
              {author ? <p className="font-serif text-xl">{author}</p> : null}
              <p className="whitespace-pre-wrap">{note.body}</p>
              <p className="mt-1 text-sm text-muted">{formatClock(new Date(note.createdAt), settings.timezone)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
