import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Select,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import type { NormalizedWorkoutSetWithMetrics } from "../../../../shared/utils/trainingMetrics";
import {
  type ChartSeries,
  type ExerciseMetric,
} from "../../../../shared/utils/trainingGraphData";
import {
  buildCanonicalExerciseTrendGroups,
  toCanonicalExerciseMetricSeries,
} from "../utils/exerciseTrendCanonicalGrouping";
import ExerciseTrendChart from "./ExerciseTrendChart";

type ExerciseTrendSectionProps = {
  sets: NormalizedWorkoutSetWithMetrics[];
};

const MAX_VISIBLE_ROWS = 12;

const METRIC_OPTIONS: Array<{
  label: string;
  value: ExerciseMetric;
}> = [
  {
    label: "Estimated 1RM",
    value: "estimatedOneRepMax",
  },
  {
    label: "Weight",
    value: "weight",
  },
  {
    label: "Volume Load",
    value: "volumeLoad",
  },
  {
    label: "Reps",
    value: "reps",
  },
];

const METRIC_LABELS: Record<ExerciseMetric, string> = {
  estimatedOneRepMax: "Estimated 1RM",
  weight: "Weight",
  volumeLoad: "Volume Load",
  reps: "Reps",
};

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
}).format(value);

const getRecentRows = (series: ChartSeries): ChartSeries["points"] => (
  [...series.points]
    .sort((a, b) => b.x.localeCompare(a.x))
    .slice(0, MAX_VISIBLE_ROWS)
);

const getGroupOptionLabel = (group: ReturnType<typeof buildCanonicalExerciseTrendGroups>[number]): string => {
  const nameCountLabel = group.rawExerciseNames.length > 1
    ? `, ${group.rawExerciseNames.length} names`
    : "";
  const customLabel = group.isMetadataMatched ? "" : ", custom";

  return `${group.groupName} (${group.setCount} sets${nameCountLabel}${customLabel})`;
};

const ExerciseTrendSection: React.FC<ExerciseTrendSectionProps> = ({
  sets,
}) => {
  const groups = useMemo(() => buildCanonicalExerciseTrendGroups(sets), [sets]);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [metric, setMetric] = useState<ExerciseMetric>("estimatedOneRepMax");

  useEffect(() => {
    if (groups.length === 0) {
      setSelectedGroupName("");
      return;
    }

    const hasSelectedGroup = groups.some((group) => (
      group.groupName === selectedGroupName
    ));

    if (!hasSelectedGroup) {
      setSelectedGroupName(groups[0].groupName);
    }
  }, [groups, selectedGroupName]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.groupName === selectedGroupName) ?? null,
    [groups, selectedGroupName]
  );

  const selectedSeries = useMemo(
    () => selectedGroup === null
      ? {
        id: "",
        label: "",
        points: [],
      }
      : toCanonicalExerciseMetricSeries(sets, selectedGroup, metric),
    [metric, selectedGroup, sets]
  );
  const recentRows = useMemo(() => getRecentRows(selectedSeries), [selectedSeries]);

  if (groups.length === 0) {
    return (
      <Box as="section" aria-labelledby="exercise-trend-heading">
        <Heading id="exercise-trend-heading" as="h2" size="md" mb={4}>
          Exercises
        </Heading>
        <Box border="1px solid" borderColor="gray.200" borderRadius="6px" p={6}>
          <Text color="gray.500">No exercise trend data yet</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box as="section" aria-labelledby="exercise-trend-heading">
      <Box mb={4}>
        <Heading id="exercise-trend-heading" as="h2" size="md">
          Exercises
        </Heading>
        <Text mt={1} fontSize="sm" color="gray.600">
          {groups.length} exercise groups. Canonical metadata is used when available, and raw names stay visible in the table.
        </Text>
      </Box>

      <Flex
        align={{ base: "stretch", md: "end" }}
        direction={{ base: "column", md: "row" }}
        gap={4}
        mb={4}
      >
        <FormControl maxW={{ base: "100%", md: "360px" }}>
          <FormLabel fontSize="sm" fontWeight="semibold">
            Exercise
          </FormLabel>
          <Select
            aria-label="Select exercise trend"
            value={selectedGroupName}
            onChange={(event) => setSelectedGroupName(event.target.value)}
          >
            {groups.map((group) => (
              <option key={group.groupName} value={group.groupName}>
                {getGroupOptionLabel(group)}
              </option>
            ))}
          </Select>
        </FormControl>

        <Flex
          aria-label="Exercise trend metric"
          gap={2}
          role="group"
          wrap="wrap"
          w={{ base: "100%", md: "auto" }}
        >
          {METRIC_OPTIONS.map((option) => {
            const isSelected = option.value === metric;

            return (
              <Button
                key={option.value}
                aria-pressed={isSelected}
                colorScheme={isSelected ? "teal" : "gray"}
                onClick={() => setMetric(option.value)}
                size="sm"
                variant={isSelected ? "solid" : "outline"}
                minW={{ base: "calc(50% - 4px)", sm: "auto" }}
              >
                {option.label}
              </Button>
            );
          })}
        </Flex>
      </Flex>

      <Box mb={6}>
        <ExerciseTrendChart
          exerciseName={selectedGroup?.groupName ?? ""}
          metric={metric}
          series={selectedSeries}
        />
      </Box>

      {recentRows.length === 0 ? (
        <Box border="1px solid" borderColor="gray.200" borderRadius="6px" p={6}>
          <Text color="gray.500">
            No exact values for {METRIC_LABELS[metric]} yet.
          </Text>
        </Box>
      ) : (
        <TableContainer border="1px solid" borderColor="gray.200" borderRadius="6px">
          <Table size="sm" variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th whiteSpace="nowrap">Date</Th>
                <Th minW="180px">Exercise</Th>
                <Th>Metric</Th>
                <Th isNumeric>Value</Th>
              </Tr>
            </Thead>
            <Tbody>
              {recentRows.map((point, index) => (
                <Tr key={`${point.x}:${point.y}:${index}`}>
                  <Td whiteSpace="nowrap">{point.x}</Td>
                  <Td maxW="260px" whiteSpace="normal" wordBreak="break-word">
                    {point.label ?? selectedGroup?.groupName ?? "-"}
                  </Td>
                  <Td>{METRIC_LABELS[metric]}</Td>
                  <Td isNumeric>{formatNumber(point.y)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default ExerciseTrendSection;
