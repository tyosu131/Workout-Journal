import { apiRequestWithAuth } from "../../../lib/apiClient";
import type { WeeklySummaryInput } from "../../../../shared/utils/weeklySummaryInput";
import type { RuleBasedWeeklySummary } from "../../../../shared/utils/ruleBasedWeeklySummary";

export type WeeklySummaryEndpointSource = "ai" | "rule_based_fallback";

export type GenerateWeeklySummaryRequest = {
  rangeStart: string;
  rangeEnd: string;
  summaryInput: WeeklySummaryInput;
};

export type GenerateWeeklySummaryResponse = {
  source: WeeklySummaryEndpointSource;
  summary: RuleBasedWeeklySummary;
  validationErrors: string[];
};

export const generateWeeklySummaryAPI = async (
  request: GenerateWeeklySummaryRequest
): Promise<GenerateWeeklySummaryResponse> => (
  apiRequestWithAuth<GenerateWeeklySummaryResponse, GenerateWeeklySummaryRequest>(
    "/analytics/weekly-summary",
    "post",
    request
  )
);
