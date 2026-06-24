export type SetIntensityInput = {
  rpe?: string | number | null;
  rir?: string | number | null;
  failure?: boolean | string | null;
};

export type NormalizedSetIntensity = {
  rpe: number | null;
  rir: number | null;
  failure: boolean | null;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeBoundedNumber = (
  value: unknown,
  min: number,
  max: number
): number | null => {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
};

export const normalizeRpe = (value: unknown): number | null => (
  normalizeBoundedNumber(value, 1, 10)
);

export const normalizeRir = (value: unknown): number | null => (
  normalizeBoundedNumber(value, 0, 10)
);

export const normalizeFailure = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (normalized === "") {
    return null;
  }

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return null;
};

const isRecord = (input: unknown): input is Record<string, unknown> => (
  typeof input === "object" && input !== null
);

export const normalizeSetIntensity = (
  input: unknown
): NormalizedSetIntensity => {
  if (!isRecord(input)) {
    return {
      rpe: null,
      rir: null,
      failure: null,
    };
  }

  return {
    rpe: normalizeRpe(input.rpe),
    rir: normalizeRir(input.rir),
    failure: normalizeFailure(input.failure),
  };
};
