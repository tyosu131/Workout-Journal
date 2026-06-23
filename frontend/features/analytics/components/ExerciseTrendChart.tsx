import React from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  ChartSeries,
  ExerciseMetric,
} from "../../../../shared/utils/trainingGraphData";

type ExerciseTrendChartProps = {
  exerciseName: string;
  metric: ExerciseMetric;
  series: ChartSeries;
};

type ExerciseTrendTooltipPayload = {
  color?: string;
  value?: number | string;
};

type ExerciseTrendTooltipProps = {
  active?: boolean;
  label?: string;
  metric: ExerciseMetric;
  payload?: ExerciseTrendTooltipPayload[];
};

const METRIC_LABELS: Record<ExerciseMetric, {
  ariaLabel: string;
  title: string;
  tooltipLabel: string;
  yAxisLabel: string;
}> = {
  estimatedOneRepMax: {
    ariaLabel: "Exercise estimated one rep max trend chart",
    title: "Estimated 1RM Trend",
    tooltipLabel: "Estimated 1RM",
    yAxisLabel: "Estimated 1RM",
  },
  weight: {
    ariaLabel: "Exercise weight trend chart",
    title: "Weight Trend",
    tooltipLabel: "Weight",
    yAxisLabel: "Weight",
  },
  volumeLoad: {
    ariaLabel: "Exercise volume load trend chart",
    title: "Volume Load Trend",
    tooltipLabel: "Volume Load",
    yAxisLabel: "Volume Load",
  },
  reps: {
    ariaLabel: "Exercise reps trend chart",
    title: "Reps Trend",
    tooltipLabel: "Reps",
    yAxisLabel: "Reps",
  },
};

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
}).format(value);

const toPositiveNumber = (value: number | string | undefined): number | null => {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
};

const ExerciseTrendTooltip: React.FC<ExerciseTrendTooltipProps> = ({
  active,
  label,
  metric,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const value = toPositiveNumber(payload[0]?.value);
  if (value === null) {
    return null;
  }

  return (
    <Box
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="6px"
      boxShadow="sm"
      p={3}
    >
      <Text fontSize="sm" fontWeight="semibold" mb={2}>
        {label}
      </Text>
      <Text color={payload[0]?.color ?? "gray.700"} fontSize="sm">
        {METRIC_LABELS[metric].tooltipLabel}: {formatNumber(value)}
      </Text>
    </Box>
  );
};

const ExerciseTrendChart: React.FC<ExerciseTrendChartProps> = ({
  exerciseName,
  metric,
  series,
}) => {
  const metricLabels = METRIC_LABELS[metric];
  const points = series.points.map((point) => ({
    date: point.x,
    value: point.y,
  }));

  if (points.length === 0) {
    return (
      <Box border="1px solid" borderColor="gray.200" borderRadius="6px" p={6}>
        <Text color="gray.500">No exercise trend data yet</Text>
      </Box>
    );
  }

  return (
    <Box
      aria-label={`${metricLabels.ariaLabel} for ${exerciseName}`}
      border="1px solid"
      borderColor="gray.200"
      borderRadius="6px"
      bg="white"
      p={{ base: 3, md: 4 }}
    >
      <Heading as="h3" size="sm" mb={1}>
        {metricLabels.title}
      </Heading>
      <Text fontSize="sm" color="gray.600" mb={4}>
        {exerciseName}
      </Text>
      <Box h={{ base: "280px", md: "360px" }} minW={0}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              minTickGap={24}
              tick={{ fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              label={{
                angle: -90,
                position: "insideLeft",
                value: metricLabels.yAxisLabel,
              }}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatNumber(Number(value))}
              width={72}
            />
            <Tooltip content={<ExerciseTrendTooltip metric={metric} />} />
            <Line
              type="monotone"
              dataKey="value"
              name={metricLabels.tooltipLabel}
              stroke="#2B6CB0"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default ExerciseTrendChart;
