export function noteAuthor(note: { author: string | null; userId: number | null }, names: Map<number, string>) {
  if (note.userId) return names.get(note.userId) ?? note.author;
  return note.author;
}
