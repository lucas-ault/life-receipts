import "server-only";

import type { Place } from "@/db/schema";
import { fetchTimeout } from "./http";
import type { HeadlineGroup } from "./receipt/types";
import { parseFeed } from "./rss";

export async function fetchHeadlines(placeList: Place[], limit: number): Promise<HeadlineGroup[]> {
  const groups = await Promise.all(placeList.map((place) => loadPlace(place, limit)));
  return groups.filter((group) => group.unavailable || group.items.length > 0);
}

async function loadPlace(place: Place, limit: number): Promise<HeadlineGroup> {
  try {
    const response = await fetchTimeout(place.rssUrl);
    if (!response.ok) throw new Error("status");
    const xml = (await response.text()).slice(0, 1_000_000);
    const seen = new Set<string>();
    const items = [];
    for (const item of parseFeed(xml)) {
      const key = item.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ title: item.title.slice(0, 180), source: item.source });
      if (items.length >= limit) break;
    }
    return { place: place.name, items };
  } catch {
    return { place: place.name, items: [], unavailable: true };
  }
}
