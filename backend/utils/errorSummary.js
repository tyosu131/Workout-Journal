const getErrorSummary = (error) => {
  if (!error || typeof error !== "object") {
    return { name: "UnknownError" };
  }

  return {
    name: typeof error.name === "string" ? error.name : "UnknownError",
    code:
      typeof error.code === "string" || typeof error.code === "number"
        ? error.code
        : undefined,
    status: typeof error.status === "number" ? error.status : undefined,
  };
};

module.exports = { getErrorSummary };
