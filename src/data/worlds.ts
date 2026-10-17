import { themePack, type ThemePack } from "@/data/theme-packs";

/**
 * Function worlds: the colour, motif, motion, and music of one function on the guest site.
 * A world is chosen from the function's kind, and an Admin can override it per function.
 * All music is original and generated in the browser, so it is rights-cleared by construction.
 */

export const worldIds = ["haldi", "mehendi", "sangeet", "pheras", "wedding", "reception", "engagement"] as const;
export type WorldId = (typeof worldIds)[number];

export const musicIds = [
  "bhairavi-shehnai",
  "yaman-shehnai-baraat",
  "phera-shankh",
  "dholak-boliyan",
  "bilawal-dhol",
  "ghoomar-mand",
  "bhimpalasi-dadra",
  "pilu-sarangi",
  "yaman-teental",
  "garba-dandiya",
  "dhol-bhangra",
  "qawwali-taali",
  "des-sitar",
  "kafi-santoor",
  "bageshri-bansuri",
  "tanpura",
  "kalyani-nadaswaram-thavil",
  "kettimelam",
  "shankarabharanam-nadaswaram",
  "mohanam-veena",
  "hamsadhwani-flute",
  "kolattam-sticks",
  "none",
] as const;
export type MusicId = (typeof musicIds)[number];

export type MotifId = "bandhani" | "jaali" | "ghungroo" | "gopuram" | "chhatri" | "toran" | "mandap";

export type World = {
  id: WorldId;
  label: string;
  script: string;
  region: string;
  motif: MotifId;
  motion: "playful" | "slow" | "dance" | "still";
  music: MusicId;
  /** Stage colours: sky and ground gradient, glow, line art, ink, and the accent for buttons. */
  sky: string;
  ground: string;
  glow: string;
  line: string;
  ink: string;
  accent: string;
  accentText: string;
  dark: boolean;
};

export const worlds: Record<WorldId, World> = {
  haldi: {
    id: "haldi",
    label: "Haldi",
    script: "हल्दी",
    region: "Rajasthan · bandhani and marigold",
    motif: "bandhani",
    motion: "playful",
    music: "dholak-boliyan",
    sky: "#f6d978",
    ground: "#e7b84a",
    glow: "#fff4c4",
    line: "#8a4b08",
    ink: "#2a1a06",
    accent: "#a5520c",
    accentText: "#fff8e6",
    dark: false,
  },
  mehendi: {
    id: "mehendi",
    label: "Mehendi",
    script: "मेहँदी",
    region: "Mughal north · henna and jaali",
    motif: "jaali",
    motion: "slow",
    music: "ghoomar-mand",
    sky: "#e7c4ae",
    ground: "#c9d4c4",
    glow: "#f3d7c8",
    line: "#3d5c45",
    ink: "#1d2a20",
    accent: "#3d5c45",
    accentText: "#f6f1e6",
    dark: false,
  },
  sangeet: {
    id: "sangeet",
    label: "Sangeet",
    script: "संगीत",
    region: "North dance night · ghungroo",
    motif: "ghungroo",
    motion: "dance",
    music: "dhol-bhangra",
    sky: "#1a2030",
    ground: "#12151c",
    glow: "#6b3a18",
    line: "#e7d7c1",
    ink: "#f7f3ea",
    accent: "#e0b15a",
    accentText: "#1a1208",
    dark: true,
  },
  pheras: {
    id: "pheras",
    label: "Pheras · North",
    script: "विवाह",
    region: "The mandap · agni, sindoor, and marigold",
    motif: "mandap",
    motion: "slow",
    music: "phera-shankh",
    sky: "#8e1b24",
    ground: "#4f0d15",
    glow: "#f5b041",
    line: "#f2cf86",
    ink: "#fff3e0",
    accent: "#f2b134",
    accentText: "#2a0a0e",
    dark: true,
  },
  wedding: {
    id: "wedding",
    label: "Wedding · South temple",
    script: "विवाह",
    region: "Temple and mandapam · gopuram and kolam",
    motif: "gopuram",
    motion: "slow",
    music: "kalyani-nadaswaram-thavil",
    sky: "#faf6f1",
    ground: "#f3d9d4",
    glow: "#ffffff",
    line: "#722f37",
    ink: "#2a1214",
    accent: "#8e1f2c",
    accentText: "#fff6ee",
    dark: false,
  },
  reception: {
    id: "reception",
    label: "Reception",
    script: "स्वागत",
    region: "Rajput palace · chhatri at night",
    motif: "chhatri",
    motion: "still",
    music: "bageshri-bansuri",
    sky: "#14181f",
    ground: "#1c1814",
    glow: "#3a342c",
    line: "#e7d7c1",
    ink: "#efe4d2",
    accent: "#d9b77c",
    accentText: "#16120c",
    dark: true,
  },
  engagement: {
    id: "engagement",
    label: "Roka and engagement",
    script: "सगाई",
    region: "The doorway · toran and mango leaves",
    motif: "toran",
    motion: "slow",
    music: "bhairavi-shehnai",
    sky: "#fbe9e4",
    ground: "#f1d3c8",
    glow: "#fff5ef",
    line: "#9c3d2e",
    ink: "#2b1410",
    accent: "#b0452f",
    accentText: "#fff7f2",
    dark: false,
  },
};

