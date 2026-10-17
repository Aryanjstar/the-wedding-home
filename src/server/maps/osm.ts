import "server-only";

/**
 * The one adapter for OpenStreetMap (ARCHITECTURE §3: one adapter per provider).
 *
 * - Nominatim turns a venue into coordinates, finds places by category ("florist") in a box, and reads
 *   one place back by its OSM id. It allows one request a second, with an identifying User-Agent.
 * - Photon (komoot) searches OSM names fast, which matters in India where many shops are only named.
 *
 * Both are free and need no key. Neither is a guarantee: the caller treats failure as "search is
 * unavailable" and the family can still save vendors by hand.
 */

const USER_AGENT = "TheWeddingHome/1.0 (+https://the-wedding-home.vercel.app)";
const NOMINATIM = "https://nominatim.openstreetmap.org";
const PHOTON = "https://photon.komoot.io/api/";

export class MapsUnavailableError extends Error {
  constructor() {
    super("The map service did not answer.");
    this.name = "MapsUnavailableError";
  }
}

export type Point = { lat: number; lng: number };

export type OsmPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: string;
  address: string | null;
  phone: string | null;
  website: string | null;
};

let lastNominatim = 0;

/** Nominatim allows one request a second. Requests from one server instance queue politely. */
async function nominatimTurn() {
  const wait = lastNominatim + 1100 - Date.now();
  lastNominatim = Math.max(Date.now(), lastNominatim + 1100);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

async function getJson<T>(url: string, nominatim: boolean): Promise<T> {
  if (nominatim) await nominatimTurn();
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { "User-Agent": USER_AGENT, "Accept-Language": "en", Accept: "application/json" } });
  } catch {
    throw new MapsUnavailableError();
  }
  if (!response.ok) throw new MapsUnavailableError();
  try {
    return (await response.json()) as T;
  } catch {
    throw new MapsUnavailableError();
  }
}

type NominatimRow = {
  osm_type?: string;
  osm_id?: number;
  lat?: string;
  lon?: string;
  name?: string;
  category?: string;
  type?: string;
  display_name?: string;
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
};

const geocodeCache = new Map<string, Point | null>();

/** A venue, an address, or a city in India, as coordinates. Null when nothing matches. */
export async function geocode(query: string): Promise<Point | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;
  const rows = await getJson<NominatimRow[]>(`${NOMINATIM}/search?${new URLSearchParams({ q: query, format: "jsonv2", limit: "1", countrycodes: "in" })}`, true);
  const first = rows[0];
  const point = first?.lat && first.lon ? { lat: Number(first.lat), lng: Number(first.lon) } : null;
  geocodeCache.set(key, point);
  return point;
}

/** Tries each description in turn: the first that resolves wins. Never throws. */
export async function geocodeFirst(queries: (string | null | undefined)[]): Promise<Point | null> {
  for (const query of queries) {
    if (!query) continue;
    try {
      const point = await geocode(query);
      if (point) return point;
    } catch {
      return null;
    }
  }
  return null;
}

/** What to ask for each kind of wedding vendor: names for Photon, categories for Nominatim. */
export const vendorQueries: Record<string, { names: string[]; categories: string[] }> = {
  photographer: { names: ["photography", "photo studio", "photographer", "studio"], categories: ["photographer", "photo shop"] },
  videographer: { names: ["films", "video", "photography"], categories: ["photographer"] },
  venue: { names: ["marriage garden", "banquet", "resort", "lawn", "wedding venue", "palace"], categories: ["events venue", "conference centre"] },
  caterer: { names: ["caterers", "catering", "halwai"], categories: ["caterer"] },
  decorator: { names: ["decorators", "tent house", "decoration", "light"], categories: [] },
  dj: { names: ["dj", "sound", "band"], categories: [] },
  makeup: { names: ["makeup", "bridal", "beauty parlour", "salon"], categories: ["beauty shop", "hairdresser"] },
  mehendi_artist: { names: ["mehndi", "mehendi", "henna"], categories: [] },
  pandit: { names: ["pandit", "jyotish", "astrologer", "purohit"], categories: [] },
  choreographer: { names: ["dance academy", "dance studio", "choreographer"], categories: ["dance school"] },
  florist: { names: ["flowers", "florist", "phool"], categories: ["florist"] },
  planner: { names: ["wedding planner", "event management", "events"], categories: [] },
  transport: { names: ["travels", "car rental", "tours"], categories: ["car rental"] },
  other: { names: ["wedding"], categories: [] },
};

/** Roads, stops, towns, and rivers share words with vendors. They are never a vendor. */
const NOT_A_VENDOR = new Set(["highway", "railway", "public_transport", "place", "boundary", "natural", "waterway", "route"]);

function box(centre: Point, radiusM: number) {
  const dLat = radiusM / 111_000;
  const dLng = radiusM / (111_000 * Math.cos((centre.lat * Math.PI) / 180));
  return { west: centre.lng - dLng, south: centre.lat - dLat, east: centre.lng + dLng, north: centre.lat + dLat };
}

