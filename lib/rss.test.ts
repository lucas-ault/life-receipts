import { describe, expect, it } from "vitest";
import { parseFeed } from "./rss";

const sample = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title><![CDATA[Ferry delays downtown - Seattle Times]]></title>
    <source>Seattle Times</source>
  </item>
  <item>
    <title>Council vote &amp; the budget</title>
  </item>
  <item><title>   </title></item>
</channel></rss>`;

describe("parseFeed", () => {
  it("reads titles, strips the repeated source, and decodes entities", () => {
    expect(parseFeed(sample)).toEqual([
      { title: "Ferry delays downtown", source: "Seattle Times" },
      { title: "Council vote & the budget" },
    ]);
  });

  it("reads Atom entries", () => {
    const atom = `<feed><entry><title>Morning edition</title><source>Wire</source></entry></feed>`;
    expect(parseFeed(atom)).toEqual([{ title: "Morning edition", source: "Wire" }]);
  });
});
