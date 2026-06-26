const MAX_RANGE_DAYS = 183;

const RAW_NOTE_FIELD_NAMES = new Set([
  "rawNoteText",
  "rawNotes",
  "notes",
  "noteText",
]);

const isRecord = (value) => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const parseDateOnly = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return {
    value,
    timestamp,
  };
};

const findRawNoteField = (value) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRawNoteField(item);
      if (found !== null) {
        return found;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const key of Object.keys(value)) {
    if (RAW_NOTE_FIELD_NAMES.has(key)) {
      return key;
    }

    const found = findRawNoteField(value[key]);
    if (found !== null) {
      return found;
    }
  }

  return null;
};

const validateWeeklySummaryRequest = (body) => {
  const errors = [];

  if (!isRecord(body)) {
    return {
      ok: false,
      value: null,
      errors: ["Request body must be an object."],
    };
  }

  const rawNoteField = findRawNoteField(body);
  if (rawNoteField !== null) {
    errors.push(`Raw note content field is not allowed: ${rawNoteField}.`);
  }

  const rangeStart = parseDateOnly(body.rangeStart);
  if (rangeStart === null) {
    errors.push("rangeStart must be a valid YYYY-MM-DD date.");
  }

  const rangeEnd = parseDateOnly(body.rangeEnd);
  if (rangeEnd === null) {
    errors.push("rangeEnd must be a valid YYYY-MM-DD date.");
  }

  if (!isRecord(body.summaryInput)) {
    errors.push("summaryInput must be an object.");
  }

  if (rangeStart !== null && rangeEnd !== null) {
    if (rangeEnd.timestamp < rangeStart.timestamp) {
      errors.push("rangeEnd must be on or after rangeStart.");
    } else {
      const rangeDays = Math.floor(
        (rangeEnd.timestamp - rangeStart.timestamp) / 86400000
      ) + 1;

      if (rangeDays > MAX_RANGE_DAYS) {
        errors.push(`Date range must be ${MAX_RANGE_DAYS} days or less.`);
      }
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      value: null,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      rangeStart: rangeStart.value,
      rangeEnd: rangeEnd.value,
      summaryInput: body.summaryInput,
    },
    errors: [],
  };
};

module.exports = {
  MAX_RANGE_DAYS,
  validateWeeklySummaryRequest,
};
