import type { CreatorPersona } from "./types";

export const presetCreators: CreatorPersona[] = [
  {
    id: "kabir",
    label: "Kabir",
    handle: "@kabir.fits",
    followers: 147000,
    followersLabel: "147k",
    niche: "fashion / streetwear",
    location: "Mumbai",
    recent_post:
      "a reel of him styling a single bandana five different ways, shot at Bandra Fort on Sunday",
    voice_description:
      "captions are short and punchy, lowercase. talks like he's permanently bored.",
    tier: "B",
  },
  {
    id: "aanya",
    label: "Aanya",
    handle: "@aanya.eats",
    followers: 89000,
    followersLabel: "89k",
    niche: "Bangalore food",
    location: "Bangalore",
    recent_post:
      "a deep-dive carousel about why South Indian filter coffee is having a moment again, with photos from three different darshinis",
    voice_description:
      "warm, chatty, asks a lot of questions, uses exclamation marks.",
    tier: "C",
  },
  {
    id: "rohit",
    label: "Rohit",
    handle: "@rohit.tldr",
    followers: 312000,
    followersLabel: "312k",
    niche: "Delhi news",
    location: "Delhi",
    recent_post:
      "a reel explaining the new digital india act in plain English",
    voice_description:
      "dry, professional, takes his work seriously.",
    tier: "A",
  },
];

export const rateSheet = {
  C: { floor: 8000, ceiling: 15000 },
  B: { floor: 15000, ceiling: 25000 },
  A: { floor: 25000, ceiling: 45000 },
} as const;

export function tierFromFollowers(followers: number): CreatorPersona["tier"] {
  if (followers >= 250000) {
    return "A";
  }

  if (followers >= 100000) {
    return "B";
  }

  return "C";
}

export function formatInr(value: number | null) {
  if (value === null) {
    return "not set";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function parseFollowerCount(raw: string) {
  const normalized = raw.trim().toLowerCase().replace(/,/g, "");
  const number = Number.parseFloat(normalized);

  if (Number.isNaN(number)) {
    return 0;
  }

  if (normalized.endsWith("m")) {
    return Math.round(number * 1_000_000);
  }

  if (normalized.endsWith("k")) {
    return Math.round(number * 1_000);
  }

  return Math.round(number);
}
