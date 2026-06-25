import React from "react";
import {
  Badge,
  Box,
  Flex,
  Heading,
  List,
  ListItem,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import type {
  RuleBasedWeeklySummary,
} from "../../../../shared/utils/ruleBasedWeeklySummary";

type WeeklySummaryPreviewSectionProps = {
  summary: RuleBasedWeeklySummary;
  rangeStart: string;
  rangeEnd: string;
};

type SummaryListProps = {
  title: string;
  items: string[];
  emptyText: string;
};

const SummaryList: React.FC<SummaryListProps> = ({
  title,
  items,
  emptyText,
}) => (
  <Box>
    <Heading as="h3" size="xs" mb={2} color="gray.700">
      {title}
    </Heading>
    {items.length === 0 ? (
      <Text fontSize="sm" color="gray.500">
        {emptyText}
      </Text>
    ) : (
      <List spacing={1}>
        {items.map((item) => (
          <ListItem key={item} fontSize="sm" color="gray.700">
            {item}
          </ListItem>
        ))}
      </List>
    )}
  </Box>
);

const WeeklySummaryPreviewSection: React.FC<WeeklySummaryPreviewSectionProps> = ({
  summary,
  rangeStart,
  rangeEnd,
}) => (
  <Box
    as="section"
    aria-labelledby="weekly-summary-preview-heading"
    border="1px solid"
    borderColor="gray.200"
    borderRadius="6px"
    bg="white"
    p={{ base: 4, md: 5 }}
  >
    <Stack spacing={4}>
      <Flex
        align={{ base: "flex-start", sm: "center" }}
        justify="space-between"
        gap={3}
        direction={{ base: "column", sm: "row" }}
      >
        <Box>
          <Heading id="weekly-summary-preview-heading" as="h2" size="md">
            Weekly Summary
          </Heading>
          <Text mt={1} fontSize="sm" color="gray.600">
            {rangeStart} to {rangeEnd}
          </Text>
        </Box>
        <Badge colorScheme="gray" alignSelf={{ base: "flex-start", sm: "center" }}>
          Rule-based preview
        </Badge>
      </Flex>

      <Box bg="gray.50" borderRadius="6px" p={4}>
        <Text fontWeight="semibold" color="gray.800">
          {summary.headline}
        </Text>
        <Text mt={2} fontSize="sm" color="gray.700">
          {summary.summary}
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <SummaryList
          title="Highlights"
          items={summary.highlights}
          emptyText="No highlights yet."
        />
        <SummaryList
          title="Concerns"
          items={summary.concerns}
          emptyText="No concerns from the available data."
        />
        <SummaryList
          title="Next Week Focus"
          items={summary.nextWeekFocus}
          emptyText="No focus items yet."
        />
        <SummaryList
          title="Data Quality"
          items={summary.dataQualityNotes}
          emptyText="No data quality notes."
        />
      </SimpleGrid>
    </Stack>
  </Box>
);

export default WeeklySummaryPreviewSection;