export type MusicInfo = { label: string; credit: string; region: "North" | "South" | "Everywhere"; instruments: string };

export const music: Record<Exclude<MusicId, "none">, MusicInfo> = {
  "bhairavi-shehnai": { label: "Bhairavi · shehnai", region: "North", instruments: "Shehnai, dholak, drone", credit: "A mangal shehnai phrase in Raga Bhairavi, the sound of an auspicious morning." },
  "yaman-shehnai-baraat": { label: "Baraat · shehnai and dhol", region: "North", instruments: "Shehnai, dhol, manjira", credit: "Raga Yaman on shehnai over a walking dhol, for the groom's procession." },
  "phera-shankh": { label: "Pheras · shehnai, shankh, bells", region: "North", instruments: "Shehnai, shankh, manjira, temple bells", credit: "Slow Bhairavi shehnai with the conch and bells, for the seven rounds of the fire." },
  "dholak-boliyan": { label: "Boliyan · dholak and chimta", region: "North", instruments: "Harmonium, dholak, chimta, claps", credit: "A Punjabi folk lilt in Raga Khamaj with dholak, chimta, and taali." },
  "bilawal-dhol": { label: "Bilawal · flute and dhol", region: "North", instruments: "Bansuri, dhol", credit: "A bright Raga Bilawal flute over a folk dhol." },
  "ghoomar-mand": { label: "Ghoomar · Raga Mand on sarangi", region: "North", instruments: "Sarangi, dholak, manjira, tanpura", credit: "Rajasthan's Raga Mand on a bowed sarangi, turning in a six-beat dadra." },
  "bhimpalasi-dadra": { label: "Bhimpalasi · santoor", region: "North", instruments: "Santoor, tabla, tanpura", credit: "Afternoon Raga Bhimpalasi on santoor in a slow dadra." },
  "pilu-sarangi": { label: "Pilu · sarangi", region: "North", instruments: "Sarangi, tabla, tanpura", credit: "Raga Pilu, light and tender, on sarangi with tabla." },
  "yaman-teental": { label: "Yaman · sitar and tabla", region: "North", instruments: "Sitar, tabla, ghungroo, tanpura", credit: "Evening Raga Yaman on sitar, with tabla and ankle bells." },
  "garba-dandiya": { label: "Garba · dhol and dandiya", region: "North", instruments: "Harmonium, dhol, dandiya sticks", credit: "A Gujarati six-eight garba with dhol and the click of dandiya sticks." },
  "dhol-bhangra": { label: "Bhangra · dhol and tumbi", region: "North", instruments: "Tumbi, dhol, chimta", credit: "A Punjabi bhangra chaal on dhol, with tumbi and chimta." },
  "qawwali-taali": { label: "Qawwali · harmonium and taali", region: "North", instruments: "Harmonium, dholak, hand claps", credit: "A Sufi night in Raga Kafi with harmonium, dholak, and claps." },
  "des-sitar": { label: "Des · sitar", region: "North", instruments: "Sitar, tabla, tanpura", credit: "Raga Des on sitar, the colour of the monsoon." },
  "kafi-santoor": { label: "Kafi · santoor", region: "North", instruments: "Santoor, tanpura", credit: "Raga Kafi on hammered santoor strings." },
  "bageshri-bansuri": { label: "Bageshri · bansuri", region: "North", instruments: "Bansuri, tabla, tanpura", credit: "Night Raga Bageshri on bamboo flute, unhurried." },
  tanpura: { label: "Tanpura · Sa and Pa", region: "Everywhere", instruments: "Tanpura", credit: "A tanpura drone on Sa and Pa. No melody." },
  "kalyani-nadaswaram-thavil": { label: "Kalyani · nadaswaram and thavil", region: "South", instruments: "Nadaswaram, thavil, shruti", credit: "Mangala vadyam in Raga Kalyani: nadaswaram with thavil in Adi talam." },
  kettimelam: { label: "Kettimelam · the muhurtham", region: "South", instruments: "Nadaswaram, thavil, bells", credit: "The fast, joyful crescendo that drowns everything as the thali is tied." },
  "shankarabharanam-nadaswaram": { label: "Shankarabharanam · nadaswaram", region: "South", instruments: "Nadaswaram, bells, shruti", credit: "Slow Raga Shankarabharanam on nadaswaram, with temple bells." },
  "mohanam-veena": { label: "Mohanam · veena and mridangam", region: "South", instruments: "Veena, mridangam, tanpura", credit: "Pentatonic Raga Mohanam on veena with mridangam." },
  "hamsadhwani-flute": { label: "Hamsadhwani · flute and mridangam", region: "South", instruments: "Carnatic flute, mridangam, tanpura", credit: "Raga Hamsadhwani, sung to open anything auspicious." },
  "kolattam-sticks": { label: "Kolattam · flute and sticks", region: "South", instruments: "Flute, mridangam, kolattam sticks", credit: "A South Indian stick dance for the nalangu and the haldi." },
};

