import React from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
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
import type {
  GenerateWeeklySummaryResponse,
} from "../api/weeklySummaryApi";

type WeeklySummaryPreviewSectionProps = {
  summary: RuleBasedWeeklySummary;
  rangeStart: string;
  rangeEnd: string;
  generatedResponse?: GenerateWeeklySummaryResponse | null;
  generationError?: string | null;
  isGenerating?: boolean;
  canGenerate?: boolean;
  onGenerate?: () => void;
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

const getGeneratedLabel = (source: GenerateWeeklySummaryResponse["source"]) => (
  source === "ai" ? "Mocked endpoint response" : "Fallback summary"
);

const SummaryCard: React.FC<{
  summary: RuleBasedWeeklySummary;
  badgeLabel: string;
  badgeColorScheme?: string;
}> = ({
  summary,
  badgeLabel,
  badgeColorScheme = "gray",
}) => (
  <Box bg="gray.50" borderRadius="6px" p={4}>
    <Flex
      align={{ base: "flex-start", sm: "center" }}
      justify="space-between"
      gap={3}
      direction={{ base: "column", sm: "row" }}
      mb={3}
    >
      <Box>
        <Text fontWeight="semibold" color="gray.800">
          {summary.headline}
        </Text>
      </Box>
      <Badge colorScheme={badgeColorScheme} alignSelf={{ base: "flex-start", sm: "center" }}>
        {badgeLabel}
      </Badge>
    </Flex>
    <Text fontSize="sm" color="gray.700">
      {summary.summary}
    </Text>

    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={4}>
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
  </Box>
);

const WeeklySummaryPreviewSection: React.FC<WeeklySummaryPreviewSectionProps> = ({
  summary,
  rangeStart,
  rangeEnd,
  generatedResponse = null,
  generationError = null,
  isGenerating = false,
  canGenerate = true,
  onGenerate,
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
        <Button
          colorScheme="teal"
          size="sm"
          onClick={onGenerate}
          isLoading={isGenerating}
          loadingText="Generating"
          isDisabled={!canGenerate || isGenerating || !onGenerate}
          alignSelf={{ base: "stretch", sm: "center" }}
          w={{ base: "100%", sm: "auto" }}
        >
          Generate AI summary
        </Button>
      </Flex>

      <Text fontSize="sm" color="gray.600">
        Uses the mocked backend endpoint for now. The local rule-based preview remains visible.
      </Text>

      {generationError && (
        <Alert status="error" variant="left-accent">
          <AlertIcon />
          <AlertDescription>{generationError}</AlertDescription>
        </Alert>
      )}

      <SummaryCard summary={summary} badgeLabel="Rule-based preview" />

      {generatedResponse && (
        <Box>
          <SummaryCard
            summary={generatedResponse.summary}
            badgeLabel={getGeneratedLabel(generatedResponse.source)}
            badgeColorScheme={generatedResponse.source === "ai" ? "teal" : "orange"}
          />
          {generatedResponse.validationErrors.length > 0 && (
            <Text mt={2} fontSize="xs" color="gray.500">
              Validation notes: {generatedResponse.validationErrors.slice(0, 2).join(" ")}
            </Text>
          )}
        </Box>
      )}

      {!generatedResponse && (
        <Text fontSize="xs" color="gray.500">
          Generated endpoint response will appear here after the request completes.
        </Text>
      )}
    </Stack>
  </Box>
);

export default WeeklySummaryPreviewSection;