function idOf(type: string | undefined, id: number | undefined) {
  if (!type || !id) return null;
  const kind = type.length === 1 ? ({ N: "node", W: "way", R: "relation" } as Record<string, string>)[type.toUpperCase()] : type.toLowerCase();
  return kind && ["node", "way", "relation"].includes(kind) ? `${kind}/${id}` : null;
}

function joinAddress(parts: (string | undefined | null)[]) {
  const clean = parts.filter((part): part is string => Boolean(part && part.trim()));
  return clean.length ? [...new Set(clean)].join(", ") : null;
}

function fromNominatim(row: NominatimRow): OsmPlace | null {
  const id = idOf(row.osm_type, row.osm_id);
  if (!id || !row.lat || !row.lon || !row.name || NOT_A_VENDOR.has(row.category ?? "")) return null;
  const address = row.address ?? {};
  const extra = row.extratags ?? {};
  return {
    id,
    name: row.name,
    lat: Number(row.lat),
    lng: Number(row.lon),
    kind: `${row.category}=${row.type}`,
    address: joinAddress([[address.house_number, address.road].filter(Boolean).join(" "), address.suburb ?? address.neighbourhood, address.city ?? address.town ?? address.village ?? address.county, address.postcode]),
    phone: (extra.phone ?? extra["contact:phone"] ?? extra["contact:mobile"] ?? null)?.split(";")[0]?.trim() ?? null,
    website: extra.website ?? extra["contact:website"] ?? extra["contact:instagram"] ?? null,
  };
}

type PhotonFeature = { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string | number | undefined> };

function fromPhoton(feature: PhotonFeature): OsmPlace | null {
  const props = feature.properties ?? {};
  const [lng, lat] = feature.geometry?.coordinates ?? [];
  const id = idOf(props.osm_type as string | undefined, props.osm_id as number | undefined);
  const name = props.name as string | undefined;
  if (!id || lat === undefined || lng === undefined || !name || NOT_A_VENDOR.has(String(props.osm_key))) return null;
  return {
    id,
    name,
    lat,
    lng,
    kind: `${props.osm_key}=${props.osm_value}`,
    address: joinAddress([[props.housenumber, props.street].filter(Boolean).join(" "), props.district as string | undefined, props.city as string | undefined, props.postcode as string | undefined]),
    phone: null,
    website: null,
  };
}

/** Places of one kind near a point, from both services, without duplicates. */
export async function nearby(centre: Point, category: string, radiusM: number, words?: string): Promise<OsmPlace[]> {
  const plan = vendorQueries[category] ?? vendorQueries.other;
  const area = box(centre, radiusM);
  const cleanWords = (words ?? "").replace(/[^\p{L}\p{N} ]/gu, " ").trim().slice(0, 60);
  const names = [...(cleanWords ? [`${cleanWords} ${plan.names[0]}`, cleanWords] : []), ...plan.names];
  const photon = names.map((q) =>
    getJson<{ features?: PhotonFeature[] }>(
      `${PHOTON}?${new URLSearchParams({ q, lat: String(centre.lat), lon: String(centre.lng), bbox: `${area.west},${area.south},${area.east},${area.north}`, limit: "20", lang: "en" })}`,
      false,
    ).then((body) => (body.features ?? []).map(fromPhoton)),
  );
  const nominatim = (async () => {
    const found: (OsmPlace | null)[] = [];
    for (const q of plan.categories) {
      const rows = await getJson<NominatimRow[]>(
        `${NOMINATIM}/search?${new URLSearchParams({ q, format: "jsonv2", limit: "40", bounded: "1", viewbox: `${area.west},${area.north},${area.east},${area.south}`, addressdetails: "1", extratags: "1" })}`,
        true,
      );
      found.push(...rows.map(fromNominatim));
    }
    return found;
  })();
  const settled = await Promise.allSettled([...photon, nominatim]);
  if (settled.every((result) => result.status === "rejected")) throw new MapsUnavailableError();
  const byId = new Map<string, OsmPlace>();
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const place of result.value) {
      if (!place) continue;
      const known = byId.get(place.id);
      // Nominatim knows phones and websites; keep the richer copy.
      byId.set(place.id, known ? { ...known, phone: known.phone ?? place.phone, website: known.website ?? place.website, address: known.address ?? place.address } : place);
    }
  }
  return [...byId.values()];
}

/** One place by its OSM id, read again so the saved row matches the map, not the browser. */
export async function placeById(id: string): Promise<OsmPlace | null> {
  const match = /^(node|way|relation)\/(\d{1,15})$/.exec(id);
  if (!match) return null;
  const code = { node: "N", way: "W", relation: "R" }[match[1] as "node" | "way" | "relation"];
  const rows = await getJson<NominatimRow[]>(`${NOMINATIM}/lookup?${new URLSearchParams({ osm_ids: `${code}${match[2]}`, format: "jsonv2", addressdetails: "1", extratags: "1" })}`, true);
  const row = rows[0];
  if (!row) return null;
  // Lookup rows carry the name in namedetails or display_name only for some objects.
  return fromNominatim({ ...row, name: row.name || row.display_name?.split(",")[0] });
}
