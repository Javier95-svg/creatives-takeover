import { Mentor } from "@/types/mentor";

const TIMEZONE_OFFSETS = [
  -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1,
  0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 8, 9, 9.5,
  10, 11, 12, 13, 14,
];

const COUNTRY_TO_TIMEZONE_OFFSET: Record<string, number> = {
  usa: -5,
  us: -5,
  unitedstates: -5,
  unitedstatesofamerica: -5,
  singapore: 8,
  pakistan: 5,
  spain: 1,
  bosniaandherzegovina: 1,
  bosniaherzegovina: 1,
  unitedkingdom: 0,
  uk: 0,
  greatbritain: 0,
  britain: 0,
  england: 0,
  france: 1,
  romania: 2,
  india: 5.5,
  turkey: 3,
  brazil: -3,
  argentina: -3,
  kazakhstan: 6,
  poland: 1,
  uae: 4,
  unitedarabemirates: 4,
  southafrica: 2,
  nigeria: 1,
  lebanon: 2,
  ukraine: 2,
};

const normalizeCountryKey = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const formatTimezoneLabel = (offset: number): string => {
  const sign = offset >= 0 ? "+" : "-";
  const absolute = Math.abs(offset);
  const hours = Math.floor(absolute);
  const minutes = Math.round((absolute - hours) * 60);

  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }

  return `GMT${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
};

const resolveCountryFromMentorName = (mentorName: string): string | null => {
  const name = mentorName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ");

  if (name.includes("samuel")) return "USA";
  if (name.includes("nic") && name.includes("rayce")) return "Singapore";
  if (name.includes("irfan") && name.includes("malik")) return "Pakistan";
  if (name.includes("gonzalo") && name.includes("wanguemert")) return "Spain";
  if (
    name.includes("julio") &&
    name.includes("sanchez") &&
    name.includes("redondo")
  ) return "Spain";
  if (name.includes("jelena") && name.includes("dabovic")) return "Serbia";
  if (name.includes("marc") && name.includes("bright")) return "United Kingdom";
  if (name.includes("vashti") && name.includes("joseph")) return "France";
  if (name.includes("charlotte") && name.includes("joseph")) return "France";
  if (name.includes("ramona") && name.includes("chihaia")) return "Romania";
  if (name.includes("dikshit") && name.includes("kukreja")) return "India";
  if (name.includes("delraj") && name.includes("uppal")) return "United Kingdom";
  if (name.includes("ceren") && name.includes("aslan")) return "Turkey";
  if (name.includes("parnika") && name.includes("sharma")) return "India";
  if (name.includes("rachel") && name.includes("yenko")) return "USA";
  if (name.includes("sophia") && (name.includes("pimenta") || name.includes("lopez"))) return "Brazil";
  if (name.includes("matias") && name.includes("pancorvo")) return "Argentina";
  if (name.includes("carolina") && name.includes("barthalot")) return "Argentina";
  if (name.includes("lucas") && name.includes("annarattone")) return "Argentina";
  if (name.includes("artur") && name.includes("sindarsky")) return "Ukraine";
  if (name.includes("daiana") && name.includes("tokpayeva")) return "Kazakhstan";
  if (name.includes("karolina") && name.includes("urawska")) return "Poland";
  if (name.includes("ricardo") && name.includes("quiroga")) return "UAE";
  if (name.includes("katie") && name.includes("brett")) return "South Africa";
  if (name.includes("sharon") && name.includes("praise") && name.includes("akpunne")) return "United Kingdom";
  if (name.includes("vivian") && name.includes("ubochi")) return "Nigeria";
  if (name.includes("johnny") && name.includes("bou") && name.includes("malhab")) return "Lebanon";
  if (name.includes("gabor") && name.includes("hornik")) return "Hungary";

  return null;
};

export const TIMEZONE_OPTIONS = TIMEZONE_OFFSETS.map((offset) => ({
  value: offset.toString(),
  label: formatTimezoneLabel(offset),
}));

export const parseTimezoneOffset = (timezoneValue: string | null | undefined): number | null => {
  if (!timezoneValue) return null;

  const numeric = Number(timezoneValue);
  if (!Number.isNaN(numeric)) return numeric;

  const match = timezoneValue.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/i);
  if (!match) return null;

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || "0");
  return sign * (hours + minutes / 60);
};

export const getMentorCountryForTimezone = (
  mentor: Pick<Mentor, "name" | "nationality">
): string | null => {
  if (mentor.nationality) return mentor.nationality;
  return resolveCountryFromMentorName(mentor.name);
};

export const getMentorTimezoneOffset = (
  mentor: Pick<Mentor, "name" | "nationality">
): number | null => {
  const country = getMentorCountryForTimezone(mentor);
  if (!country) return null;
  const normalizedCountry = normalizeCountryKey(country);
  return COUNTRY_TO_TIMEZONE_OFFSET[normalizedCountry] ?? null;
};

export const isMentorWithinTimezoneRange = (
  mentor: Pick<Mentor, "name" | "nationality">,
  selectedOffset: number,
  allowedDifferenceHours = 1
): boolean => {
  const mentorOffset = getMentorTimezoneOffset(mentor);
  if (mentorOffset === null) return false;

  const absoluteDifference = Math.abs(mentorOffset - selectedOffset);
  const wrappedDifference = 24 - absoluteDifference;
  const difference = Math.min(absoluteDifference, wrappedDifference);

  return difference <= allowedDifferenceHours;
};
