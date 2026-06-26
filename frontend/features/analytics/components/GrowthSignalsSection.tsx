import React from "react";
import {
  Badge,
  Box,
  Heading,
  List,
  ListItem,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import type {
  GrowthSignal,
  GrowthSignalStatus,
  GrowthSignalsSummary,
} from "../../../../shared/utils/growthSignals";

type GrowthSignalsSectionProps = {
  summary: GrowthSignalsSummary;
};

const statusColorScheme: Record<GrowthSignalStatus, string> = {
  positive: "green",
  neutral: "blue",
  watch: "orange",
  unknown: "gray",
};

const GrowthSignalCard: React.FC<{ signal: GrowthSignal }> = ({ signal }) => {
  const evidenceItems = signal.evidence.slice(0, 3);

  return (
    <Box bg="gray.50" borderRadius="6px" p={4}>
      <Stack spacing={3}>
        <Stack
          align={{ base: "flex-start", sm: "center" }}
          direction={{ base: "column", sm: "row" }}
          justify="space-between"
          gap={2}
        >
          <Heading as="h3" size="xs" color="gray.800">
            {signal.label}
          </Heading>
          <Badge colorScheme={statusColorScheme[signal.status]}>
            {signal.status}
          </Badge>
        </Stack>

        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {signal.headline}
          </Text>
          <Text mt={1} fontSize="sm" color="gray.600">
            {signal.detail}
          </Text>
        </Box>

        <Box>
          <Text mb={1} fontSize="xs" fontWeight="semibold" color="gray.600">
            Evidence
          </Text>
          {evidenceItems.length > 0 ? (
            <List spacing={1}>
              {evidenceItems.map((item, index) => (
                <ListItem
                  key={`${signal.id}-evidence-${index}`}
                  fontSize="sm"
                  color="gray.700"
                >
                  {item}
                </ListItem>
              ))}
            </List>
          ) : (
            <Text fontSize="sm" color="gray.500">
              No evidence yet.
            </Text>
          )}
        </Box>

        {signal.nextFocus && (
          <Box borderTop="1px solid" borderColor="gray.200" pt={2}>
            <Text mb={1} fontSize="xs" fontWeight="semibold" color="gray.600">
              Watch next
            </Text>
            <Text fontSize="sm" color="gray.700">
              {signal.nextFocus}
            </Text>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

const GrowthSignalsSection: React.FC<GrowthSignalsSectionProps> = ({ summary }) => (
  <Box
    as="section"
    aria-labelledby="growth-signals-heading"
    border="1px solid"
    borderColor="gray.200"
    borderRadius="6px"
    bg="white"
    p={{ base: 4, md: 5 }}
  >
    <Stack spacing={4}>
      <Box>
        <Heading id="growth-signals-heading" as="h2" size="md">
          Growth Signals
        </Heading>
        <Text mt={1} fontSize="sm" color="gray.600">
          Deterministic signals from your logged training data.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
        {summary.signals.map((signal) => (
          <GrowthSignalCard key={signal.id} signal={signal} />
        ))}
      </SimpleGrid>

      {summary.dataQualityNotes.length > 0 && (
        <Box>
          <Heading as="h3" size="xs" mb={2} color="gray.700">
            Data Quality
          </Heading>
          <List spacing={1}>
            {summary.dataQualityNotes.map((note, index) => (
              <ListItem key={`growth-signal-note-${index}`} fontSize="sm" color="gray.600">
                {note}
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Stack>
  </Box>
);

export default GrowthSignalsSection;
