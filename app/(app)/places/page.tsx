import { PlaceManager } from "@/components/place-manager";
import { getSettings, listPlaces } from "@/lib/store";

export const metadata = { title: "Places" };

export default function PlacesPage() {
  const settings = getSettings();
  const places = listPlaces().map((place) => ({
    id: place.id,
    name: place.name,
    detail: place.detail,
    weatherEnabled: place.weatherEnabled,
    headlinesEnabled: place.headlinesEnabled,
    rssUrl: place.rssUrl,
  }));
  return (
    <>
      <h1 className="font-serif text-4xl tracking-tight">Places</h1>
      <p className="mt-3 max-w-xl text-muted">Weather and a few headlines for each city, in the order they print.</p>
      <PlaceManager places={places} headlineLimit={settings.headlineLimit} />
    </>
  );
}
