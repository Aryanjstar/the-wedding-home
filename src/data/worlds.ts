import { themePack, type ThemePack } from "@/data/theme-packs";

/**
 * Function worlds: the colour, motif, motion, and music of one function on the guest site.
 * A world is chosen from the function's kind, and an Admin can override it per function.
 * All music is original and generated in the browser, so it is rights-cleared by construction.
 */

export const worldIds = ["haldi", "mehendi", "sangeet", "wedding", "reception", "engagement"] as const;
export type WorldId = (typeof worldIds)[number];

export const musicIds = [
  "bilawal-dhol",
  "bhimpalasi-dadra",
  "yaman-teental",
  "shankarabharanam-nadaswaram",
  "tanpura",
  "bhairavi-shehnai",
  "des-sitar",
  "kafi-santoor",
  "dhol-bhangra",
  "none",
] as const;
export type MusicId = (typeof musicIds)[number];

export type MotifId = "bandhani" | "jaali" | "ghungroo" | "gopuram" | "chhatri" | "toran";

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
    music: "bilawal-dhol",
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
    music: "bhimpalasi-dadra",
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
    music: "yaman-teental",
    sky: "#1a2030",
    ground: "#12151c",
    glow: "#6b3a18",
    line: "#e7d7c1",
    ink: "#f7f3ea",
    accent: "#e0b15a",
    accentText: "#1a1208",
    dark: true,
  },
  wedding: {
    id: "wedding",
    label: "Wedding",
    script: "विवाह",
    region: "Temple and mandap · gopuram and kolam",
    motif: "gopuram",
    motion: "slow",
    music: "shankarabharanam-nadaswaram",
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
    music: "tanpura",
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

export const music: Record<Exclude<MusicId, "none">, { label: string; credit: string }> = {
  "bilawal-dhol": { label: "Bilawal · dhol", credit: "An original phrase in Raga Bilawal over a folk dhol pulse." },
  "bhimpalasi-dadra": { label: "Bhimpalasi · dadra", credit: "An original phrase in Raga Bhimpalasi, in a slow six-beat dadra." },
  "yaman-teental": { label: "Yaman · teental", credit: "An original phrase in Raga Yaman with tabla and ghungroo." },
  "shankarabharanam-nadaswaram": { label: "Shankarabharanam · nadaswaram", credit: "An original phrase in Raga Shankarabharanam, voiced like a nadaswaram, with temple bells." },
  tanpura: { label: "Tanpura · Sa and Pa", credit: "An original tanpura drone on Sa and Pa." },
  "bhairavi-shehnai": { label: "Bhairavi · shehnai", credit: "An original shehnai-like phrase in Raga Bhairavi." },
  "des-sitar": { label: "Des · sitar", credit: "An original plucked phrase in Raga Des over a tanpura." },
  "kafi-santoor": { label: "Kafi · santoor", credit: "An original hammered phrase in Raga Kafi." },
  "dhol-bhangra": { label: "Dhol · bhangra", credit: "An original dhol and chimta groove." },
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
  if (kind === "haldi" || kind === "mehendi" || kind === "sangeet" || kind === "wedding" || kind === "reception") return kind;
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
  const worldId = isWorld(override?.world) ? override.world : worldForKind(kind) ?? "wedding";
  const world = worlds[worldId];
  const fromKind = worldForKind(kind);
  const musicId = isMusic(override?.music) ? override.music : fromKind ? world.music : packMusic[pack.id] ?? "none";
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
