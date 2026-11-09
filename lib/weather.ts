import "server-only";

import type { Place } from "@/db/schema";
import { fetchTimeout } from "./http";
import type { WeatherBlock } from "./receipt/types";

const CONDITIONS: Record<number, string> = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

export function conditionLabel(code: number | null | undefined) {
  if (code == null || Number.isNaN(code)) return "Forecast";
  return CONDITIONS[code] ?? "Forecast";
}

export type GeoHit = {
  name: string;
  detail: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export async function searchPlaces(query: string): Promise<GeoHit[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  const response = await fetchTimeout(url);
  if (!response.ok) throw new Error("Place search is unavailable.");
  const data = (await response.json()) as { results?: Array<Record<string, unknown>> };
  return (data.results ?? []).map((row) => ({
    name: String(row.name ?? "Place"),
    detail: [row.admin1, row.country].filter((part) => typeof part === "string" && part).join(", "),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    timezone: typeof row.timezone === "string" ? row.timezone : "",
  }));
}

type Daily = {
  weather_code?: Array<number | null>;
  temperature_2m_max?: Array<number | null>;
  temperature_2m_min?: Array<number | null>;
  precipitation_probability_max?: Array<number | null>;
};

function dailyBlocks(payload: unknown): Daily[] {
  if (Array.isArray(payload)) {
    return payload.map((entry) => {
      const daily = (entry as { daily?: Daily }).daily;
      return daily ?? {};
    });
  }
  const daily = (payload as { daily?: Daily }).daily;
  return [daily ?? {}];
}

export async function fetchForecasts(
  placesToLoad: Place[],
  units: string,
  timeZone: string,
  dayIndex = 0,
): Promise<WeatherBlock[]> {
  if (placesToLoad.length === 0) return [];
  const unit = units === "c" ? "C" : "F";
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", placesToLoad.map((place) => place.latitude).join(","));
  url.searchParams.set("longitude", placesToLoad.map((place) => place.longitude).join(","));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("temperature_unit", unit === "C" ? "celsius" : "fahrenheit");
  url.searchParams.set("timezone", timeZone);
  url.searchParams.set("forecast_days", String(Math.min(16, dayIndex + 1)));
  try {
    const response = await fetchTimeout(url);
    if (!response.ok) throw new Error("status");
    const blocks = dailyBlocks(await response.json());
    return placesToLoad.map((place, index) => {
      const daily = blocks[index];
      const code = daily?.weather_code?.[dayIndex];
      if (!daily || typeof code !== "number") {
        return { place: place.name, condition: "Forecast unavailable", code: null, high: null, low: null, precipChance: null, unit, unavailable: true };
      }
      const high = daily.temperature_2m_max?.[dayIndex];
      const low = daily.temperature_2m_min?.[dayIndex];
      const precip = daily.precipitation_probability_max?.[dayIndex];
      return {
        place: place.name,
        condition: conditionLabel(code),
        code,
        high: typeof high === "number" ? Math.round(high) : null,
        low: typeof low === "number" ? Math.round(low) : null,
        precipChance: typeof precip === "number" ? precip : null,
        unit,
        unavailable: false,
      };
    });
  } catch {
    return placesToLoad.map((place) => ({
      place: place.name,
      condition: "Forecast unavailable",
      code: null,
      high: null,
      low: null,
      precipChance: null,
      unit,
      unavailable: true,
    }));
  }
}
