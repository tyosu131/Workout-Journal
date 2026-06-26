import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Center,
  Flex,
  Heading,
  IconButton,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { CloseIcon, RepeatIcon } from "@chakra-ui/icons";
import { useRouter } from "next/router";
import { URLS } from "../../../../shared/constants/urls";
import { getToken } from "../../../../shared/utils/tokenUtils";
import {
  aggregateBig3Trend,
  type Big3TrendSummary,
} from "../../../../shared/utils/big3Trend";
import {
  aggregateWeeklyMuscleGroupVolume,
  type WeeklyMuscleGroupVolumeRow,
} from "../../../../shared/utils/muscleGroupVolume";
import { normalizeWorkoutSets } from "../../../../shared/utils/normalizeWorkoutSets";
import {
  buildRuleBasedWeeklySummary,
} from "../../../../shared/utils/ruleBasedWeeklySummary";
import { summarizeSetEffort } from "../../../../shared/utils/effortAnalytics";
import {
  toBig3EstimatedOneRepMaxSeries,
} from "../../../../shared/utils/trainingGraphData";
import {
  addTrainingMetricsToSet,
  type NormalizedWorkoutSetWithMetrics,
} from "../../../../shared/utils/trainingMetrics";
import { buildWeeklySummaryInput } from "../../../../shared/utils/weeklySummaryInput";
import { fetchNotesInRangeAPI } from "../../notes/api";
import {
  generateWeeklySummaryAPI,
  type GenerateWeeklySummaryResponse,
} from "../api/weeklySummaryApi";
import AnalyticsRangeFilter, {
  type AnalyticsRange,
} from "../components/AnalyticsRangeFilter";
import Big3SummarySection from "../components/Big3SummarySection";
import EffortSummarySection from "../components/EffortSummarySection";
import ExerciseTrendSection from "../components/ExerciseTrendSection";
import MuscleGroupSummarySection from "../components/MuscleGroupSummarySection";
import WeeklySummaryPreviewSection from "../components/WeeklySummaryPreviewSection";

type LoadStatus = "loading" | "success" | "error";

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRange = (range: AnalyticsRange): { start: string; end: string } => {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);

  switch (range) {
    case "4w":
      startDate.setDate(startDate.getDate() - 27);
      break;
    case "8w":
      startDate.setDate(startDate.getDate() - 55);
      break;
    case "12w":
      startDate.setDate(startDate.getDate() - 83);
      break;
    case "6m":
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case "all":
      return { start: "1970-01-01", end: formatLocalDate(endDate) };
  }

  return {
    start: formatLocalDate(startDate),
    end: formatLocalDate(endDate),
  };
};

