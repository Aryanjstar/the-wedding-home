export const couple = {
  bride: "Aanya Sharma",
  groom: "Kabir Mehta",
  short: "Aanya & Kabir",
  city: "Jaipur",
  dateLabel: "18 December 2026",
  dateIso: "2026-12-18",
  title: "Aanya & Kabir",
};

export const helplines = [
  { label: "At the gate", name: "Ritu Sharma", phone: "+91 98290 11021" },
  { label: "Family desk", name: "Arjun Mehta", phone: "+91 98111 44018" },
];

export type FunctionId = "haldi" | "mehendi" | "sangeet" | "wedding" | "reception";

export type FunctionTheme = {
  id: FunctionId;
  title: string;
  when: string;
  time: string;
  venue: string;
  address: string;
  mapsQuery: string;
  dress: string;
  about: string;
  badge: string;
  photo: string;
  wash: string;
  ink: string;
  hairline?: string;
};

export const functions: FunctionTheme[] = [
  {
    id: "haldi",
    title: "Haldi",
    when: "16 December 2026",
    time: "10:00 am",
    venue: "Rambagh Palace courtyard, Jaipur",
    address: "Bhawani Singh Road, Jaipur, Rajasthan",
    mapsQuery: "Rambagh Palace Jaipur",
    dress: "Yellow and ivory",
    about: "Turmeric for the couple, with both families in the courtyard. A morning function, close and bright.",
    badge: "Morning",
    photo: "/photos/haldi.jpg",
    wash: "#f4e7c8",
    ink: "#1a1814",
  },
  {
    id: "mehendi",
    title: "Mehendi",
    when: "16 December 2026",
    time: "4:00 pm",
    venue: "Rambagh verandah, Jaipur",
    address: "Bhawani Singh Road, Jaipur, Rajasthan",
    mapsQuery: "Rambagh Palace Jaipur",
    dress: "Green, terracotta, rose",
    about: "Henna on the verandah while the light goes. Sit, eat, and stay as long as the cones last.",
    badge: "Afternoon",
    photo: "/photos/mehendi.jpg",
    wash: "#e7ebdd",
    ink: "#1a1814",
  },
  {
    id: "sangeet",
    title: "Sangeet",
    when: "17 December 2026",
    time: "7:30 pm",
    venue: "Fairmont, Jaipur",
    address: "2, Amber Rd, Jaipur, Rajasthan",
    mapsQuery: "Fairmont Jaipur",
    dress: "Jewel tones",
    about: "A night of performances from both sides. The floor opens after the last set.",
    badge: "Evening",
    photo: "/photos/sangeet.jpg",
    wash: "#1a2030",
    ink: "#f7f3ea",
  },
  {
    id: "wedding",
    title: "Wedding",
    when: "18 December 2026",
    time: "Muhurat 8:14 pm",
    venue: "Rambagh Palace",
    address: "Bhawani Singh Road, Jaipur, Rajasthan",
    mapsQuery: "Rambagh Palace Jaipur",
    dress: "Ivory, red, gold",
    about: "The pheras at Rambagh. Guests are seated before the muhurat. The family will walk you to the lawn.",
    badge: "Muhurat 8:14 pm",
    photo: "/photos/wedding.jpg",
    wash: "#faf9f6",
    ink: "#1a1814",
    hairline: "#722f37",
  },
  {
    id: "reception",
    title: "Reception",
    when: "19 December 2026",
    time: "8:00 pm",
    venue: "Fairmont ballroom, Jaipur",
    address: "2, Amber Rd, Jaipur, Rajasthan",
    mapsQuery: "Fairmont Jaipur",
    dress: "Black tie, champagne",
    about: "Dinner and the couple’s entry. A quieter night after the wedding.",
    badge: "Night",
    photo: "/photos/reception.jpg",
    wash: "#14181f",
    ink: "#e7d7c1",
  },
];

export const families = [
  {
    side: "Bride",
    heading: "The Sharmas",
    blurb: "Aanya’s parents, Ritu and Vikram Sharma, live in Jaipur. Her brother Dev is hosting the sangeet set.",
    photo: "/photos/mehendi.jpg",
  },
  {
    side: "Groom",
    heading: "The Mehtas",
    blurb: "Kabir’s parents, Meera and Arjun Mehta, are coming from Delhi. The Mehendi verandah is their evening.",
    photo: "/photos/wedding.jpg",
  },
];

export const stays = [
  { name: "Rambagh Palace", note: "Wedding and Haldi. Ask the family desk for the room block." },
  { name: "Fairmont Jaipur", note: "Sangeet and reception. Ten minutes from Rambagh." },
];

export const blessings = [
  { author: "Dadi Sharma", relation: "Grandmother", message: "May the house you make be louder than the wedding." },
  { author: "Meera Mehta", relation: "Mother of the groom", message: "Come hungry. Leave with both families." },
];

export const households = [
  {
    name: "Mehta household",
    side: "Groom",
    reply: "4 yes",
    invited: ["Haldi", "Mehendi", "Sangeet", "Wedding", "Reception"],
    max: 6,
    diet: { veg: 2, nonVeg: 1, jain: 1 },
  },
  {
    name: "Sharma household",
    side: "Bride",
    reply: "Waiting",
    invited: ["Haldi", "Mehendi", "Sangeet", "Wedding", "Reception"],
    max: 5,
    diet: null,
  },
  {
    name: "Iyer household",
    side: "Other",
    reply: "No",
    invited: ["Wedding", "Reception"],
    max: 3,
    diet: null,
  },
];

export const tasks = {
  todo: [
    { title: "Confirm caterer count", who: "Ritu", priority: "high" as const },
    { title: "Print the gate list", who: "Dev", priority: "medium" as const },
  ],
  doing: [{ title: "Haldi playlist", who: "Kabir", priority: "low" as const }],
  done: [{ title: "Return the light deposit", who: "Arjun", priority: "medium" as const }],
};

export const expenses = [
  { title: "Venue", date: "2 Nov", amount: 1_200_000, category: "Venue", fn: "Wedding" },
  { title: "Catering", date: "18 Nov", amount: 480_000, category: "Food", fn: "All functions" },
  { title: "Flowers", date: "1 Dec", amount: 160_000, category: "Flowers", fn: "Wedding" },
];

export const vendors = [
  { name: "Photographer", cost: 300_000, person: "Leela Studio", phone: "+91 98290 22010", fn: "All functions" },
  { name: "Caterer", cost: 480_000, person: "Annapurna", phone: "+91 98100 11880", fn: "All functions" },
  { name: "Florist", cost: 160_000, person: "Marigold Room", phone: "+91 99280 44112", fn: "Wedding" },
];

export function inr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function daysUntilDate(dateIso: string, now: Date) {
  const target = Date.parse(`${dateIso}T00:00:00+05:30`);
  if (Number.isNaN(target)) return 0;
  return Math.max(0, Math.ceil((target - now.getTime()) / 86_400_000));
}

export function daysUntilWedding(now: Date) {
  return daysUntilDate(couple.dateIso, now);
}

export function mapsUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
