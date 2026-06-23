import React from "react";
import { Button, Flex } from "@chakra-ui/react";

export type AnalyticsRange = "4w" | "8w" | "12w" | "6m" | "all";

type AnalyticsRangeFilterProps = {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
  isDisabled?: boolean;
};

const RANGE_OPTIONS: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "4w", label: "4 weeks" },
  { value: "8w", label: "8 weeks" },
  { value: "12w", label: "12 weeks" },
  { value: "6m", label: "6 months" },
  { value: "all", label: "All" },
];

const AnalyticsRangeFilter: React.FC<AnalyticsRangeFilterProps> = ({
  value,
  onChange,
  isDisabled = false,
}) => (
  <Flex role="group" aria-label="Analytics date range" gap={2} wrap="wrap">
    {RANGE_OPTIONS.map((option) => {
      const isSelected = option.value === value;

      return (
        <Button
          key={option.value}
          size="sm"
          minW="76px"
          borderRadius="4px"
          colorScheme={isSelected ? "teal" : "gray"}
          variant={isSelected ? "solid" : "outline"}
          aria-pressed={isSelected}
          isDisabled={isDisabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      );
    })}
  </Flex>
);

export default AnalyticsRangeFilter;
