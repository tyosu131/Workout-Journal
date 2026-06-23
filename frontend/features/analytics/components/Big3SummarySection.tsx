import React from "react";
import {
  Badge,
  Box,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import type { Big3TrendSummary } from "../../../../shared/utils/big3Trend";
import type { ChartSeries } from "../../../../shared/utils/trainingGraphData";
import Big3EstimatedOneRepMaxChart from "./Big3EstimatedOneRepMaxChart";

type Big3SummarySectionProps = {
  summaries: Big3TrendSummary[];
  series: ChartSeries[];
};

const LIFT_COLORS = {
  squat: "green",
  bench: "blue",
  deadlift: "orange",
} as const;

const formatNumber = (value: number | null): string => {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
};

const Big3SummarySection: React.FC<Big3SummarySectionProps> = ({
  summaries,
  series,
}) => {
  const seriesByLift = new Map(series.map((item) => [item.id, item]));

  return (
    <Box as="section" aria-labelledby="big3-heading">
      <Heading id="big3-heading" as="h2" size="md" mb={4}>
        BIG3
      </Heading>
      <Box mb={6}>
        <Big3EstimatedOneRepMaxChart series={series} />
      </Box>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        {summaries.map((summary) => {
          const latest = summary.latestTopSet;
          const personalBest = summary.maxEstimatedOneRepMax;
          const chartSeries = seriesByLift.get(summary.liftType);

          return (
            <Box
              key={summary.liftType}
              border="1px solid"
              borderColor="gray.200"
              borderRadius="6px"
              p={4}
              minH="220px"
            >
              <Stack spacing={4}>
                <Box>
                  <Badge colorScheme={LIFT_COLORS[summary.liftType]} mb={2}>
                    {summary.liftType}
                  </Badge>
                  <Heading as="h3" size="sm">
                    {chartSeries?.label ?? summary.liftType}
                  </Heading>
                </Box>

                {latest ? (
                  <Stack spacing={1}>
                    <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                      Latest top set
                    </Text>
                    <Text fontWeight="semibold">{latest.exerciseName}</Text>
                    <Text fontSize="sm" color="gray.600">
                      {latest.date} | {formatNumber(latest.weight)} x {formatNumber(latest.reps)}
                    </Text>
                    <Text fontSize="sm">
                      Estimated 1RM: {formatNumber(latest.estimatedOneRepMax)}
                    </Text>
                  </Stack>
                ) : (
                  <Text color="gray.500">No data yet</Text>
                )}

                {personalBest && (
                  <Box borderTop="1px solid" borderColor="gray.100" pt={3}>
                    <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                      Best estimated 1RM
                    </Text>
                    <Text fontWeight="semibold">
                      {formatNumber(personalBest.estimatedOneRepMax)}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {personalBest.date}
                    </Text>
                  </Box>
                )}

                <Text fontSize="xs" color="gray.500">
                  {chartSeries?.points.length ?? 0} recorded points
                </Text>
              </Stack>
            </Box>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};

export default Big3SummarySection;
