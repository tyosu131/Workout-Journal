import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import type { WeeklyMuscleGroupVolumeRow } from "../../../../shared/utils/muscleGroupVolume";
import {
  toMuscleGroupVolumeSeries,
  type MuscleGroupVolumeMetric,
} from "../../../../shared/utils/trainingGraphData";
import MuscleGroupVolumeChart from "./MuscleGroupVolumeChart";

type MuscleGroupSummarySectionProps = {
  rows: WeeklyMuscleGroupVolumeRow[];
};

const MAX_VISIBLE_ROWS = 24;

const METRIC_OPTIONS: Array<{
  label: string;
  value: MuscleGroupVolumeMetric;
}> = [
  {
    label: "Sets",
    value: "totalSets",
  },
  {
    label: "Volume Load",
    value: "totalVolumeLoad",
  },
];

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
}).format(value);

const MuscleGroupSummarySection: React.FC<MuscleGroupSummarySectionProps> = ({
  rows,
}) => {
  const [metric, setMetric] = useState<MuscleGroupVolumeMetric>("totalSets");
  const visibleRows = useMemo(
    () => [...rows]
      .sort((a, b) => {
        const weekCompare = b.weekStart.localeCompare(a.weekStart);
        return weekCompare !== 0 ? weekCompare : a.muscle.localeCompare(b.muscle);
      })
      .slice(0, MAX_VISIBLE_ROWS),
    [rows]
  );
  const series = useMemo(
    () => toMuscleGroupVolumeSeries(rows, metric),
    [metric, rows]
  );

  return (
    <Box as="section" aria-labelledby="muscle-groups-heading">
      <Box mb={4}>
        <Heading id="muscle-groups-heading" as="h2" size="md">
          Muscle Groups
        </Heading>
        <Text mt={1} fontSize="sm" color="gray.600">
          {series.length} tracked muscle groups
        </Text>
      </Box>

      <Flex
        aria-label="Muscle group chart metric"
        gap={2}
        mb={4}
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

      <Box mb={6}>
        <MuscleGroupVolumeChart metric={metric} series={series} />
      </Box>

      {visibleRows.length === 0 ? (
        <Box border="1px solid" borderColor="gray.200" borderRadius="6px" p={6}>
          <Text color="gray.500">No muscle group rows in this range.</Text>
        </Box>
      ) : (
        <TableContainer border="1px solid" borderColor="gray.200" borderRadius="6px">
          <Table size="sm" variant="simple">
            <Thead bg="gray.50">
              <Tr>
                <Th whiteSpace="nowrap">Week start</Th>
                <Th>Muscle</Th>
                <Th isNumeric>Total sets</Th>
                <Th isNumeric>Total volume load</Th>
              </Tr>
            </Thead>
            <Tbody>
              {visibleRows.map((row) => (
                <Tr key={`${row.weekStart}:${row.muscle}`}>
                  <Td whiteSpace="nowrap">{row.weekStart}</Td>
                  <Td textTransform="capitalize">{row.muscle.replaceAll("_", " ")}</Td>
                  <Td isNumeric>{row.totalSets}</Td>
                  <Td isNumeric>{formatNumber(row.totalVolumeLoad)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default MuscleGroupSummarySection;
