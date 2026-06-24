import React from "react";
import {
  Box,
  Heading,
  SimpleGrid,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
} from "@chakra-ui/react";
import type { EffortAnalyticsSummary } from "../../../../shared/utils/effortAnalytics";

type EffortSummarySectionProps = {
  summary: EffortAnalyticsSummary;
};

const formatNumber = (value: number | null): string => {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
};

const EffortSummarySection: React.FC<EffortSummarySectionProps> = ({
  summary,
}) => {
  const hasEffortData = summary.effortLoggedSetCount > 0;

  return (
    <Box as="section" aria-labelledby="effort-summary-heading">
      <Box mb={4}>
        <Heading id="effort-summary-heading" as="h2" size="md">
          Effort
        </Heading>
        <Text mt={1} fontSize="sm" color="gray.600">
          Set-level RPE, RIR, and failure summary for the selected range.
        </Text>
      </Box>

      {!hasEffortData ? (
        <Box border="1px solid" borderColor="gray.200" borderRadius="6px" p={6}>
          <Text color="gray.500">No effort data in this range.</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4}>
          <Box
            border="1px solid"
            borderColor="gray.200"
            borderRadius="6px"
            bg="white"
            p={4}
          >
            <Stat>
              <StatLabel>Effort Coverage</StatLabel>
              <StatNumber>
                {summary.effortLoggedSetCount} / {summary.totalSetCount}
              </StatNumber>
              <StatHelpText>sets with RPE, RIR, or failure logged</StatHelpText>
            </Stat>
          </Box>

          <Box
            border="1px solid"
            borderColor="gray.200"
            borderRadius="6px"
            bg="white"
            p={4}
          >
            <Stat>
              <StatLabel>Average RPE</StatLabel>
              <StatNumber>{formatNumber(summary.averageRpe)}</StatNumber>
              <StatHelpText>{summary.rpeCount} logged sets</StatHelpText>
            </Stat>
          </Box>

          <Box
            border="1px solid"
            borderColor="gray.200"
            borderRadius="6px"
            bg="white"
            p={4}
          >
            <Stat>
              <StatLabel>Average RIR</StatLabel>
              <StatNumber>{formatNumber(summary.averageRir)}</StatNumber>
              <StatHelpText>{summary.rirCount} logged sets</StatHelpText>
            </Stat>
          </Box>

          <Box
            border="1px solid"
            borderColor="gray.200"
            borderRadius="6px"
            bg="white"
            p={4}
          >
            <Stat>
              <StatLabel>Failure Sets</StatLabel>
              <StatNumber>{summary.failureCount}</StatNumber>
              <StatHelpText>sets marked as failure</StatHelpText>
            </Stat>
          </Box>
        </SimpleGrid>
      )}
    </Box>
  );
};

export default EffortSummarySection;
