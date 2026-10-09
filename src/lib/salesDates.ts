type SaleDateRecord = {
  date?: string;
  createdAt?: string;
  updatedAt?: string;
};

const easternArabicDigits: Record<string, string> = {
  "\u0660": "0",
  "\u0661": "1",
  "\u0662": "2",
  "\u0663": "3",
  "\u0664": "4",
  "\u0665": "5",
  "\u0666": "6",
  "\u0667": "7",
  "\u0668": "8",
  "\u0669": "9",
  "\u06F0": "0",
  "\u06F1": "1",
  "\u06F2": "2",
  "\u06F3": "3",
  "\u06F4": "4",
  "\u06F5": "5",
  "\u06F6": "6",
  "\u06F7": "7",
  "\u06F8": "8",
  "\u06F9": "9",
};

const normalizeDateText = (value: string) =>
  value
    .replace(
      /[\u0660-\u0669\u06F0-\u06F9]/g,
      (digit) => easternArabicDigits[digit],
    )
    .replace(/[\u200e\u200f\u061c]/g, "")
    .replace(/\u060C/g, ",")
    .replace(/\u0635/g, "AM")
    .replace(/\u0645/g, "PM")
    .replace(/\s+/g, " ")
    .trim();

const normalizeYear = (year: string) => {
  const parsedYear = Number(year);
  return year.length === 2 ? 2000 + parsedYear : parsedYear;
};

const isSameDateParts = (
  date: Date,
  year: number,
  month: number,
  day: number,
) =>
  date.getFullYear() === year &&
  date.getMonth() === month - 1 &&
  date.getDate() === day;

const buildDate = ({
  year,
  month,
  day,
  hour,
  minute,
  second,
  period,
}: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  period?: string;
}) => {
  let parsedHour = hour;

  if (period?.toUpperCase() === "PM" && parsedHour < 12) parsedHour += 12;
  if (period?.toUpperCase() === "AM" && parsedHour === 12) parsedHour = 0;

  const date = new Date(year, month - 1, day, parsedHour, minute, second);

  return isSameDateParts(date, year, month, day) ? date.getTime() : 0;
};

const parseDateAndTimeParts = (datePart: string, timePart = "") => {
  const dateMatch = datePart.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  const timeMatch = timePart.match(
    /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?\s*(AM|PM)?$/i,
  );

  if (!dateMatch) return 0;

  const [, firstPart, secondPart, yearPart] = dateMatch;
  const first = Number(firstPart);
  const second = Number(secondPart);
  const year = normalizeYear(yearPart);
  const hour = timeMatch ? Number(timeMatch[1]) : 0;
  const minute = timeMatch?.[2] ? Number(timeMatch[2]) : 0;
  const secondValue = timeMatch?.[3] ? Number(timeMatch[3]) : 0;
  const period = timeMatch?.[4];

  if (!Number.isFinite(hour) || hour > 23 || minute > 59 || secondValue > 59) {
    return 0;
  }

  const candidates =
    first > 12
      ? [{ day: first, month: second }]
      : second > 12
        ? [{ day: second, month: first }]
        : [
            { day: second, month: first },
            { day: first, month: second },
          ];

  for (const candidate of candidates) {
    const timestamp = buildDate({
      year,
      month: candidate.month,
      day: candidate.day,
      hour,
      minute,
      second: secondValue,
      period,
    });

    if (timestamp) return timestamp;
  }

  return 0;
};

const parseLocaleDate = (value: string) => {
  const commaParts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (commaParts.length >= 2) {
    const [firstPart, secondPart] = commaParts;
    const dateFirst = parseDateAndTimeParts(firstPart, secondPart);
    if (dateFirst) return dateFirst;

    const timeFirst = parseDateAndTimeParts(secondPart, firstPart);
    if (timeFirst) return timeFirst;
  }

  const spacedMatch = value.match(
    /^(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s+(\d{1,2}(?::\d{2})?(?::\d{2})?\s*(?:AM|PM)?)$/i,
  );

  if (spacedMatch) {
    return parseDateAndTimeParts(spacedMatch[1], spacedMatch[2]);
  }

  return parseDateAndTimeParts(value);
};

export const parseSaleDate = (value?: string) => {
  if (!value) return 0;

  const normalized = normalizeDateText(value);

  if (!Number.isNaN(Number(normalized))) return Number(normalized);

  const nativeDate = Date.parse(normalized);
  if (!Number.isNaN(nativeDate)) return nativeDate;

  return parseLocaleDate(normalized);
};

export const getSaleTimestamp = (sale: SaleDateRecord) =>
  parseSaleDate(sale.date) ||
  parseSaleDate(sale.createdAt) ||
  parseSaleDate(sale.updatedAt);

export const isTimestampOnDay = (timestamp: number, date = new Date()) => {
  if (!timestamp) return false;

  const saleDate = new Date(timestamp);

  return (
    saleDate.getFullYear() === date.getFullYear() &&
    saleDate.getMonth() === date.getMonth() &&
    saleDate.getDate() === date.getDate()
  );
};

export const isSaleOnDate = (sale: SaleDateRecord, date = new Date()) =>
  isTimestampOnDay(getSaleTimestamp(sale), date);

export const sortSalesByDateDesc = <T extends SaleDateRecord>(sales: T[]) =>
  [...sales].sort((a, b) => getSaleTimestamp(b) - getSaleTimestamp(a));