const AnalyticsPage: React.FC = () => {
  const router = useRouter();
  const requestIdRef = useRef(0);
  const weeklySummaryRequestIdRef = useRef(0);
  const [range, setRange] = useState<AnalyticsRange>("12w");
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [generatedWeeklySummary, setGeneratedWeeklySummary] =
    useState<GenerateWeeklySummaryResponse | null>(null);
  const [weeklySummaryError, setWeeklySummaryError] = useState<string | null>(null);
  const [isGeneratingWeeklySummary, setIsGeneratingWeeklySummary] = useState(false);
  const [noteCount, setNoteCount] = useState(0);
  const [normalizedSetCount, setNormalizedSetCount] = useState(0);
  const [big3Summaries, setBig3Summaries] = useState<Big3TrendSummary[]>(() =>
    aggregateBig3Trend([])
  );
  const [muscleRows, setMuscleRows] = useState<WeeklyMuscleGroupVolumeRow[]>([]);
  const [setsWithMetrics, setSetsWithMetrics] = useState<NormalizedWorkoutSetWithMetrics[]>([]);

  const dateRange = useMemo(() => getDateRange(range), [range]);
  const big3Series = useMemo(
    () => toBig3EstimatedOneRepMaxSeries(big3Summaries),
    [big3Summaries]
  );
  const effortSummary = useMemo(
    () => summarizeSetEffort(setsWithMetrics),
    [setsWithMetrics]
  );
  const weeklySummaryInput = useMemo(
    () => buildWeeklySummaryInput({
      rangeStart: dateRange.start,
      rangeEnd: dateRange.end,
      totalNotes: noteCount,
      normalizedSets: setsWithMetrics,
      big3Summaries,
      muscleRows,
      effortSummary,
    }),
    [
      big3Summaries,
      dateRange.end,
      dateRange.start,
      effortSummary,
      muscleRows,
      noteCount,
      setsWithMetrics,
    ]
  );
  const weeklySummary = useMemo(
    () => buildRuleBasedWeeklySummary(weeklySummaryInput),
    [weeklySummaryInput]
  );

  useEffect(() => {
    weeklySummaryRequestIdRef.current += 1;
    setGeneratedWeeklySummary(null);
    setWeeklySummaryError(null);
    setIsGeneratingWeeklySummary(false);
  }, [dateRange.end, dateRange.start, reloadKey]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(URLS.LOGIN_PAGE);
      return;
    }

    const requestId = ++requestIdRef.current;
    setStatus("loading");

    const loadAnalytics = async () => {
      try {
        const notes = await fetchNotesInRangeAPI(dateRange.start, dateRange.end);
        const normalizedSets = normalizeWorkoutSets(notes);
        const setsWithMetrics = normalizedSets.map(addTrainingMetricsToSet);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setNoteCount(notes.length);
        setNormalizedSetCount(normalizedSets.length);
        setSetsWithMetrics(setsWithMetrics);
        setBig3Summaries(aggregateBig3Trend(setsWithMetrics));
        setMuscleRows(aggregateWeeklyMuscleGroupVolume(setsWithMetrics));
        setStatus("success");
      } catch {
        if (requestId === requestIdRef.current) {
          setStatus("error");
        }
      }
    };

    loadAnalytics();

    return () => {
      if (requestId === requestIdRef.current) {
        requestIdRef.current += 1;
      }
    };
  }, [dateRange.end, dateRange.start, reloadKey, router]);

  const handleGenerateWeeklySummary = async () => {
    if (status !== "success") {
      return;
    }

    const requestId = ++weeklySummaryRequestIdRef.current;
    setIsGeneratingWeeklySummary(true);
    setWeeklySummaryError(null);
    setGeneratedWeeklySummary(null);

    try {
      const response = await generateWeeklySummaryAPI({
        rangeStart: dateRange.start,
        rangeEnd: dateRange.end,
        summaryInput: weeklySummaryInput,
      });

      if (requestId !== weeklySummaryRequestIdRef.current) {
        return;
      }

      setGeneratedWeeklySummary(response);
    } catch {
      if (requestId === weeklySummaryRequestIdRef.current) {
        setWeeklySummaryError("Mocked weekly summary request failed.");
      }
    } finally {
      if (requestId === weeklySummaryRequestIdRef.current) {
        setIsGeneratingWeeklySummary(false);
      }
    }
  };

  const hasExerciseData = setsWithMetrics.some((set) => set.exerciseName.trim() !== "");
  const hasEffortData = effortSummary.effortLoggedSetCount > 0;
  const hasAnalyticsData = big3Series.some((series) => series.points.length > 0)
    || muscleRows.length > 0
    || hasEffortData
    || hasExerciseData;

  return (
    <Box minH="100vh" bg="gray.50" py={{ base: 4, md: 8 }} px={{ base: 4, md: 6 }}>
      <Box maxW="7xl" mx="auto">
        <Flex align="flex-start" justify="space-between" gap={4} mb={6}>
          <Box>
            <Heading as="h1" size="lg">
              Analytics
            </Heading>
            <Text mt={1} fontSize="sm" color="gray.600">
              {dateRange.start} to {dateRange.end}
            </Text>
          </Box>
          <IconButton
            aria-label="Back to calendar"
            icon={<CloseIcon />}
            variant="ghost"
            onClick={() => router.push(URLS.TOP_PAGE)}
          />
        </Flex>

        <Box mb={6}>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            Range
          </Text>
          <AnalyticsRangeFilter
            value={range}
            onChange={setRange}
            isDisabled={status === "loading"}
          />
        </Box>

        {status === "loading" && (
          <Center minH="300px">
            <Spinner size="lg" />
          </Center>
        )}

        {status === "error" && (
          <Alert status="error" variant="left-accent" alignItems="center">
            <AlertIcon />
            <AlertDescription flex="1">
              Analytics data could not be loaded.
            </AlertDescription>
            <Button
              size="sm"
              leftIcon={<RepeatIcon />}
              onClick={() => setReloadKey((current) => current + 1)}
            >
              Retry
            </Button>
          </Alert>
        )}

        {status === "success" && (
          <Box mb={6}>
            <WeeklySummaryPreviewSection
              summary={weeklySummary}
              rangeStart={dateRange.start}
              rangeEnd={dateRange.end}
              generatedResponse={generatedWeeklySummary}
              generationError={weeklySummaryError}
              isGenerating={isGeneratingWeeklySummary}
              canGenerate={status === "success"}
              onGenerate={handleGenerateWeeklySummary}
            />
          </Box>
        )}

        {status === "success" && !hasAnalyticsData && (
          <Box border="1px solid" borderColor="gray.200" bg="white" p={8} textAlign="center">
            <Heading as="h2" size="sm" mb={2}>
              No analytics data yet
            </Heading>
            <Text color="gray.600">
              {noteCount === 0
                ? "No workout notes were found in this range."
                : `No supported analytics data was found across ${normalizedSetCount} sets.`}
            </Text>
          </Box>
        )}

        {status === "success" && hasAnalyticsData && (
          <Tabs colorScheme="teal" variant="line" isLazy>
            <TabList overflowX="auto" overflowY="hidden">
              <Tab whiteSpace="nowrap">BIG3</Tab>
              <Tab whiteSpace="nowrap">Muscle Groups</Tab>
              <Tab whiteSpace="nowrap">Exercises</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0} py={6}>
                <Big3SummarySection summaries={big3Summaries} series={big3Series} />
              </TabPanel>
              <TabPanel px={0} py={6}>
                <MuscleGroupSummarySection rows={muscleRows} />
              </TabPanel>
              <TabPanel px={0} py={6}>
                <Box mb={8}>
                  <EffortSummarySection summary={effortSummary} />
                </Box>
                <ExerciseTrendSection sets={setsWithMetrics} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        )}
      </Box>
    </Box>
  );
};

export default AnalyticsPage;
