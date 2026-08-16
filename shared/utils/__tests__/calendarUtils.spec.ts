import { generateCalendarDates } from '../calendarUtils';

describe('generateCalendarDates', () => {
  it('与えられた月と年に対して正しいカレンダーの日付を生成するべき', () => {
    const year = 2024;
    const month = 5; // June (zero-based index)
    const dates = generateCalendarDates(year, month);

    expect(dates).toHaveLength(42); // June 2024 has 42 displayed calendar slots, including empty slots

    // Check the first day of the month
    expect(dates[0]).toBeNull(); // May 26, 2024 is Sunday, so the first slot is empty
    expect(dates[6]).toEqual({ date: '2024-06-01' });

    // Check the last day of the month
    expect(dates[41]).toBeNull(); // July 6, 2024 is Saturday, so the last slot is empty

    // Check a day in the middle of the month
    expect(dates[10]).toEqual({ date: '2024-06-05' });
  });

  it('週の始めに空のスロットを正しく生成するべき', () => {
    const year = 2024;
    const month = 1; // February (zero-based index)
    const dates = generateCalendarDates(year, month);

    expect(dates).toHaveLength(42); // February 2024 has 42 displayed calendar slots, including empty slots

    // Check the first day of the month
    expect(dates[0]).toBeNull(); // January 28, 2024 is Sunday, so the first slot is empty
    expect(dates[4]).toEqual({ date: '2024-02-01' });
  });

  it('週の終わりに空のスロットを正しく生成するべき', () => {
    const year = 2024;
    const month = 9; // October (zero-based index)
    const dates = generateCalendarDates(year, month);

    expect(dates).toHaveLength(42); // October 2024 has 42 displayed calendar slots, including empty slots

    // Check the last day of the month
    expect(dates[41]).toBeNull(); // November 3, 2024 is Sunday, so the last slot is empty
    expect(dates[32]).toEqual({ date: '2024-10-31' }); // October 31 is in the correct position
  });
});
