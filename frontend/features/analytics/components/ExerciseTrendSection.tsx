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
  toExerciseMetricSeries,
  type ChartSeries,
  type ExerciseMetric,
} from "../../../../shared/utils/trainingGraphData";
import ExerciseTrendChart from "./ExerciseTrendChart";

type ExerciseTrendSectionProps = {
  sets: NormalizedWorkoutSetWithMetrics[];
};

type ExerciseOption = {
  name: string;
  setCount: number;
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

const getExerciseOptions = (
  sets: NormalizedWorkoutSetWithMetrics[]
): ExerciseOption[] => {
  const countsByExercise = new Map<string, number>();

  sets.forEach((set) => {
    if (set.exerciseName.trim() === "") {
      return;
    }

    countsByExercise.set(
      set.exerciseName,
      (countsByExercise.get(set.exerciseName) ?? 0) + 1
    );
  });

  return Array.from(countsByExercise.entries())
    .map(([name, setCount]) => ({ name, setCount }))
    .sort((a, b) => {
      const countCompare = b.setCount - a.setCount;
      return countCompare !== 0 ? countCompare : a.name.localeCompare(b.name);
    });
};

const getRecentRows = (series: ChartSeries): ChartSeries["points"] => (
  [...series.points]
    .sort((a, b) => b.x.localeCompare(a.x))
    .slice(0, MAX_VISIBLE_ROWS)
);

const ExerciseTrendSection: React.FC<ExerciseTrendSectionProps> = ({
  sets,
}) => {
  const exerciseOptions = useMemo(() => getExerciseOptions(sets), [sets]);
  const [selectedExerciseName, setSelectedExerciseName] = useState("");
  const [metric, setMetric] = useState<ExerciseMetric>("estimatedOneRepMax");

  useEffect(() => {
    if (exerciseOptions.length === 0) {
      setSelectedExerciseName("");
      return;
    }

    const hasSelectedExercise = exerciseOptions.some((option) => (
      option.name === selectedExerciseName
    ));

    if (!hasSelectedExercise) {
      setSelectedExerciseName(exerciseOptions[0].name);
    }
  }, [exerciseOptions, selectedExerciseName]);

  const selectedSeries = useMemo(
    () => selectedExerciseName === ""
      ? {
        id: "",
        label: "",
        points: [],
      }
      : toExerciseMetricSeries(sets, selectedExerciseName, metric),
    [metric, selectedExerciseName, sets]
  );
  const recentRows = useMemo(() => getRecentRows(selectedSeries), [selectedSeries]);

  if (exerciseOptions.length === 0) {
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
          {exerciseOptions.length} tracked exercises using exact exercise names.
        </Text>
      </Box>

      <Flex align={{ base: "stretch", md: "end" }} direction={{ base: "column", md: "row" }} gap={4} mb={4}>
        <FormControl maxW={{ base: "100%", md: "360px" }}>
          <FormLabel fontSize="sm" fontWeight="semibold">
            Exercise
          </FormLabel>
          <Select
            aria-label="Select exercise trend"
            value={selectedExerciseName}
            onChange={(event) => setSelectedExerciseName(event.target.value)}
          >
            {exerciseOptions.map((option) => (
              <option key={option.name} value={option.name}>
                {option.name} ({option.setCount})
              </option>
            ))}
          </Select>
        </FormControl>

        <Flex
          aria-label="Exercise trend metric"
          gap={2}
          role="group"
          wrap="wrap"
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
              >
                {option.label}
              </Button>
            );
          })}
        </Flex>
      </Flex>

      <Box mb={6}>
        <ExerciseTrendChart
          exerciseName={selectedExerciseName}
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
                <Th>Metric</Th>
                <Th isNumeric>Value</Th>
              </Tr>
            </Thead>
            <Tbody>
              {recentRows.map((point, index) => (
                <Tr key={`${point.x}:${point.y}:${index}`}>
                  <Td whiteSpace="nowrap">{point.x}</Td>
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
