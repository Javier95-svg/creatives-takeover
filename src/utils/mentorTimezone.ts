import type { Mentor } from "@/types/mentor";

interface CountryTimezone {
  country: string;
  timeZone: string;
}

const COUNTRY_TIMEZONES: Record<string, CountryTimezone> = {
  usa: { country: "United States", timeZone: "America/New_York" },
  us: { country: "United States", timeZone: "America/New_York" },
  unitedstates: { country: "United States", timeZone: "America/New_York" },
  unitedstatesofamerica: { country: "United States", timeZone: "America/New_York" },
  singapore: { country: "Singapore", timeZone: "Asia/Singapore" },
  pakistan: { country: "Pakistan", timeZone: "Asia/Karachi" },
  spain: { country: "Spain", timeZone: "Europe/Madrid" },
  bosniaandherzegovina: { country: "Bosnia and Herzegovina", timeZone: "Europe/Sarajevo" },
  bosniaherzegovina: { country: "Bosnia and Herzegovina", timeZone: "Europe/Sarajevo" },
  serbia: { country: "Serbia", timeZone: "Europe/Belgrade" },
  unitedkingdom: { country: "United Kingdom", timeZone: "Europe/London" },
  uk: { country: "United Kingdom", timeZone: "Europe/London" },
  greatbritain: { country: "United Kingdom", timeZone: "Europe/London" },
  britain: { country: "United Kingdom", timeZone: "Europe/London" },
  england: { country: "United Kingdom", timeZone: "Europe/London" },
  france: { country: "France", timeZone: "Europe/Paris" },
  romania: { country: "Romania", timeZone: "Europe/Bucharest" },
  india: { country: "India", timeZone: "Asia/Kolkata" },
  turkey: { country: "Turkey", timeZone: "Europe/Istanbul" },
  brazil: { country: "Brazil", timeZone: "America/Sao_Paulo" },
  argentina: { country: "Argentina", timeZone: "America/Argentina/Buenos_Aires" },
  kazakhstan: { country: "Kazakhstan", timeZone: "Asia/Almaty" },
  poland: { country: "Poland", timeZone: "Europe/Warsaw" },
  uae: { country: "United Arab Emirates", timeZone: "Asia/Dubai" },
  unitedarabemirates: { country: "United Arab Emirates", timeZone: "Asia/Dubai" },
  southafrica: { country: "South Africa", timeZone: "Africa/Johannesburg" },
  nigeria: { country: "Nigeria", timeZone: "Africa/Lagos" },
  lebanon: { country: "Lebanon", timeZone: "Asia/Beirut" },
  ukraine: { country: "Ukraine", timeZone: "Europe/Kyiv" },
  hungary: { country: "Hungary", timeZone: "Europe/Budapest" },
  armenia: { country: "Armenia", timeZone: "Asia/Yerevan" },
  lithuania: { country: "Lithuania", timeZone: "Europe/Vilnius" },
  costarica: { country: "Costa Rica", timeZone: "America/Costa_Rica" },
  kenya: { country: "Kenya", timeZone: "Africa/Nairobi" },
  portugal: { country: "Portugal", timeZone: "Europe/Lisbon" },
  estonia: { country: "Estonia", timeZone: "Europe/Tallinn" },
};

const normalizeCountryKey = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export const formatTimezoneLabel = (offset: number): string => {
  const sign = offset >= 0 ? "+" : "-";
  const absolute = Math.abs(offset);
  const hours = Math.floor(absolute);
  const minutes = Math.round((absolute - hours) * 60);

  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }

  return `GMT${sign}${hours}:${minutes.toString().padStart(2, "0")}`;
};

const toOffsetMinutes = (offset: number): number => Math.round(offset * 60);

const formatOptionCountryList = (countries: string[]): string => {
  if (countries.length <= 4) return countries.join(", ");

  const visibleCountries = countries.slice(0, 4).join(", ");
  return `${visibleCountries} +${countries.length - 4} more`;
};

