export type BirthDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type NamingRate = "good" | "normal" | "bad";

export type NamingOutcome = "good" | "okay" | "bad" | "empty";

export type NamingComponent = {
  text: string;
  initial: string;
  dayNumber: BirthDay;
  astro: string;
  meaningMon: string;
  meaningEnglish: string;
  rate: NamingRate;
};

export type NamingReading = {
  source: string;
  name: string;
  ignoredTitle: string | null;
  components: NamingComponent[];
  badCount: number;
  outcome: NamingOutcome;
};

export const WEEKDAYS: ReadonlyArray<{
  id: BirthDay;
  short: string;
  english: string;
  mon: string;
}> = [
  { id: 1, short: "SUN", english: "Sunday", mon: "တ္ၚဲအဒိုတ်" },
  { id: 2, short: "MON", english: "Monday", mon: "တ္ၚဲစန်" },
  { id: 3, short: "TUE", english: "Tuesday", mon: "တ္ၚဲအၚာ" },
  { id: 4, short: "WED", english: "Wednesday", mon: "တ္ၚဲဗုဒ္ဓဝါ" },
  { id: 5, short: "THU", english: "Thursday", mon: "တ္ၚဲဗြဴပတိ" },
  { id: 6, short: "FRI", english: "Friday", mon: "တ္ၚဲသိုက်" },
  { id: 7, short: "SAT", english: "Saturday", mon: "တ္ၚဲသ္ၚိသဝ်" },
] as const;

const TITLES = ["မာံ", "နာဲ", "မိ"] as const;

const DAY_INITIALS: ReadonlyArray<readonly string[]> = [
  ["အ"],
  ["က", "ခ", "ဂ", "ဃ", "ၚ", "င"],
  ["စ", "ဆ", "ဇ", "ၛ", "ဈ", "ည"],
  ["ယ", "ရ", "လ", "ဝ"],
  ["ပ", "ဖ", "ဗ", "ဘ", "မ"],
  ["သ", "ဟ"],
  ["တ", "ထ", "ဒ", "ဓ", "န", "ဋ", "ဌ", "ဍ", "ဏ"],
] as const;

const ASTRO_ROWS: ReadonlyArray<{
  astro: string;
  numbersByBirthDay: readonly BirthDay[];
  meaningMon: string;
  meaningEnglish: string;
  rate: NamingRate;
}> = [
  { astro: "ခိုဟ်", numbersByBirthDay: [2, 3, 4, 5, 6, 7, 1], meaningMon: "သၟိၚ်", meaningEnglish: "King", rate: "good" },
  { astro: "သန်", numbersByBirthDay: [6, 7, 1, 2, 3, 4, 5], meaningMon: "သေဌဳ", meaningEnglish: "Wealth", rate: "good" },
  { astro: "ပြဲ", numbersByBirthDay: [5, 6, 7, 1, 2, 3, 4], meaningMon: "သမ္ၚေဟ်", meaningEnglish: "Glory", rate: "good" },
  { astro: "အဲ", numbersByBirthDay: [1, 2, 3, 4, 5, 6, 7], meaningMon: "နာံတ္ၚဲထပှ်", meaningEnglish: "Birth day", rate: "normal" },
  { astro: "တီ", numbersByBirthDay: [7, 1, 2, 3, 4, 5, 6], meaningMon: "ဒိုက်ဂတ်", meaningEnglish: "Poverty", rate: "bad" },
  { astro: "လဝ်", numbersByBirthDay: [4, 5, 6, 7, 1, 2, 3], meaningMon: "ပြိုတ်", meaningEnglish: "Loss", rate: "bad" },
  { astro: "ဇဳ", numbersByBirthDay: [3, 4, 5, 6, 7, 1, 2], meaningMon: "တိရစ္ဆာန်", meaningEnglish: "Animal", rate: "bad" },
] as const;

const INITIAL_TO_DAY = new Map<string, BirthDay>(
  DAY_INITIALS.flatMap((letters, index) =>
    letters.map((letter) => [letter, (index + 1) as BirthDay] as const),
  ),
);

function splitLeadingTitle(source: string) {
  const value = source.trim().replace(/\s+/gu, " ");
  const title = TITLES.find((candidate) => value.startsWith(candidate)) ?? null;

  if (!title) return { name: value, title: null };

  const rest = value.slice(title.length);
  return { name: rest.trimStart(), title };
}

function findInitials(name: string) {
  const characters = Array.from(name);
  const found: Array<{ index: number; initial: string; dayNumber: BirthDay }> = [];

  characters.forEach((character, index) => {
    const dayNumber = INITIAL_TO_DAY.get(character);
    if (!dayNumber) return;

    const previous = characters[index - 1];
    const next = characters[index + 1];
    if (previous === "္" || next === "်") return;

    found.push({ index, initial: character, dayNumber });
  });

  return { characters, found };
}

export function readMonName(source: string, birthDay: BirthDay): NamingReading {
  const { name, title } = splitLeadingTitle(source);
  const { characters, found } = findInitials(name);

  const components = found.map((item, index): NamingComponent => {
    const end = found[index + 1]?.index ?? characters.length;
    const text = characters.slice(item.index, end).join("").trim();
    const row = ASTRO_ROWS.find(
      (candidate) => candidate.numbersByBirthDay[birthDay - 1] === item.dayNumber,
    );

    if (!row) throw new Error("Naming matrix is incomplete.");

    return {
      text,
      initial: item.initial,
      dayNumber: item.dayNumber,
      astro: row.astro,
      meaningMon: row.meaningMon,
      meaningEnglish: row.meaningEnglish,
      rate: row.rate,
    };
  });

  const badCount = components.filter((component) => component.rate === "bad").length;
  const outcome: NamingOutcome = components.length === 0
    ? "empty"
    : badCount >= 2
      ? "bad"
      : badCount === 1
        ? "okay"
        : "good";

  return {
    source,
    name,
    ignoredTitle: title,
    components,
    badCount,
    outcome,
  };
}
