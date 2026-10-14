import type { FunctionId } from "@/data/sample";

export type MotifId = "bandhani" | "jaali" | "ghungroo" | "gopuram" | "chhatri";

export type FunctionWorld = {
  id: FunctionId;
  script: string;
  region: string;
  motif: MotifId;
  motion: "playful" | "slow" | "dance" | "still";
  sound: string;
  credit: string;
};

export const functionWorlds: Record<FunctionId, FunctionWorld> = {
  haldi: {
    id: "haldi",
    script: "हल्दी",
    region: "Rajasthan · bandhani and marigold",
    motif: "bandhani",
    motion: "playful",
    sound: "Bilawal · keherwa",
    credit: "An original phrase in Raga Bilawal, with an eight-beat folk pulse.",
  },
  mehendi: {
    id: "mehendi",
    script: "मेहँदी",
    region: "Mughal north · henna and jaali",
    motif: "jaali",
    motion: "slow",
    sound: "Bhimpalasi · dadra",
    credit: "An original phrase in Raga Bhimpalasi, in a slow six-beat dadra.",
  },
  sangeet: {
    id: "sangeet",
    script: "संगीत",
    region: "North dance night · ghungroo",
    motif: "ghungroo",
    motion: "dance",
    sound: "Yaman · teental",
    credit: "An original phrase in Raga Yaman, on a sixteen-beat teental.",
  },
  wedding: {
    id: "wedding",
    script: "विवाह",
    region: "South temple · gopuram and kolam",
    motif: "gopuram",
    motion: "slow",
    sound: "Shankarabharanam · nadaswaram",
    credit: "An original phrase in Raga Shankarabharanam, voiced like a nadaswaram.",
  },
  reception: {
    id: "reception",
    script: "स्वागत",
    region: "Rajput palace · chhatri at night",
    motif: "chhatri",
    motion: "still",
    sound: "Tanpura · Sa and Pa",
    credit: "An original tanpura drone on Sa and Pa. No melody.",
  },
};