/**
 * The best piece for each occasion, chosen once so every function plays something fitting by default.
 * An Admin can choose any other piece per function on Website & themes.
 */
export const occasionMusic: Record<string, MusicId> = {
  roka: "bhairavi-shehnai",
  engagement: "pilu-sarangi",
  haldi: "dholak-boliyan",
  mehendi: "ghoomar-mand",
  sangeet: "dhol-bhangra",
  cocktail: "qawwali-taali",
  wedding: "phera-shankh",
  reception: "bageshri-bansuri",
};

export function musicLabel(id: MusicId | null | undefined) {
  if (!id || id === "none") return null;
  return music[id];
}

export const packMusic: Record<string, MusicId> = {
  traditional: "bhairavi-shehnai",
  classical: "des-sitar",
  art: "kafi-santoor",
  choreography: "dhol-bhangra",
};

export function worldForKind(kind: string): WorldId | null {
  if (kind === "haldi" || kind === "mehendi" || kind === "sangeet" || kind === "reception") return kind;
  if (kind === "wedding") return "pheras";
  if (kind === "roka" || kind === "engagement") return "engagement";
  if (kind === "cocktail") return "sangeet";
  return null;
}

export type ThemeOverride = { world?: string | null; accent?: string | null; music?: string | null } | null | undefined;

export type ResolvedTheme = {
  pack: ThemePack;
  world: World;
  music: MusicId;
  accent: string;
};

function isWorld(value: unknown): value is WorldId {
  return typeof value === "string" && (worldIds as readonly string[]).includes(value);
}

function isMusic(value: unknown): value is MusicId {
  return typeof value === "string" && (musicIds as readonly string[]).includes(value);
}

/** Pack, then the function's own world, then the Admin's override for that function. */
export function resolveTheme(packId: string | null | undefined, kind: string, override?: ThemeOverride): ResolvedTheme {
  const pack = themePack(packId);
  const fromKind = worldForKind(kind);
  const worldId = isWorld(override?.world) ? override.world : fromKind ?? "pheras";
  const world = worlds[worldId];
  // An Admin's choice first; then, if they moved the function to another world, that world's music;
  // then the best piece for the occasion; a custom function plays the wedding pack's music.
  const musicId = isMusic(override?.music)
    ? override.music
    : isWorld(override?.world) && override.world !== fromKind
      ? world.music
      : occasionMusic[kind] ?? packMusic[pack.id] ?? "bhairavi-shehnai";
  const accent = override?.accent && /^#[0-9a-f]{6}$/i.test(override.accent) ? override.accent : world.accent;
  return { pack, world, music: musicId, accent };
}

/** CSS custom properties for a function stage. */
export function worldStyle(theme: ResolvedTheme): Record<string, string> {
  return {
    "--fn-sky": theme.world.sky,
    "--fn-ground": theme.world.ground,
    "--fn-glow": theme.world.glow,
    "--fn-line": theme.world.line,
    "--fn-ink": theme.world.ink,
    "--fn-accent": theme.accent,
    "--fn-accent-text": theme.world.accentText,
  };
}

export function packStyle(pack: ThemePack): Record<string, string> {
  return {
    "--theme-bg": pack.bg,
    "--theme-surface": pack.surface,
    "--theme-text": pack.text,
    "--theme-muted": pack.muted,
    "--theme-accent": pack.accent,
    "--theme-accent-text": pack.accentText,
  };
}
