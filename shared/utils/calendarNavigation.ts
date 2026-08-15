export type CalendarMonth = {
  year: number;
  monthIndex: number;
};

export type RouteQuery = Record<string, string | string[] | undefined>;

const YEAR_MONTH_PATTERN = /^([1-9]\d{3})-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^([1-9]\d{3})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function getCurrentCalendarMonth(now = new Date()): CalendarMonth {
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

export function parseCalendarMonth(value: string | string[] | undefined): CalendarMonth | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = YEAR_MONTH_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
}

export function resolveCalendarMonth(
  value: string | string[] | undefined,
  now = new Date()
): CalendarMonth {
  return parseCalendarMonth(value) ?? getCurrentCalendarMonth(now);
}

export function formatCalendarMonth({ year, monthIndex }: CalendarMonth): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function shiftCalendarMonth(
  { year, monthIndex }: CalendarMonth,
  amount: number
): CalendarMonth {
  const shifted = new Date(year, monthIndex + amount, 1);
  return { year: shifted.getFullYear(), monthIndex: shifted.getMonth() };
}

export function isSameCalendarMonth(left: CalendarMonth, right: CalendarMonth): boolean {
  return left.year === right.year && left.monthIndex === right.monthIndex;
}

export function getCalendarMonthRange({ year, monthIndex }: CalendarMonth) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const month = String(monthIndex + 1).padStart(2, "0");

  return {
    daysInMonth,
    startDate: `${year}-${month}-01`,
    endDate: `${year}-${month}-${String(daysInMonth).padStart(2, "0")}`,
  };
}

export function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function parseCalendarDate(value: string | string[] | undefined): CalendarMonth | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, monthIndex, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== monthIndex ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return { year, monthIndex };
}

export function resolveNoteReturnMonth(
  month: string | string[] | undefined,
  noteDate: string | string[] | undefined,
  now = new Date()
): CalendarMonth {
  return parseCalendarMonth(month) ?? parseCalendarDate(noteDate) ?? getCurrentCalendarMonth(now);
}

export function createNoteQuery(query: RouteQuery, month: CalendarMonth): RouteQuery {
  const { date: _date, ...rest } = query;
  return { ...rest, month: formatCalendarMonth(month) };
}

export function createCalendarQuery(query: RouteQuery, month: CalendarMonth): RouteQuery {
  const { date: _date, ...rest } = query;
  return { ...rest, month: formatCalendarMonth(month) };
}
