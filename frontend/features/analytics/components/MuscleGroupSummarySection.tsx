import React, { useMemo } from "react";
import {
  Box,
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
import type { ChartSeries } from "../../../../shared/utils/trainingGraphData";
import MuscleGroupVolumeChart from "./MuscleGroupVolumeChart";

type MuscleGroupSummarySectionProps = {
  rows: WeeklyMuscleGroupVolumeRow[];
  series: ChartSeries[];
};

const MAX_VISIBLE_ROWS = 24;

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
}).format(value);

const MuscleGroupSummarySection: React.FC<MuscleGroupSummarySectionProps> = ({
  rows,
  series,
}) => {
  const visibleRows = useMemo(
    () => [...rows]
      .sort((a, b) => {
        const weekCompare = b.weekStart.localeCompare(a.weekStart);
        return weekCompare !== 0 ? weekCompare : a.muscle.localeCompare(b.muscle);
      })
      .slice(0, MAX_VISIBLE_ROWS),
    [rows]
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

      <Box mb={6}>
        <MuscleGroupVolumeChart series={series} />
      </Box>

      {visibleRows.length === 0 ? (
        <Box border="1px solid" borderColor="gray.200" borderRadius="6px" p={6}>
          <Text color="gray.500">No data yet</Text>
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
