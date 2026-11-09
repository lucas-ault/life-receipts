export type FeedItem = {
  title: string;
  source?: string;
};

function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, code: string) => safeChar(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => safeChar(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function safeChar(code: number) {
  if (!Number.isFinite(code) || code < 32 || code > 0x10ffff) return "";
  return String.fromCodePoint(code);
}

function tag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decode(match[1]) : "";
}

function cleanTitle(title: string, source: string) {
  if (!source) return title;
  const suffix = ` - ${source}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

export function parseFeed(xml: string): FeedItem[] {
  const itemChunks = xml.split(/<item\b/i).slice(1);
  const chunks = itemChunks.length > 0 ? itemChunks : xml.split(/<entry\b/i).slice(1);
  const items: FeedItem[] = [];
  for (const chunk of chunks) {
    const block = chunk.split(/<\/item>|<\/entry>/i)[0] ?? chunk;
    const source = tag(block, "source");
    const title = cleanTitle(tag(block, "title"), source);
    if (!title) continue;
    items.push(source ? { title, source } : { title });
  }
  return items;
}

export function googleNewsRss(query: string) {
  const url = new URL("https://news.google.com/rss/search");
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  return url.toString();
}
