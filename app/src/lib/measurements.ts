import type { MeasurementDTO, MeasurementKind } from "../api/nutritionApi";

export const KINDS: MeasurementKind[] = [
  "weight",
  "body_fat",
  "waist",
  "chest",
  "hips",
  "shoulders",
  "bicep",
  "forearm",
  "thigh",
  "calf",
  "neck",
];

export const KIND_LABEL: Record<MeasurementKind, string> = {
  weight: "Weight",
  body_fat: "Body fat",
  waist: "Waist",
  chest: "Chest",
  hips: "Hips",
  shoulders: "Shoulders",
  bicep: "Bicep",
  forearm: "Forearm",
  thigh: "Thigh",
  calf: "Calf",
  neck: "Neck",
};

/** Stored metric: kg for weight, % for body fat, cm for every tape measurement. */
export const KIND_UNIT: Record<MeasurementKind, string> = {
  weight: "kg",
  body_fat: "%",
  waist: "cm",
  chest: "cm",
  hips: "cm",
  shoulders: "cm",
  bicep: "cm",
  forearm: "cm",
  thigh: "cm",
  calf: "cm",
  neck: "cm",
};

/** One decimal place, without a trailing ".0" ("72" not "72.0", "72.4" stays). */
export function formatReading(value: number, _kind?: MeasurementKind): string {
  return String(Math.round(value * 10) / 10);
}

/** Difference between the newest reading and the oldest in the list (readings are oldest-first), or null with fewer than two. */
export function changeOverPeriod(readings: Pick<MeasurementDTO, "date" | "value">[]): { delta: number; since: string } | null {
  if (readings.length < 2) return null;
  const first = readings[0];
  const last = readings[readings.length - 1];
  return { delta: Math.round((last.value - first.value) * 10) / 10, since: first.date };
}