export const getCurrentTimezoneOffset = (
  timeZone: string,
  referenceDate = new Date()
): number | null => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
    });
    const offsetLabel = formatter
      .formatToParts(referenceDate)
      .find((part) => part.type === "timeZoneName")?.value;

    if (!offsetLabel || offsetLabel === "GMT" || offsetLabel === "UTC") {
      return 0;
    }

    const match = offsetLabel.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/i);
    if (!match) return null;

    const sign = match[1] === "+" ? 1 : -1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] || "0");

    return sign * (hours + minutes / 60);
  } catch {
    return null;
  }
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
  if (name.includes("akshita") && name.includes("yadav")) return "India";
  if (name.includes("sakina") && name.includes("lokhandwala")) return "India";
  if (name.includes("rachel") && name.includes("yenko")) return "USA";
  if (name.includes("sophia") && (name.includes("pimenta") || name.includes("lopez"))) return "Portugal";
  if (name.includes("yasmine") && name.includes("caxeiro")) return "Brazil";
  if (name.includes("matias") && name.includes("pancorvo")) return "Argentina";
  if (name.includes("carolina") && name.includes("barthalot")) return "Spain";
  if (name.includes("lucas") && name.includes("annarattone")) return "Argentina";
  if (name.includes("artur") && name.includes("sindarsky")) return "Ukraine";
  if (name.includes("daiana") && name.includes("tokpayeva")) return "Kazakhstan";
  if (name.includes("karolina") && name.includes("urawska")) return "Poland";
  if (name.includes("ricardo") && name.includes("quiroga")) return "UAE";
  if (name.includes("katie") && name.includes("brett")) return "South Africa";
  if (name.includes("felicity") && name.includes("mukunju")) return "Kenya";
  if (name.includes("sharon") && name.includes("praise") && name.includes("akpunne")) return "United Kingdom";
  if (name.includes("vivian") && name.includes("ubochi")) return "Nigeria";
  if (name.includes("johnny") && name.includes("bou") && name.includes("malhab")) return "Lebanon";
  if (name.includes("albert") && name.includes("hovhannisyan")) return "Armenia";
  if (name.includes("matas") && name.includes("ramanauskas")) return "Lithuania";
  if (name.includes("pedro") && name.includes("monestel")) return "Costa Rica";
  if (name.includes("gabor") && (name.includes("hornik") || name.includes("homik"))) return "Hungary";
  if (name.includes("andrii") && name.includes("stakhov")) return "Estonia";

  return null;
};

export const getTimezoneOptions = (referenceDate = new Date()) => {
  const groupedCountries = new Map<number, Set<string>>();

  Object.values(COUNTRY_TIMEZONES).forEach(({ country, timeZone }) => {
    const offset = getCurrentTimezoneOffset(timeZone, referenceDate);
    if (offset === null) return;

    const offsetMinutes = toOffsetMinutes(offset);
    const countries = groupedCountries.get(offsetMinutes) ?? new Set<string>();
    countries.add(country);
    groupedCountries.set(offsetMinutes, countries);
  });

  return Array.from(groupedCountries.entries())
    .sort(([a], [b]) => a - b)
    .map(([offsetMinutes, countries]) => {
      const offset = offsetMinutes / 60;
      const countryList = Array.from(countries).sort();

      return {
        value: offset.toString(),
        label: `${formatTimezoneLabel(offset)} - ${formatOptionCountryList(countryList)}`,
        countries: countryList,
      };
    });
};

export const TIMEZONE_OPTIONS = getTimezoneOptions();

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
  mentor: Pick<Mentor, "name" | "nationality">,
  referenceDate = new Date()
): number | null => {
  const country = getMentorCountryForTimezone(mentor);
  if (!country) return null;
  const normalizedCountry = normalizeCountryKey(country);
  const timezone = COUNTRY_TIMEZONES[normalizedCountry]?.timeZone;
  if (!timezone) return null;

  return getCurrentTimezoneOffset(timezone, referenceDate);
};

export const isMentorInExactTimezone = (
  mentor: Pick<Mentor, "name" | "nationality">,
  selectedOffset: number,
  referenceDate = new Date()
): boolean => {
  const mentorOffset = getMentorTimezoneOffset(mentor, referenceDate);
  if (mentorOffset === null) return false;

  return toOffsetMinutes(mentorOffset) === toOffsetMinutes(selectedOffset);
};
