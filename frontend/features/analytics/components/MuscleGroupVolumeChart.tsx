import React, { useMemo } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartSeries } from "../../../../shared/utils/trainingGraphData";

type MuscleGroupVolumeChartProps = {
  series: ChartSeries[];
};

type MuscleGroupChartRow = {
  weekStart: string;
} & Record<string, number | string | undefined>;

type TooltipPayload = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
};

type MuscleGroupTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
};

const MAX_VISIBLE_SERIES = 6;

const SERIES_COLORS = [
  "#2F855A",
  "#2B6CB0",
  "#C05621",
  "#805AD5",
  "#D53F8C",
  "#718096",
];

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
}).format(value);

const isNonNegativeNumber = (value: number | string | undefined): value is number => (
  typeof value === "number" && Number.isFinite(value) && value >= 0
);

const toDisplayLabel = (value: string): string => value.replaceAll("_", " ");

const getSeriesTotal = (series: ChartSeries): number => (
  series.points.reduce((total, point) => (
    isNonNegativeNumber(point.y) ? total + point.y : total
  ), 0)
);

const getTopSeries = (series: ChartSeries[]): ChartSeries[] => (
  [...series]
    .filter((item) => item.points.some((point) => isNonNegativeNumber(point.y)))
    .sort((a, b) => {
      const totalCompare = getSeriesTotal(b) - getSeriesTotal(a);
      return totalCompare !== 0 ? totalCompare : a.id.localeCompare(b.id);
    })
    .slice(0, MAX_VISIBLE_SERIES)
);

const toChartRows = (series: ChartSeries[]): MuscleGroupChartRow[] => {
  const rowsByWeek = new Map<string, MuscleGroupChartRow>();

  series.forEach((item) => {
    item.points.forEach((point) => {
      if (!isNonNegativeNumber(point.y)) {
        return;
      }

      const row = rowsByWeek.get(point.x) ?? { weekStart: point.x };
      row[item.id] = point.y;
      rowsByWeek.set(point.x, row);
    });
  });

  return Array.from(rowsByWeek.values()).sort((a, b) => (
    a.weekStart.localeCompare(b.weekStart)
  ));
};

const MuscleGroupTooltip: React.FC<MuscleGroupTooltipProps> = ({
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
        const value = isNonNegativeNumber(item.value) ? item.value : null;
        if (value === null) {
          return null;
        }

        const name = typeof item.name === "string"
          ? toDisplayLabel(item.name)
          : String(item.name ?? "");

        return (
          <Text key={`${item.dataKey ?? name}`} color={item.color ?? "gray.700"} fontSize="sm">
            {name}: {formatNumber(value)}
          </Text>
        );
      })}
    </Box>
  );
};

const MuscleGroupVolumeChart: React.FC<MuscleGroupVolumeChartProps> = ({
  series,
}) => {
  const visibleSeries = useMemo(() => getTopSeries(series), [series]);
  const chartRows = useMemo(() => toChartRows(visibleSeries), [visibleSeries]);

  if (visibleSeries.length === 0 || chartRows.length === 0) {
    return (
      <Box border="1px solid" borderColor="gray.200" borderRadius="6px" p={6}>
        <Text color="gray.500">No muscle group volume data yet</Text>
      </Box>
    );
  }

  return (
    <Box
      aria-label="Weekly muscle group set volume chart"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="6px"
      bg="white"
      p={{ base: 3, md: 4 }}
    >
      <Heading as="h3" size="sm" mb={1}>
        Weekly Set Volume
      </Heading>
      <Text fontSize="sm" color="gray.600" mb={4}>
        Top {visibleSeries.length} muscle groups by total sets in the selected range.
      </Text>
      <Box h={{ base: "300px", md: "380px" }} minW={0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartRows} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="weekStart"
              minTickGap={24}
              tick={{ fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12 }}
              width={48}
            />
            <Tooltip content={<MuscleGroupTooltip />} />
            <Legend
              verticalAlign="top"
              height={56}
              formatter={(value) => toDisplayLabel(String(value))}
              wrapperStyle={{ fontSize: "12px" }}
            />
            {visibleSeries.map((item, index) => (
              <Bar
                key={item.id}
                dataKey={item.id}
                name={item.label}
                fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                maxBarSize={24}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default MuscleGroupVolumeChart;
