export const themePackIds = ["traditional", "classical", "art", "choreography"] as const;

export type ThemePackId = (typeof themePackIds)[number];

export type ThemePack = {
  id: ThemePackId;
  label: string;
  soul: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
};

export const themePacks: Record<ThemePackId, ThemePack> = {
  traditional: {
    id: "traditional",
    label: "Traditional",
    soul: "Maroon, ivory, and gold",
    bg: "#f6efe4",
    surface: "#fffaf3",
    text: "#3b1d1a",
    muted: "#7a5a4a",
    accent: "#7a1f2b",
    accentText: "#fff8ee",
  },
  classical: {
    id: "classical",
    label: "Classical",
    soul: "Ivory and deep green",
    bg: "#f4f1e8",
    surface: "#fbfaf6",
    text: "#1c2a24",
    muted: "#5c6b62",
    accent: "#1f4d3a",
    accentText: "#f7f3e8",
  },
  art: {
    id: "art",
    label: "Art",
    soul: "Painterly clay and paper",
    bg: "#f3efe8",
    surface: "#fffdf8",
    text: "#2a241c",
    muted: "#6d6458",
    accent: "#c46b3a",
    accentText: "#fffaf4",
  },
  choreography: {
    id: "choreography",
    label: "Choreography",
    soul: "Jewel night and gold type",
    bg: "#140e18",
    surface: "#221828",
    text: "#f6efe6",
    muted: "#c4b3c0",
    accent: "#e0b15a",
    accentText: "#1a1208",
  },
};

export function themePack(id: string | null | undefined): ThemePack {
  if (id && id in themePacks) return themePacks[id as ThemePackId];
  return themePacks.classical;
}
