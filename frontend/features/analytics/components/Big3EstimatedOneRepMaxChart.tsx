import React, { useMemo } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSeries } from "../../../../shared/utils/trainingGraphData";

type Big3EstimatedOneRepMaxChartProps = {
  series: ChartSeries[];
};

const BIG3_CONFIG = {
  squat: {
    label: "Squat",
    color: "#2F855A",
  },
  bench: {
    label: "Bench Press",
    color: "#2B6CB0",
  },
  deadlift: {
    label: "Deadlift",
    color: "#C05621",
  },
} as const;

type Big3SeriesId = keyof typeof BIG3_CONFIG;

type Big3ChartRow = {
  date: string;
  squat?: number;
  bench?: number;
  deadlift?: number;
  labels: Partial<Record<Big3SeriesId, string>>;
};

type TooltipPayload = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  payload?: Big3ChartRow;
};

type Big3TooltipProps = {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
};

const isBig3SeriesId = (id: string): id is Big3SeriesId => (
  id === "squat" || id === "bench" || id === "deadlift"
);

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
}).format(value);

const toPositiveNumber = (value: number | string | undefined): number | null => {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
};

const toBig3ChartRows = (series: ChartSeries[]): Big3ChartRow[] => {
  const rowsByDate = new Map<string, Big3ChartRow>();

  series.forEach((item) => {
    const liftId = item.id;

    if (!isBig3SeriesId(liftId)) {
      return;
    }

    item.points.forEach((point) => {
      const value = toPositiveNumber(point.y);
      if (value === null) {
        return;
      }

      const row = rowsByDate.get(point.x) ?? {
        date: point.x,
        labels: {},
      };

      row[liftId] = value;
      if (point.label) {
        row.labels[liftId] = point.label;
      }

      rowsByDate.set(point.x, row);
    });
  });

  return Array.from(rowsByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
};

const Big3Tooltip: React.FC<Big3TooltipProps> = ({
  active,
  label,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) {
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
      {payload.map((item) => {
        const liftId = typeof item.dataKey === "string" ? item.dataKey : "";
        if (!isBig3SeriesId(liftId)) {
          return null;
        }

        const value = toPositiveNumber(item.value);
        if (value === null) {
          return null;
        }

        return (
          <Box key={liftId} fontSize="sm">
            <Text color={item.color ?? "gray.700"} fontWeight="semibold">
              {item.name}: {formatNumber(value)}
            </Text>
            {item.payload?.labels[liftId] && (
              <Text color="gray.600">{item.payload.labels[liftId]}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

const Big3EstimatedOneRepMaxChart: React.FC<Big3EstimatedOneRepMaxChartProps> = ({
  series,
}) => {
  const chartRows = useMemo(() => toBig3ChartRows(series), [series]);

  if (chartRows.length === 0) {
    return (
      <Box border="1px solid" borderColor="gray.200" borderRadius="6px" p={6}>
        <Text color="gray.500">No BIG3 estimated 1RM data in this range.</Text>
      </Box>
    );
  }

  return (
    <Box
      aria-label="BIG3 estimated one rep max line chart"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="6px"
      bg="white"
      p={{ base: 3, md: 4 }}
    >
      <Heading as="h3" size="sm" mb={1}>
        Estimated 1RM Trend
      </Heading>
      <Text fontSize="sm" color="gray.600" mb={4}>
        Estimated one-rep max over the selected range.
      </Text>
      <Box h={{ base: "280px", md: "360px" }} minW={0}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              minTickGap={24}
              tick={{ fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatNumber(Number(value))}
              width={56}
            />
            <Tooltip content={<Big3Tooltip />} />
            <Legend verticalAlign="top" height={32} />
            {Object.entries(BIG3_CONFIG).map(([id, config]) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                name={config.label}
                stroke={config.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default Big3EstimatedOneRepMaxChart;
