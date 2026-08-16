import {
  createCalendarQuery,
  createNoteQuery,
  formatCalendarMonth,
  getCalendarMonthRange,
  resolveCalendarMonth,
  resolveNoteReturnMonth,
  shiftCalendarMonth,
} from "../calendarNavigation";

const fixedNow = new Date(2026, 6, 26, 12, 0, 0);

describe("calendar navigation", () => {
  it("uses the current local month when the query is missing or invalid", () => {
    expect(resolveCalendarMonth(undefined, fixedNow)).toEqual({ year: 2026, monthIndex: 6 });
    expect(resolveCalendarMonth("2026-7", fixedNow)).toEqual({ year: 2026, monthIndex: 6 });
    expect(resolveCalendarMonth("2026-13", fixedNow)).toEqual({ year: 2026, monthIndex: 6 });
  });

  it("uses a valid YYYY-MM query without UTC date conversion", () => {
    const month = resolveCalendarMonth("2026-01", fixedNow);

    expect(month).toEqual({ year: 2026, monthIndex: 0 });
    expect(formatCalendarMonth(month)).toBe("2026-01");
  });

  it("moves to previous, next, and explicitly selected months", () => {
    const january = { year: 2026, monthIndex: 0 };

    expect(shiftCalendarMonth(january, -1)).toEqual({ year: 2025, monthIndex: 11 });
    expect(shiftCalendarMonth(january, 1)).toEqual({ year: 2026, monthIndex: 1 });
    expect(resolveCalendarMonth("2024-11", fixedNow)).toEqual({ year: 2024, monthIndex: 10 });
  });

  it("keeps the note fetch range bounded to the displayed month", () => {
    expect(getCalendarMonthRange({ year: 2024, monthIndex: 1 })).toEqual({
      daysInMonth: 29,
      startDate: "2024-02-01",
      endDate: "2024-02-29",
    });
  });

  it("preserves a selected month through note navigation and close", () => {
    const july = resolveCalendarMonth("2026-07", fixedNow);
    const noteQuery = createNoteQuery({ month: "2026-07", filter: "tagged" }, july);
    const returnQuery = createCalendarQuery({ ...noteQuery, date: "2026-07-01" }, july);

    expect(noteQuery).toEqual({ month: "2026-07", filter: "tagged" });
    expect(returnQuery).toEqual({ month: "2026-07", filter: "tagged" });
  });

  it("falls back to the note month for a direct note URL and keeps it after reload", () => {
    expect(resolveNoteReturnMonth(undefined, "2026-07-01", fixedNow)).toEqual({
      year: 2026,
      monthIndex: 6,
    });
    expect(resolveNoteReturnMonth("2025-12", "2026-07-01", fixedNow)).toEqual({
      year: 2025,
      monthIndex: 11,
    });
    expect(resolveNoteReturnMonth(undefined, "not-a-date", fixedNow)).toEqual({
      year: 2026,
      monthIndex: 6,
    });
  });
});
