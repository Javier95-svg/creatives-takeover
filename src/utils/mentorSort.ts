import { Mentor } from "@/types/mentor";

const mentorNameCollator = new Intl.Collator("en", {
  sensitivity: "base",
  ignorePunctuation: true,
  numeric: true,
});

export const normalizeMentorSortName = (name: string) =>
  name.trim().replace(/\s+/g, " ");

export const compareMentorNames = (aName: string, bName: string) =>
  mentorNameCollator.compare(
    normalizeMentorSortName(aName),
    normalizeMentorSortName(bName)
  );

export const sortMentorsAlphabetically = <T extends Pick<Mentor, "name">>(
  mentors: T[]
) => [...mentors].sort((a, b) => compareMentorNames(a.name, b.name));
