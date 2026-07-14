export const REGIONS = [
  "United States",
  "European Union",
  "United Kingdom",
  "Japan",
  "Canada",
  "Australia",
  "Mexico",
  "Brazil",
  "Argentina",
  "Chile",
  "Colombia",
  "Peru",
  "Global/Other",
] as const;

export type Region = (typeof REGIONS)[number];

export const THERAPEUTIC_LINES = [
  "Oncology",
  "Cardiology",
  "Immunology",
  "Neurology",
  "Infectious Disease",
  "Rare Disease",
  "Endocrinology/Diabetes",
  "Respiratory",
  "Dermatology",
  "Gastroenterology",
  "Hematology",
  "Ophthalmology",
  "Vaccines",
  "Other/Unspecified",
] as const;

export type TherapeuticLine = (typeof THERAPEUTIC_LINES)[number];

export const RELEASE_TYPES = ["approval", "launch", "pipeline"] as const;

export type ReleaseType = (typeof RELEASE_TYPES)[number];

export function isRegion(value: string): value is Region {
  return (REGIONS as readonly string[]).includes(value);
}

export function isTherapeuticLine(value: string): value is TherapeuticLine {
  return (THERAPEUTIC_LINES as readonly string[]).includes(value);
}

export function isReleaseType(value: string): value is ReleaseType {
  return (RELEASE_TYPES as readonly string[]).includes(value);
}
