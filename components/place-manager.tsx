"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PlaceItem = {
  id: number;
  name: string;
  detail: string;
  weatherEnabled: boolean;
  headlinesEnabled: boolean;
  rssUrl: string;
};

type Hit = {
  name: string;
  detail: string;
  latitude: number;
  longitude: number;
  timezone: string;
  rssUrl: string;
};

export function PlaceManager({ places, headlineLimit }: { places: PlaceItem[]; headlineLimit: number }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [limit, setLimit] = useState(String(headlineLimit));

  async function send(url: string, method: string, body?: unknown) {
    setPending(true);
    setError("");
    const response = await fetch(url, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(payload.error || "Could not save that change.");
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div className="mt-8 flex flex-col gap-10">
      <form
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!query.trim()) return;
          setPending(true);
          setError("");
          const response = await fetch(`/api/places?q=${encodeURIComponent(query.trim())}`);
          const payload = (await response.json().catch(() => ({}))) as { error?: string; results?: Hit[] };
          setPending(false);
          if (!response.ok) {
            setError(payload.error || "Place search is unavailable.");
            return;
          }
          setHits(payload.results ?? []);
          if ((payload.results ?? []).length === 0) setError("No matching places.");
        }}
      >
        <label className="field min-w-0 flex-1">
          <span>City</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Seattle" />
        </label>
        <button className="btn btn-quiet" type="submit" disabled={pending}>
          Search
        </button>
      </form>

      {hits.length > 0 ? (
        <ul className="divide-y divide-ink/15 border-y border-ink/15">
          {hits.map((hit) => (
            <li key={`${hit.latitude}-${hit.longitude}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span>
                {hit.name}
                {hit.detail ? <span className="text-muted">, {hit.detail}</span> : null}
              </span>
              <button
                className="btn btn-stamp"
                type="button"
                disabled={pending}
                onClick={async () => {
                  const ok = await send("/api/places", "POST", {
                    ...hit,
                    name: hit.detail ? `${hit.name}` : hit.name,
                  });
                  if (ok) setHits([]);
                }}
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await send("/api/settings", "POST", { headlineLimit: Number(limit) });
        }}
      >
        <label className="field w-40">
          <span>Headlines each</span>
          <input value={limit} onChange={(event) => setLimit(event.target.value)} inputMode="numeric" />
        </label>
        <button className="btn btn-quiet" type="submit" disabled={pending}>
          Save
        </button>
      </form>

      <div>
        {places.length === 0 ? <p className="text-muted">No places yet.</p> : null}
        {places.map((place, index) => (
          <PlaceRow
            key={place.id}
            place={place}
            first={index === 0}
            last={index === places.length - 1}
            pending={pending}
            onSend={send}
          />
        ))}
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PlaceRow({
  place,
  first,
  last,
  pending,
  onSend,
}: {
  place: PlaceItem;
  first: boolean;
  last: boolean;
  pending: boolean;
  onSend: (url: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const [name, setName] = useState(place.name);
  const [rssUrl, setRssUrl] = useState(place.rssUrl);
  const [weatherEnabled, setWeather] = useState(place.weatherEnabled);
  const [headlinesEnabled, setHeadlines] = useState(place.headlinesEnabled);

  return (
    <form
      className="flex flex-col gap-4 border-t border-ink/15 py-6"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSend(`/api/places/${place.id}`, "PATCH", { name, rssUrl, weatherEnabled, headlinesEnabled });
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl">{place.name}</h2>
          {place.detail ? <p className="text-sm text-muted">{place.detail}</p> : null}
        </div>
        <div className="flex gap-3">
          <button className="btn-text text-sm" type="button" disabled={pending || first} onClick={() => onSend(`/api/places/${place.id}`, "POST", { direction: "up" })}>
            Up
          </button>
          <button className="btn-text text-sm" type="button" disabled={pending || last} onClick={() => onSend(`/api/places/${place.id}`, "POST", { direction: "down" })}>
            Down
          </button>
          <button
            className="btn-text text-sm"
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Remove ${place.name}?`)) void onSend(`/api/places/${place.id}`, "DELETE");
            }}
          >
            Remove
          </button>
        </div>
      </div>
      <label className="field">
        <span>Name on the slip</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>Headline feed</span>
        <input value={rssUrl} onChange={(event) => setRssUrl(event.target.value)} spellCheck={false} />
      </label>
      <div className="flex flex-wrap gap-6">
        <label className="check">
          <input type="checkbox" checked={weatherEnabled} onChange={(event) => setWeather(event.target.checked)} />
          Weather
        </label>
        <label className="check">
          <input type="checkbox" checked={headlinesEnabled} onChange={(event) => setHeadlines(event.target.checked)} />
          Headlines
        </label>
      </div>
      <button className="btn btn-quiet w-fit" type="submit" disabled={pending}>
        Save place
      </button>
    </form>
  );
}
