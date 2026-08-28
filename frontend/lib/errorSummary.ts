type ErrorLike = {
  code?: unknown;
  name?: unknown;
  response?: {
    status?: unknown;
  };
};

export const getErrorSummary = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return { name: "UnknownError" };
  }

  const errorLike = error as ErrorLike;
  return {
    name: typeof errorLike.name === "string" ? errorLike.name : "UnknownError",
    code:
      typeof errorLike.code === "string" || typeof errorLike.code === "number"
        ? errorLike.code
        : undefined,
    status:
      typeof errorLike.response?.status === "number"
        ? errorLike.response.status
        : undefined,
  };
};
