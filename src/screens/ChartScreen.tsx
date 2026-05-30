import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView as RNScrollView,
  Pressable,
  ActivityIndicator,
  PanResponder,
  Platform,
} from 'react-native';
import { useAppDimensions } from '@/src/hooks/useAppDimensions';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Line,
  Circle,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
  G,
  ClipPath,
} from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import { FreshFeminine, SPACING } from '@/src/constants/theme';
import { getAllLogs } from '@/src/storage/db';
import type { DailyLog } from '@/src/storage/db';
import { WatercolorStains } from './LogScreen';
import { AsyncStorage } from 'expo-sqlite/kv-store';

// Grid constants - strict day-by-day alignment
const COLUMN_WIDTH = 36; // Narrower columns to fit more days
const TEMP_INCREMENT = 0.1; // Show every 0.1 (will adjust to 0.5 if too many)
const ROW_HEIGHT = 32; // Taller rows for better touch targets
const DATE_ROW_HEIGHT = 24; // Taller date rows
const FLUX_HEIGHT = 240; // Taller temperature graph (will be adjusted to 0.6 of screen)
// Flow row should match the height of individual fluid rows within temperature area
// This will be calculated dynamically based on dynamicFluxHeight / FLUID_TYPES.length
const FLUID_ROW_HEIGHT = 28; // Base height, will be reduced by 30% when rendering
const FLUID_ROW_HEIGHT_REDUCED = FLUID_ROW_HEIGHT * 0.7; // 30% reduction = 19.6px
const FLOW_ROW_HEIGHT = FLUID_ROW_HEIGHT_REDUCED; // Flow row same height as individual fluid rows
const ACTIVITY_ROW_HEIGHT = 32;
const RIGHT_AXIS_WIDTH = 32; // Narrower temp column to give more space for row titles
const GRID_LINE_WIDTH = 0.5;
const CYCLE_LENGTH = 35;
const MAX_RENDER_DAYS = 5000;

// Fluid order: Watery at top, Sticky at bottom
const FLUID_TYPES = ['Watery', 'Egg white', 'Creamy', 'Sticky'] as const;

// Calculate label width based on longest title
const LABEL_TITLES = [...FLUID_TYPES, 'Flow', 'Fysical™', 'Free-form'];
const LONGEST_LABEL = Math.max(...LABEL_TITLES.map(t => t.length));
// Approximate width: ~7px per character + padding + half a column width for more room
const LEFT_LABEL_WIDTH = Math.max(60, LONGEST_LABEL * 7 + 16) + COLUMN_WIDTH * 0.5;

type CycleDayData = {
  cycleDay: number;
  date: string;
  temp: number | null;
  tempUnit: 'C' | 'F';
  tempQuestionable: boolean;
  tempShift: boolean;
  flow: string | null;
  fluid: string | null;
  sex: string | null;
  notes: string;
  symptoms: Record<string, number>;
  isPeak: boolean;
};

/** Returns all cycle start dates (Day 1), newest first. */
function getCycleStartDates(logs: DailyLog[]): string[] {
  const dayOneDates = logs
    .filter((l) => l.isCycleDayOne)
    .map((l) => l.date)
    .sort()
    .reverse();
  if (dayOneDates.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return [today];
  }
  return dayOneDates;
}

/** Finds which cycle index contains the given date. Returns -1 if not found. */
function findCycleIndexForDate(date: string, cycleStartDates: string[], logs: DailyLog[]): number {
  if (cycleStartDates.length === 0) return 0;
  
  // Find the cycle that contains this date (date >= cycleStart and date < nextCycleStart)
  for (let i = 0; i < cycleStartDates.length; i++) {
    const cycleStart = cycleStartDates[i];
    const nextCycleStart = i > 0 ? cycleStartDates[i - 1] : null;
    
    if (date >= cycleStart && (nextCycleStart === null || date < nextCycleStart)) {
      return i;
    }
  }
  
  // If date is before all cycles, return the oldest cycle (last index)
  if (date < cycleStartDates[cycleStartDates.length - 1]) {
    return cycleStartDates.length - 1;
  }
  
  // Default to current cycle (index 0)
  return 0;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Returns cycle data for a single cycle and its actual length in days (from start until day before next Day 1). */
function getCycleDaysFromStart(logs: DailyLog[], startDate: string): { data: CycleDayData[]; startDate: string; actualLength: number } {
  const nextCycleStarts = logs
    .filter((l) => l.isCycleDayOne && l.date > startDate)
    .map((l) => l.date)
    .sort();
  const endBefore = nextCycleStarts[0] ?? null;

  const cycleLogs = logs
    .filter((l) => l.date >= startDate && (endBefore == null || l.date < endBefore))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const startMs = new Date(startDate).getTime();
  const data = cycleLogs.map((log) => {
    const day = Math.floor((new Date(log.date).getTime() - startMs) / MS_PER_DAY) + 1;
    return {
      cycleDay: day,
      date: log.date,
      temp: log.temp,
      tempUnit: log.tempUnit,
      tempQuestionable: log.tempQuestionable,
      tempShift: log.tempShift,
      flow: log.flow,
      fluid: log.fluid,
      sex: log.sex,
      notes: log.notes,
      symptoms: log.symptoms,
      isPeak: log.isPeak,
    };
  });

  let actualLength: number;
  if (endBefore != null) {
    actualLength = Math.round((new Date(endBefore).getTime() - startMs) / MS_PER_DAY);
  } else {
    const todayMs = new Date(todayISO()).getTime();
    const daysSinceStartToToday = Math.max(1, Math.floor((todayMs - startMs) / MS_PER_DAY) + 1);
    const maxDay = data.length ? Math.max(...data.map((d) => d.cycleDay)) : 1;
    const defaultCurrentCycleDays = 28;
    // Current cycle should include today even if days are empty, so chart can open on today's week.
    actualLength = Math.max(maxDay, defaultCurrentCycleDays, daysSinceStartToToday);
  }

  return { data, startDate, actualLength };
}

function getCycleDays(logs: DailyLog[]): { data: CycleDayData[]; startDate: string } {
  const starts = getCycleStartDates(logs);
  const startDate = starts[0];
  return getCycleDaysFromStart(logs, startDate);
}

function convertTemp(temp: number, unit: 'C' | 'F'): number {
  return unit === 'F' ? (temp - 32) * (5 / 9) : temp;
}

function getFlowHeight(flow: string | null, rowHeight: number = 32): number {
  if (!flow) return 0;
  switch (flow) {
    case 'Light':
      return rowHeight * 0.33;
    case 'Medium':
      return rowHeight * 0.66;
    case 'Heavy':
      return rowHeight;
    case 'Spotting':
      return rowHeight * 0.2;
    default:
      return 0;
  }
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) / 3;
    const c0x = p0.x + dx;
    const c1x = p1.x - dx;
    d += ` C ${c0x} ${p0.y} ${c1x} ${p1.y} ${p1.x} ${p1.y}`;
  }
  return d;
}

function getFluidColor(fluid: string | null): string {
  if (!fluid || fluid === 'None') return 'transparent';
  const colors: Record<string, string> = {
    'Sticky': FreshFeminine.fluid1,
    'Creamy': FreshFeminine.fluid2,
    'Egg white': FreshFeminine.fluid3,
    'Watery': FreshFeminine.fluid4,
  };
  return colors[fluid] || FreshFeminine.fluid1;
}

function getFluidLabelColor(fluidType: string): string {
  if (fluidType === 'None') return '#e0e0e0'; // Light grey
  const colors: Record<string, string> = {
    'Watery': FreshFeminine.fluid4,
    'Egg white': FreshFeminine.fluid3,
    'Creamy': FreshFeminine.fluid2,
    'Sticky': FreshFeminine.fluid1,
  };
  return colors[fluidType] || FreshFeminine.charcoal;
}

function formatDate(dateStr: string): { month: string; day: number; weekday: string } {
  const date = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return {
    month: months[date.getMonth()],
    day: date.getDate(),
    weekday: weekdays[date.getDay()],
  };
}

function formatCycleStartDisplay(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const formatted = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return formatted;
}

function addDays(dateStr: string, days: number): string {
  // Use midday local time to avoid timezone shifts when converting back to ISO date.
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function todayISO(): string {
  // Match LogScreen: store "today" as UTC date slice.
  return new Date().toISOString().slice(0, 10);
}

function isFutureDate(date: string): boolean {
  return date > todayISO();
}

/** Creates a Path for a bar with semicircular top and square bottom */
/** y is the original top position, the semicircle will peak at y and arc downward */
function createRoundedTopBarPath(x: number, y: number, width: number, height: number): string {
  const radius = width / 2; // Perfect semicircle: radius = half the width
  const peakY = y; // Peak of semicircle (top of bar)
  const arcStartY = peakY + radius; // Start of arc (below peak)
  const bottomY = y + height; // Bottom of bar
  const rightX = x + width;
  
  // Path: Start at top-left (below semicircle peak), arc semicircle upward to peak then down to top-right, line down right, line across bottom, line up left, close
  // The semicircle peaks at peakY, arcs from (x, arcStartY) to (rightX, arcStartY)
  // For an upward-curving semicircle: use large-arc-flag=0, sweep-flag=1 (clockwise, which curves upward in SVG)
  return `M ${x} ${arcStartY}
          A ${radius} ${radius} 0 0 1 ${rightX} ${arcStartY}
          L ${rightX} ${bottomY}
          L ${x} ${bottomY}
          Z`;
}

export function ChartScreen() {
  const { width: winWidth, height: winHeight } = useAppDimensions();
  const router = useRouter();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0); // 0 = current (latest) cycle, 1 = previous, etc.
  const [focusTarget, setFocusTarget] = useState<{ date: string; cycleIndex: number } | null>(null);
  const [scrubberDay, setScrubberDay] = useState<number | null>(null);
  const [selectedDayForEdit, setSelectedDayForEdit] = useState<number | null>(null);
  const [tapPosition, setTapPosition] = useState<{ x: number; y: number } | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [scrollX, setScrollX] = useState(0);
  const scrollXRef = useRef(0);
  const scrollViewRef = useRef<RNScrollView>(null);
  const isResettingScrollRef = useRef(false);
  const rotation = useSharedValue(0);

  // Loading animation
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      setLoadError(false);
      getAllLogs()
        .then(async (loadedLogs) => {
          if (!loadedLogs || !Array.isArray(loadedLogs)) {
            setLogs([]);
            setIsLoading(false);
            return;
          }
          
          setLogs(loadedLogs);
          
          // Sync chart to the same day/week the user was viewing in "My data".
          try {
            const lastViewedDate = await AsyncStorage.getItem('lastViewedDate');
            const targetDate = lastViewedDate || todayISO();
            const cycleStartDates = getCycleStartDates(loadedLogs);
            const targetCycleIndex = findCycleIndexForDate(targetDate, cycleStartDates, loadedLogs);
            if (targetCycleIndex >= 0 && targetCycleIndex < cycleStartDates.length) {
              setCycleIndex(targetCycleIndex);
              setFocusTarget({ date: targetDate, cycleIndex: targetCycleIndex });
            } else {
              // Fallback: still set a focus date so we can scroll if possible.
              setFocusTarget({ date: targetDate, cycleIndex: cycleIndex });
            }
          } catch {
            setFocusTarget({ date: todayISO(), cycleIndex: cycleIndex });
          }
          
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Error loading logs:', error);
          setLogs([]);
          setLoadError(true);
          setIsLoading(false);
        });
    }, [])
  );

  const cycleStartDates = useMemo(() => {
    try {
      return getCycleStartDates(logs);
    } catch (error) {
      console.error('Error getting cycle start dates:', error);
      return [new Date().toISOString().slice(0, 10)];
    }
  }, [logs]);

  // Get cycle data for the selected cycle index (0 = current, 1 = previous, ...). Grid length = actual cycle length.
  const { cycleData, startDate, maxCycleDay } = useMemo(() => {
    if (!cycleStartDates || cycleStartDates.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return {
        cycleData: [],
        startDate: today,
        maxCycleDay: 1,
      };
    }
    try {
      const safeCycleIndex = Math.max(0, Math.min(cycleIndex, cycleStartDates.length - 1));
      const cycleStart = cycleStartDates[safeCycleIndex] ?? new Date().toISOString().slice(0, 10);
      const { data, actualLength } = getCycleDaysFromStart(logs, cycleStart);
      const dataMap = new Map<number, CycleDayData>();
      data.forEach((d) => dataMap.set(d.cycleDay, d));

      const fullCycle: CycleDayData[] = [];
      const safeLength = Math.max(1, Math.min(actualLength || 28, MAX_RENDER_DAYS));
      for (let day = 1; day <= safeLength; day++) {
        const date = addDays(cycleStart, day - 1);
        const existingData = dataMap.get(day);
        fullCycle.push({
          cycleDay: day,
          date,
          temp: existingData?.temp ?? null,
          tempUnit: existingData?.tempUnit ?? 'C',
          tempQuestionable: existingData?.tempQuestionable ?? false,
          tempShift: existingData?.tempShift ?? false,
          flow: existingData?.flow ?? null,
          fluid: existingData?.fluid ?? null,
          sex: existingData?.sex ?? null,
          notes: existingData?.notes ?? '',
          symptoms: existingData?.symptoms ?? {},
          isPeak: existingData?.isPeak ?? false,
        });
      }

      return {
        cycleData: fullCycle,
        startDate: cycleStart,
        maxCycleDay: safeLength,
      };
    } catch (error) {
      console.error('Error building cycle data:', error);
      // Return safe default
      const today = new Date().toISOString().slice(0, 10);
      return {
        cycleData: [],
        startDate: today,
        maxCycleDay: 1,
      };
    }
  }, [logs, cycleIndex, cycleStartDates]);

  const gridWidth = maxCycleDay * COLUMN_WIDTH;

  // After cycle data is built, scroll to the same date the user had open in "My data".
  // We show (selected day - 4) ... selected day for context, pinned to the left edge.
  useEffect(() => {
    if (isLoading || !cycleData.length) return;
    if (!focusTarget) return;
    // Wait until the requested cycle is actually active before scrolling.
    if (cycleIndex !== focusTarget.cycleIndex) return;

    const targetDate = focusTarget.date;
    // Prefer exact string match (date strings should be YYYY-MM-DD).
    let targetDayIndex = cycleData.findIndex((d) => d.date === targetDate);
    if (targetDayIndex < 0) {
      // Fallback to ms-based calculation if there is any mismatch.
      const startMs = new Date(`${startDate}T12:00:00`).getTime();
      const targetMs = new Date(`${targetDate}T12:00:00`).getTime();
      targetDayIndex = Math.floor((targetMs - startMs) / MS_PER_DAY);
    }
    if (!Number.isFinite(targetDayIndex)) targetDayIndex = 0;
    targetDayIndex = Math.max(0, Math.min(targetDayIndex, cycleData.length - 1));

    const viewportWidth = Math.max(1, winWidth - LEFT_LABEL_WIDTH - RIGHT_AXIS_WIDTH);
    const maxScrollX = Math.max(0, gridWidth - viewportWidth);

    const contextDaysBefore = 4;
    const desiredX = Math.max(0, (targetDayIndex - contextDaysBefore) * COLUMN_WIDTH);
    const nextX = Math.min(desiredX, maxScrollX);

    scrollXRef.current = nextX;
    setScrollX(nextX);
    requestAnimationFrame(() => {
      (scrollViewRef.current as any)?.scrollTo?.({ x: nextX, animated: false });
    });

    setFocusTarget(null);
  }, [cycleData, gridWidth, isLoading, winWidth, startDate, focusTarget, cycleIndex]);

  // Calculate dynamic temperature range based on actual data - with guardrails
  const { tempMin, tempMax, yAxisLabels, tempIncrement } = useMemo(() => {
    try {
      if (!cycleData || !Array.isArray(cycleData) || cycleData.length === 0) {
        // Default range if no data - always start with whole number
        const defaultMin = 36.0;
        const defaultMax = 37.5;
        const labels: number[] = [];
        // Generate labels with 0.1 increments: 36.0, 36.1, 36.2, ..., 37.5
        for (let temp = defaultMin; temp <= defaultMax + 0.01; temp += TEMP_INCREMENT) {
          labels.push(Math.round(temp * 10) / 10);
        }
        return { tempMin: defaultMin, tempMax: defaultMax, yAxisLabels: labels, tempIncrement: TEMP_INCREMENT };
      }
      
      const temps = cycleData
        .filter((d) => d && d.temp != null && !d.tempQuestionable)
        .map((d) => {
          const converted = convertTemp(d.temp!, d.tempUnit);
          // Guardrail: clamp to normal human body temperature range (35-40°C)
          return Math.max(35.0, Math.min(40.0, converted));
        });
    
    if (temps.length === 0) {
      // Default range if no data - always start with whole number
      const defaultMin = 36.0;
      const defaultMax = 37.5;
      const labels: number[] = [];
      // Generate labels with 0.1 increments: 36.0, 36.1, 36.2, ..., 37.5
      for (let temp = defaultMin; temp <= defaultMax + 0.01; temp += TEMP_INCREMENT) {
        labels.push(Math.round(temp * 10) / 10);
      }
      return { tempMin: defaultMin, tempMax: defaultMax, yAxisLabels: labels, tempIncrement: TEMP_INCREMENT };
    }
    
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const range = maxTemp - minTemp;
    // Limit padding to prevent excessive range expansion
    const padding = Math.min(Math.max(0.3, range * 0.1), 0.5); // At least 0.3, but max 0.5 padding
    
    // Always start with a whole number at the bottom for reference
    // Round down to nearest whole number
    const tempMinRaw = minTemp - padding;
    const tempMinWhole = Math.floor(tempMinRaw); // Round down to whole number
    const finalMin = Math.max(35.0, tempMinWhole); // Ensure within guardrails, always whole number
    
    // Round up max to include padding, but limit range to reasonable size
    const tempMaxRaw = maxTemp + padding;
    const tempMax = Math.ceil(tempMaxRaw * 10) / 10; // Round up to nearest 0.1
    // Limit max range to prevent too many labels - cap at 3.0°C range max
    const maxRange = finalMin + 3.0;
    const finalMax = Math.min(40.0, tempMax, maxRange);
    
    // Always use 0.1 increments to show .1, .2, etc.
    // Font sizing will handle spacing automatically, so we can always use 0.1 increments
    const increment = TEMP_INCREMENT; // Always 0.1 increments
    
    // Generate labels starting from whole number, including .1, .2, etc.
    const labels: number[] = [];
    // Use precise increment to avoid floating point errors
    const step = increment;
    let current = finalMin;
    while (current <= finalMax + 0.01) {
      labels.push(Math.round(current * 10) / 10);
      current += step;
    }
    
      return { tempMin: finalMin, tempMax: finalMax, yAxisLabels: labels, tempIncrement: increment };
    } catch (error) {
      console.error('Error calculating temperature range:', error);
      // Return safe defaults
      const defaultMin = 36.0;
      const defaultMax = 37.5;
      const labels: number[] = [];
      for (let temp = defaultMin; temp <= defaultMax + 0.01; temp += TEMP_INCREMENT) {
        labels.push(Math.round(temp * 10) / 10);
      }
      return { tempMin: defaultMin, tempMax: defaultMax, yAxisLabels: labels, tempIncrement: TEMP_INCREMENT };
    }
  }, [cycleData]);

  // Calculate dynamic flux height - make chart area fill 0.6 of screen height
  // Fluid rows are now 30% shorter, so we need to adjust the calculation
  const dynamicFluxHeight = useMemo(() => {
    // Calculate total height needed: date rows + fluid rows + flow row = 0.6 of screen
    const targetTotalHeight = winHeight * 0.6;
    const dateRowsHeight = DATE_ROW_HEIGHT * 3;
    // Estimate flow row height as same as individual fluid row (will be calculated dynamically later)
    const estimatedFlowRowHeight = (targetTotalHeight * 0.4) / FLUID_TYPES.length;
    const padding = 12 + 8; // Padding between sections
    
    // Calculate available height for fluid rows area
    const availableHeight = targetTotalHeight - dateRowsHeight - estimatedFlowRowHeight - padding;
    
    // Use the calculated height, but ensure minimum height
    return Math.max(availableHeight, FLUX_HEIGHT);
  }, [winHeight]);
  
  // Calculate fluid rows height (30% reduced, then +10% for spacing)
  const fluidRowsHeight = useMemo(() => {
    if (FLUID_TYPES.length === 0 || dynamicFluxHeight <= 0) return FLUX_HEIGHT;
    const calculated = (dynamicFluxHeight / FLUID_TYPES.length) * 0.7 * FLUID_TYPES.length * 1.1;
    return isNaN(calculated) || calculated <= 0 ? FLUX_HEIGHT : calculated;
  }, [dynamicFluxHeight]);

  // Flow row height is the same as individual fluid row height (dynamic, memoized)
  const flowRowHeight = useMemo(() => {
    if (FLUID_TYPES.length === 0 || fluidRowsHeight <= 0 || isNaN(fluidRowsHeight)) {
      return FLUID_ROW_HEIGHT_REDUCED;
    }
    const calculated = fluidRowsHeight / FLUID_TYPES.length;
    return isNaN(calculated) || calculated <= 0 ? FLUID_ROW_HEIGHT_REDUCED : calculated;
  }, [fluidRowsHeight]);

  // Collect all unique symptoms from all logs - only include symptoms that have been selected (intensity > 0) at least once
  const allSymptoms = useMemo(() => {
    try {
      const symptomSet = new Set<string>();
      // Check all logs for symptoms with non-zero intensity
      if (logs && Array.isArray(logs)) {
        logs.forEach((log) => {
          if (log && log.symptoms) {
            Object.keys(log.symptoms).forEach((symptom) => {
              // Only include symptoms that have been selected (intensity > 0) at least once
              if (log.symptoms[symptom] > 0) {
                symptomSet.add(symptom);
              }
            });
          }
        });
      }
      // Also check cycleData for symptoms (though it should be redundant since cycleData comes from logs)
      if (cycleData && Array.isArray(cycleData)) {
        cycleData.forEach((d) => {
          if (d && d.symptoms) {
            Object.keys(d.symptoms).forEach((symptom) => {
              if (d.symptoms[symptom] > 0) {
                symptomSet.add(symptom);
              }
            });
          }
        });
      }
      return Array.from(symptomSet).sort();
    } catch (error) {
      console.error('Error collecting symptoms:', error);
      return [];
    }
  }, [logs, cycleData]);

  // Calculate chart dimensions
  const totalWidth = LEFT_LABEL_WIDTH + gridWidth + RIGHT_AXIS_WIDTH;
  const dateRowsHeight = DATE_ROW_HEIGHT * 3; // Removed month row, now 3 rows
  // Individual fluid row height (for calculations) - use flowRowHeight which is already calculated
  const individualFluidRowHeight = flowRowHeight;
  // Add symptom rows
  const symptomRowsHeight = allSymptoms.length * ACTIVITY_ROW_HEIGHT;
  // Ensure all values are valid numbers before calculating
  const safeFlowRowHeight = isNaN(flowRowHeight) || flowRowHeight <= 0 ? FLUID_ROW_HEIGHT_REDUCED : flowRowHeight;
  const safeDynamicFluxHeight = isNaN(dynamicFluxHeight) || dynamicFluxHeight <= 0 ? FLUX_HEIGHT : dynamicFluxHeight;
  const dataRowsHeight = safeDynamicFluxHeight + safeFlowRowHeight + (ACTIVITY_ROW_HEIGHT * 2) + symptomRowsHeight;
  const totalHeight = dateRowsHeight + dataRowsHeight; // No extra padding - stop exactly at last item

  // Cycle number for title: 1 = earliest, N = latest (updates when cycleIndex or cycle count changes)
  const cycleNumber = useMemo(
    () => Math.max(1, cycleStartDates.length - cycleIndex),
    [cycleIndex, cycleStartDates.length]
  );

  // Calculate visible month based on scroll position
  const visibleMonth = useMemo(() => {
    const visibleColumn = Math.floor(scrollX / COLUMN_WIDTH);
    const dayIndex = Math.max(0, Math.min(visibleColumn, cycleData.length - 1));
    const visibleDate = cycleData[dayIndex]?.date || startDate;
    return formatDate(visibleDate).month;
  }, [scrollX, cycleData, startDate]);

  // Start flux area (fluid rows) right after date rows - no white space
  const fluxYStart = useMemo(() => {
    return DATE_ROW_HEIGHT * 3; // Start immediately after date rows
  }, []);

  // Calculate temperature points with dynamic range - exclude questionable temps
  // Temperature graph spans from Watery row top to bottom of flow row
  const tempPoints = useMemo(() => {
    const points: { x: number; y: number; cycleDay: number; temp: number; tempShift: boolean }[] = [];
    const tempGraphHeight = fluidRowsHeight + flowRowHeight; // Temperature graph spans fluid rows + flow row
    
    cycleData.forEach((d) => {
      // Only show temps that are not questionable
      if (d.temp != null && !d.tempQuestionable) {
        const tempC = convertTemp(d.temp, d.tempUnit);
        // Guardrail: clamp to normal range
        const clampedTemp = Math.max(35.0, Math.min(40.0, tempC));
        const x = LEFT_LABEL_WIDTH + (d.cycleDay - 1) * COLUMN_WIDTH + COLUMN_WIDTH / 2;
        // Position: top is fluxYStart (Watery), bottom is fluxYStart + fluidRowsHeight + flowRowHeight (bottom of flow row)
        const tempAxisBottom = fluxYStart + fluidRowsHeight + flowRowHeight;
        const tempRange = tempMax - tempMin;
        const y = tempRange > 0 
          ? tempAxisBottom - ((clampedTemp - tempMin) / tempRange) * tempGraphHeight
          : tempAxisBottom - tempGraphHeight / 2; // Center if no range
        points.push({ x, y, cycleDay: d.cycleDay, temp: clampedTemp, tempShift: d.tempShift });
      }
    });
    return points.sort((a, b) => a.cycleDay - b.cycleDay);
  }, [cycleData, fluxYStart, tempMin, tempMax, fluidRowsHeight, flowRowHeight]);

  const tempPathD = useMemo(() => smoothPath(tempPoints.map((p) => ({ x: p.x, y: p.y }))), [tempPoints]);

  // Temp shift 1–2–3: shift day = 1, day after = 2 (if has temp), next = 3 (if has temp); skip missing
  const tempShiftNumberByCycleDay = useMemo(() => {
    const map: Record<number, 1 | 2 | 3> = {};
    let shiftDay: number | null = null; // Track the shift day's cycleDay
    let nextExpectedDay = 0; // 0 = none, 2 = expecting day 2, 3 = expecting day 3
    cycleData.forEach((d) => {
      if (d.tempShift && d.temp != null && !d.tempQuestionable) {
        map[d.cycleDay] = 1;
        shiftDay = d.cycleDay;
        nextExpectedDay = 2; // Next day should be 2
      } else if (shiftDay !== null && d.temp != null && !d.tempQuestionable) {
        if (nextExpectedDay === 2) {
          if (d.cycleDay === shiftDay + 1) {
            // Calendar day after shift: show 2
            map[d.cycleDay] = 2;
            nextExpectedDay = 3;
          } else {
            // Skipped day 2 (shiftDay+1 has no temp), next day with temp shows 3
            map[d.cycleDay] = 3;
            shiftDay = null;
            nextExpectedDay = 0;
          }
        } else if (nextExpectedDay === 3) {
          if (d.cycleDay === shiftDay + 2) {
            // Calendar day 2 after shift: show 3
            map[d.cycleDay] = 3;
            shiftDay = null;
            nextExpectedDay = 0;
          } else {
            // Day 3 is missing (shiftDay+2 has no temp), don't show 3, reset
            shiftDay = null;
            nextExpectedDay = 0;
          }
        }
      }
    });
    return map;
  }, [cycleData]);

  // Questionable temps: same dot position/size as others, not in the line; show as lighter grey
  const questionableTempPoints = useMemo(() => {
    const points: { x: number; y: number; cycleDay: number }[] = [];
    const tempGraphHeight = fluidRowsHeight + flowRowHeight;
    const tempAxisBottom = fluxYStart + fluidRowsHeight + flowRowHeight;
    cycleData.forEach((d) => {
      if (d.temp != null && d.tempQuestionable) {
        const tempC = convertTemp(d.temp, d.tempUnit);
        const clampedTemp = Math.max(35.0, Math.min(40.0, tempC));
        const x = LEFT_LABEL_WIDTH + (d.cycleDay - 1) * COLUMN_WIDTH + COLUMN_WIDTH / 2;
        const tempRange = tempMax - tempMin;
        const y = tempRange > 0 
          ? tempAxisBottom - ((clampedTemp - tempMin) / tempRange) * tempGraphHeight
          : tempAxisBottom - tempGraphHeight / 2; // Center if no range
        points.push({ x, y, cycleDay: d.cycleDay });
      }
    });
    return points;
  }, [cycleData, fluxYStart, tempMin, tempMax, fluidRowsHeight, flowRowHeight]);

  const handleChartTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const chartStartX = LEFT_LABEL_WIDTH;

    if (locationX < chartStartX || locationX > chartStartX + gridWidth) {
      setScrubberDay(null);
      setSelectedDayForEdit(null);
      setTapPosition(null);
      return;
    }

    const relativeX = locationX - chartStartX;
    const day = Math.floor(relativeX / COLUMN_WIDTH) + 1;
    if (day >= 1 && day <= maxCycleDay) {
      // Light tap: show tint column + tooltip (positioned above tap so finger doesn't hide it)
      setScrubberDay(day);
      setSelectedDayForEdit(day);
      setTapPosition({ x: locationX, y: locationY });
    } else {
      setScrubberDay(null);
      setSelectedDayForEdit(null);
      setTapPosition(null);
    }
  };

  const handleChartLongPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const chartStartX = LEFT_LABEL_WIDTH;

    if (locationX < chartStartX || locationX > chartStartX + gridWidth) {
      return;
    }

    const relativeX = locationX - chartStartX;
    const day = Math.floor(relativeX / COLUMN_WIDTH) + 1;
    if (day >= 1 && day <= maxCycleDay) {
      const selectedData = cycleData.find((d) => d.cycleDay === day);
      if (selectedData && !isFutureDate(selectedData.date)) {
        router.push(`/(tabs)/log?date=${selectedData.date}`);
      }
    }
  };

  const selectedData = scrubberDay ? cycleData.find((d) => d.cycleDay === scrubberDay) : null;
  const scrubberX = scrubberDay ? LEFT_LABEL_WIDTH + (scrubberDay - 1) * COLUMN_WIDTH + COLUMN_WIDTH / 2 : null;

  const handleTooltipLongPress = useCallback(() => {
    if (selectedData && !isFutureDate(selectedData.date)) {
      router.push(`/(tabs)/log?date=${selectedData.date}`);
    }
  }, [selectedData]);

  const refreshLogs = useCallback(() => {
    getAllLogs().then((loadedLogs) => {
      setLogs(loadedLogs);
    });
  }, []);

  const goToPreviousCycle = useCallback(() => {
    setCycleIndex((i) => Math.min(i + 1, cycleStartDates.length - 1));
    setScrubberDay(null);
    setSelectedDayForEdit(null);
    setTapPosition(null);
    refreshLogs();
  }, [cycleStartDates.length, refreshLogs]);

  const goToNextCycle = useCallback(() => {
    setCycleIndex((i) => Math.max(0, i - 1));
    setScrubberDay(null);
    setSelectedDayForEdit(null);
    setTapPosition(null);
    refreshLogs();
    // Show the new cycle from the start (day 1), not from the previous scroll position
    scrollXRef.current = 0;
    setScrollX(0);
    setTimeout(() => {
      (scrollViewRef.current as any)?.scrollTo?.({ x: 0, animated: false });
    }, 0);
  }, [refreshLogs]);

  // Left column: PanResponder for reliable swipe, but keep column visually fixed.
  const SWIPE_THRESHOLD = 35;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {},
        onPanResponderMove: () => {},
        onPanResponderRelease: (_, gestureState) => {
          const dx = gestureState.dx;
          const vx = gestureState.vx;
          const shouldChange =
            Math.abs(dx) > SWIPE_THRESHOLD || (typeof vx === 'number' && Math.abs(vx) > 0.3);
          if (shouldChange) {
            if (dx < 0) {
              goToNextCycle();
            } else {
              goToPreviousCycle();
            }
          }
        },
        onPanResponderTerminate: () => {},
      }),
    [goToNextCycle, goToPreviousCycle]
  );

  const gridScrollWidth = winWidth - LEFT_LABEL_WIDTH - RIGHT_AXIS_WIDTH;
  const gridDragStartX = useRef(0);
  const gridCanScroll = gridWidth > gridScrollWidth;

  // Grid: when user scrolls/drags right to the end and releases → go forward to newer cycle
  const handleGridScrollBeginDrag = useCallback(() => {
    gridDragStartX.current = scrollXRef.current;
  }, []);
  const handleGridScrollEndDrag = useCallback(() => {
    const maxScrollX = Math.max(0, gridWidth - gridScrollWidth);
    const atRightEdge = scrollXRef.current >= maxScrollX - 15;
    const scrolledRight = scrollXRef.current > gridDragStartX.current + 25;
    if (cycleStartDates.length > 1 && atRightEdge && scrolledRight) {
      goToNextCycle();
    }
  }, [goToNextCycle, gridWidth, gridScrollWidth, cycleStartDates.length]);

  // When grid doesn't scroll (short cycle), right-edge strip detects swipe right → forward
  const gridForwardPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > SWIPE_THRESHOLD || (typeof gestureState.vx === 'number' && gestureState.vx > 0.25)) {
            goToNextCycle();
          }
        },
      }),
    [goToNextCycle]
  );


  // Format temperature label: round numbers show "36.0", decimals show ".1", ".2", etc.
  // For 0.5 increments: whole numbers show "36.0", .5 values show ".5"
  const formatTempLabel = useCallback((temp: number): string => {
    // Round to 1 decimal place first to avoid floating point issues
    const rounded = Math.round(temp * 10) / 10;
    
    // Check if it's a round number (ends in .0)
    const remainder = Math.abs(rounded % 1);
    const isRoundNumber = remainder < 0.001 || remainder > 0.999;
    
    if (isRoundNumber) {
      // Round number: show full number with .0 (e.g., "36.0")
      return rounded.toFixed(1);
    }
    
    // Non-round number: show just decimal part
    if (tempIncrement === 0.5) {
      // For 0.5 increments, show ".5" between whole numbers
      return '.5';
    } else {
      // For 0.1 increments, show ".1", ".2", etc.
      // Extract decimal part: multiply remainder by 10 and round
      // Handle both positive and ensure we get the right decimal digit
      const decimalPart = Math.round(remainder * 10);
      // Ensure we only show 1-9, not 0 or 10
      if (decimalPart === 0 || decimalPart === 10) {
        return rounded.toFixed(1); // Fallback to full number if something went wrong
      }
      return `.${decimalPart}`;
    }
  }, [tempIncrement]);

  // Show loading screen
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.waterBackground} pointerEvents="none">
          <LinearGradient
            colors={[FreshFeminine.warmWhite, FreshFeminine.sageMuted]}
            style={StyleSheet.absoluteFillObject}
          />
          <WatercolorStains />
        </View>
        <View style={styles.loadingContainer}>
          <Animated.View style={animatedStyle}>
            <ActivityIndicator size="large" color={FreshFeminine.aqua} />
          </Animated.View>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <View style={styles.waterBackground} pointerEvents="none">
          <LinearGradient
            colors={[FreshFeminine.warmWhite, FreshFeminine.sageMuted]}
            style={StyleSheet.absoluteFillObject}
          />
          <WatercolorStains />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorTitle}>Your chart couldn't load</Text>
          <Text style={styles.errorBody}>Check your connection and try again.</Text>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
      <View style={styles.waterBackground} pointerEvents="none">
        <LinearGradient
          colors={[FreshFeminine.warmWhite, FreshFeminine.sageMuted]}
          style={StyleSheet.absoluteFillObject}
        />
        <WatercolorStains />
      </View>
      <View style={styles.chartTopBar}>
        <Text style={styles.chartTopBarTitle} key={`cycle-${cycleIndex}`}>
          Cycle {cycleNumber}
        </Text>
        <Text style={styles.chartTopBarSubTitle}>{formatCycleStartDisplay(startDate)}</Text>
      </View>
      <View style={styles.chartWrapper}>
        {/* Sticky right-side temperature axis - stretch from Watery row top to above Flow row bottom */}
        <View style={styles.stickyRightAxis}>
          {yAxisLabels.map((temp, i) => {
            // Temperature axis spans from top of fluid rows to just above flow row bottom line
            // Bottom label (tempMin, e.g., 36.0) is positioned above the flow row's bottom line
            const flowRowBottom = fluxYStart + fluidRowsHeight + flowRowHeight; // Bottom line of flow row
            const tempAxisHeight = fluidRowsHeight + flowRowHeight - 8; // Reduce height to leave space above bottom line
            const tempAxisBottom = flowRowBottom - 8; // Position bottom of axis 8px above flow row bottom
            const tempRange = tempMax - tempMin;
            const y = tempRange > 0 
              ? tempAxisBottom - ((temp - tempMin) / tempRange) * tempAxisHeight
              : tempAxisBottom - tempAxisHeight / 2; // Center if no range
            // Calculate font size based on spacing - smaller font if labels are close together
            const labelSpacing = tempAxisHeight / (yAxisLabels.length - 1 || 1);
            const fontSize = labelSpacing < 20 ? 8 : labelSpacing < 30 ? 9 : 10; // Reduced font sizes
            return (
              <Text
                key={`axis-${i}`}
                style={[styles.axisLabel, { top: y - fontSize / 2, fontSize }]}
              >
                {formatTempLabel(temp)}
              </Text>
            );
          })}
        </View>

        {/* Vertical ScrollView wrapper to allow scrolling when content exceeds screen height */}
        <RNScrollView
          key={`chart-scroll-${totalHeight}-${allSymptoms.length}`}
          style={styles.verticalScroll}
          contentContainerStyle={{ 
            height: totalHeight,
            paddingBottom: 0,
            marginBottom: 0,
            flexGrow: 0,
          }}
          showsVerticalScrollIndicator={totalHeight > winHeight}
          nestedScrollEnabled={true}
          bounces={false}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          scrollEnabled={totalHeight > winHeight}
        >
          <View style={styles.chartRow}>
            {/* Frozen left column: swipe or tap arrows to change cycle */}
            <View
              style={{ width: LEFT_LABEL_WIDTH, height: totalHeight }}
              {...panResponder.panHandlers}
            >
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]}>
              <View style={{ position: 'absolute', right: 0, top: 0, width: 1, height: totalHeight, backgroundColor: FreshFeminine.gridFaint }} />
              <View style={[styles.leftLabels, { height: totalHeight }]}>
              <View style={[styles.labelRow, { top: 0, height: DATE_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }]}>
                {cycleStartDates.length > 1 && (
                  <Pressable
                    onPress={goToPreviousCycle}
                    hitSlop={8}
                    style={({ pressed }) => [{ opacity: cycleIndex >= cycleStartDates.length - 1 ? 0.3 : pressed ? 0.6 : 1, marginRight: 8 }]}
                    disabled={cycleIndex >= cycleStartDates.length - 1}
                  >
                    <Text style={[styles.leftLabelText, { fontWeight: '700', fontSize: 14 }]}>‹</Text>
                  </Pressable>
                )}
                <View>
                  <Text style={[styles.leftLabelText, { fontWeight: '600', textAlign: 'right' }]}>{visibleMonth}</Text>
                </View>
                {cycleStartDates.length > 1 && (
                  <Pressable
                    onPress={goToNextCycle}
                    hitSlop={8}
                    style={({ pressed }) => [{ opacity: cycleIndex <= 0 ? 0.3 : pressed ? 0.6 : 1, marginLeft: 8 }]}
                    disabled={cycleIndex <= 0}
                  >
                    <Text style={[styles.leftLabelText, { fontWeight: '700', fontSize: 14 }]}>›</Text>
                  </Pressable>
                )}
              </View>
              <View style={[styles.labelRow, { top: DATE_ROW_HEIGHT, height: DATE_ROW_HEIGHT, justifyContent: 'center' }]}>
                <Text style={[styles.leftLabelText, { fontWeight: '600', textAlign: 'right' }]}>Weekday</Text>
              </View>
              <View style={[styles.labelRow, { top: DATE_ROW_HEIGHT * 2, height: DATE_ROW_HEIGHT, justifyContent: 'center' }]}>
                <Text style={[styles.leftLabelText, { fontWeight: '600', textAlign: 'right' }]}>Cycle day</Text>
              </View>
              {FLUID_TYPES.map((fluidType, idx) => {
                // Skip None row since it's removed
                if (fluidType === 'None') return null;
                // Safety check for division
                if (FLUID_TYPES.length === 0 || fluidRowsHeight <= 0 || isNaN(fluidRowsHeight)) {
                  return null;
                }
                const rowHeight = fluidRowsHeight / FLUID_TYPES.length;
                const fluidY = fluxYStart + fluidRowsHeight - (FLUID_TYPES.length - idx) * rowHeight;
                const bgColor = getFluidLabelColor(fluidType);
                return (
                  <View
                    key={`fluid-label-${fluidType}`}
                    style={[styles.labelRow, { top: fluidY, height: rowHeight, backgroundColor: bgColor }]}
                  >
                    <Text style={styles.leftLabelText} numberOfLines={1} ellipsizeMode="tail">{fluidType}</Text>
                  </View>
                );
              })}
              <View style={[styles.labelRow, { top: fluxYStart + fluidRowsHeight, height: flowRowHeight, backgroundColor: '#F8EBF8', justifyContent: 'center' }]}>
                <Text style={[styles.leftLabelText, { color: FreshFeminine.charcoal }]} numberOfLines={1} ellipsizeMode="tail">Flow</Text>
              </View>
              <View style={[styles.labelRow, { top: fluxYStart + fluidRowsHeight + flowRowHeight, height: ACTIVITY_ROW_HEIGHT, backgroundColor: '#FFFFFF' }]}>
                <Text style={[styles.leftLabelText, { color: FreshFeminine.charcoal }]} numberOfLines={1} ellipsizeMode="tail">Fysical<Text style={[styles.leftLabelText, styles.tmSuperscript]}>™</Text></Text>
              </View>
              <View style={[styles.labelRow, { top: fluxYStart + fluidRowsHeight + flowRowHeight + ACTIVITY_ROW_HEIGHT, height: ACTIVITY_ROW_HEIGHT, backgroundColor: '#FFFFFF' }]}>
                <Text style={[styles.leftLabelText, { color: FreshFeminine.charcoal }]} numberOfLines={1} ellipsizeMode="tail">Free-form</Text>
              </View>
              {allSymptoms.map((symptom, idx) => {
                const symptomY = fluxYStart + fluidRowsHeight + flowRowHeight + (ACTIVITY_ROW_HEIGHT * 2) + (idx * ACTIVITY_ROW_HEIGHT);
                return (
                  <View key={`symptom-label-${symptom}`} style={[styles.labelRow, { top: symptomY, height: ACTIVITY_ROW_HEIGHT, backgroundColor: '#FFFFFF' }]}>
                    <Text style={[styles.leftLabelText, { color: FreshFeminine.charcoal }]} numberOfLines={1} ellipsizeMode="tail">{symptom}</Text>
                  </View>
                );
              })}
              </View>
            </Animated.View>
            </View>

            {/* Grid: horizontal scroll to see all days; right-edge strip detects swipe right → forward */}
            <View style={{ flex: 1, position: 'relative' }}>
            <GHScrollView
              ref={scrollViewRef}
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, { width: gridWidth }]}
              showsVerticalScrollIndicator={false}
              horizontal
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
              bounces={false}
              onScroll={(event) => {
                const x = event.nativeEvent.contentOffset.x;
                // Prevent scrolling to the right (negative scroll) - keep grid stuck to left edge
                if (x < 0 && !isResettingScrollRef.current && scrollViewRef.current) {
                  isResettingScrollRef.current = true;
                  scrollViewRef.current.scrollTo({ x: 0, animated: false });
                  setTimeout(() => {
                    isResettingScrollRef.current = false;
                  }, 50);
                }
                const clampedX = Math.max(0, x);
                scrollXRef.current = clampedX;
                setScrollX(clampedX);
              }}
              onScrollBeginDrag={handleGridScrollBeginDrag}
              onScrollEndDrag={(event) => {
                // Reset scroll if it went negative (scrolled right past left edge)
                const x = event.nativeEvent.contentOffset.x;
                if (x < 0 && scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({ x: 0, animated: false });
                  scrollXRef.current = 0;
                  setScrollX(0);
                }
                handleGridScrollEndDrag();
              }}
              onMomentumScrollEnd={(event) => {
                // Also reset on momentum scroll end if it went negative
                const x = event.nativeEvent.contentOffset.x;
                if (x < 0 && scrollViewRef.current) {
                  scrollViewRef.current.scrollTo({ x: 0, animated: false });
                  scrollXRef.current = 0;
                  setScrollX(0);
                }
              }}
              scrollEventThrottle={16}
            >
              <View style={{ width: gridWidth, height: totalHeight, overflow: 'hidden' }}>
                <View style={[styles.chartContainer, { width: totalWidth - RIGHT_AXIS_WIDTH, height: totalHeight, minHeight: totalHeight, maxHeight: totalHeight, position: 'absolute', left: -LEFT_LABEL_WIDTH }]}>
            <Pressable 
              onPress={handleChartTouch} 
              onLongPress={handleChartLongPress}
              delayLongPress={300}
              style={StyleSheet.absoluteFill}
            >
              <Svg width={totalWidth - RIGHT_AXIS_WIDTH} height={totalHeight}>
                <Defs>
                  {/* Clip path to cut off date rows at temp column boundary */}
                  <ClipPath id="dateRowsClip">
                    <Rect x={0} y={0} width={LEFT_LABEL_WIDTH + gridWidth} height={DATE_ROW_HEIGHT * 3 + 4} />
                  </ClipPath>
                </Defs>


                {/* Date rows - clipped at temp column boundary */}
                <G clipPath="url(#dateRowsClip)">
                  {/* Vertical grid lines - only extend to temp column, not into it */}
                  {Array.from({ length: maxCycleDay + 1 }).map((_, i) => {
                    const x = LEFT_LABEL_WIDTH + i * COLUMN_WIDTH;
                    return (
                      <Line
                        key={`v-${i}`}
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={DATE_ROW_HEIGHT * 3 + 4}
                        stroke={FreshFeminine.gridFaint}
                        strokeWidth={GRID_LINE_WIDTH}
                      />
                    );
                  })}
                  
                  {/* Vertical separator line at boundary between date rows and temp column - make it more visible */}
                  <Line
                    x1={LEFT_LABEL_WIDTH + gridWidth}
                    y1={0}
                    x2={LEFT_LABEL_WIDTH + gridWidth}
                    y2={DATE_ROW_HEIGHT * 3 + 4}
                    stroke={FreshFeminine.charcoalLight}
                    strokeWidth={1}
                    opacity={0.3}
                  />
                </G>
                
                {/* Vertical grid lines for data area - stop exactly at last symptom row bottom */}
                {Array.from({ length: maxCycleDay + 1 }).map((_, i) => {
                  const x = LEFT_LABEL_WIDTH + i * COLUMN_WIDTH;
                  // Calculate the exact bottom of the last symptom row (no extra padding)
                  const lastSymptomRowBottom = fluxYStart + fluidRowsHeight + flowRowHeight + (ACTIVITY_ROW_HEIGHT * 2) + (allSymptoms.length * ACTIVITY_ROW_HEIGHT);
                  return (
                    <Line
                      key={`v-data-${i}`}
                      x1={x}
                      y1={fluxYStart}
                      x2={x}
                      y2={lastSymptomRowBottom}
                      stroke={FreshFeminine.gridFaint}
                      strokeWidth={GRID_LINE_WIDTH}
                    />
                  );
                })}
                
                {/* Vertical line at the end to extend background */}
                <Line
                  x1={LEFT_LABEL_WIDTH + gridWidth}
                  y1={fluxYStart}
                  x2={LEFT_LABEL_WIDTH + gridWidth}
                  y2={dateRowsHeight + dataRowsHeight}
                  stroke={FreshFeminine.gridFaint}
                  strokeWidth={GRID_LINE_WIDTH}
                />

                {/* Horizontal grid lines for temperature - span fluid rows + flow row */}
                {yAxisLabels.map((temp, i) => {
                  // Temperature grid lines span fluid rows + flow row
                  const tempAxisHeight = fluidRowsHeight + flowRowHeight;
                  const tempAxisBottom = fluxYStart + fluidRowsHeight + flowRowHeight;
                  const tempRange = tempMax - tempMin;
            const y = tempRange > 0 
              ? tempAxisBottom - ((temp - tempMin) / tempRange) * tempAxisHeight
              : tempAxisBottom - tempAxisHeight / 2; // Center if no range
                  return (
                    <Line
                      key={`h-${i}`}
                      x1={LEFT_LABEL_WIDTH}
                      y1={y}
                      x2={LEFT_LABEL_WIDTH + gridWidth}
                      y2={y}
                      stroke={FreshFeminine.gridFaint}
                      strokeWidth={GRID_LINE_WIDTH}
                    />
                  );
                })}

                {/* Horizontal grid lines for data rows - align with actual row positions */}
                {/* Flow row top (bottom of fluid rows) */}
                <Line
                  x1={LEFT_LABEL_WIDTH}
                  y1={fluxYStart + fluidRowsHeight}
                  x2={LEFT_LABEL_WIDTH + gridWidth}
                  y2={fluxYStart + fluidRowsHeight}
                  stroke={FreshFeminine.gridFaint}
                  strokeWidth={GRID_LINE_WIDTH}
                />
                {/* Flow row bottom */}
                <Line
                  x1={LEFT_LABEL_WIDTH}
                  y1={fluxYStart + fluidRowsHeight + flowRowHeight}
                  x2={LEFT_LABEL_WIDTH + gridWidth}
                  y2={fluxYStart + fluidRowsHeight + flowRowHeight}
                  stroke={FreshFeminine.gridFaint}
                  strokeWidth={GRID_LINE_WIDTH}
                />
                {/* Fysical row bottom */}
                <Line
                  x1={LEFT_LABEL_WIDTH}
                  y1={fluxYStart + fluidRowsHeight + flowRowHeight + ACTIVITY_ROW_HEIGHT}
                  x2={LEFT_LABEL_WIDTH + gridWidth}
                  y2={fluxYStart + fluidRowsHeight + flowRowHeight + ACTIVITY_ROW_HEIGHT}
                  stroke={FreshFeminine.gridFaint}
                  strokeWidth={GRID_LINE_WIDTH}
                />
                {/* Free-form row bottom */}
                <Line
                  x1={LEFT_LABEL_WIDTH}
                  y1={fluxYStart + fluidRowsHeight + flowRowHeight + ACTIVITY_ROW_HEIGHT + ACTIVITY_ROW_HEIGHT}
                  x2={LEFT_LABEL_WIDTH + gridWidth}
                  y2={fluxYStart + fluidRowsHeight + flowRowHeight + ACTIVITY_ROW_HEIGHT + ACTIVITY_ROW_HEIGHT}
                  stroke={FreshFeminine.gridFaint}
                  strokeWidth={GRID_LINE_WIDTH}
                />
                {/* Symptom row separators */}
                {allSymptoms.map((_, idx) => {
                  const symptomY = fluxYStart + fluidRowsHeight + flowRowHeight + (ACTIVITY_ROW_HEIGHT * 2) + (idx * ACTIVITY_ROW_HEIGHT);
                  return (
                    <Line
                      key={`symptom-sep-${idx}`}
                      x1={LEFT_LABEL_WIDTH}
                      y1={symptomY}
                      x2={LEFT_LABEL_WIDTH + gridWidth}
                      y2={symptomY}
                      stroke={FreshFeminine.gridFaint}
                      strokeWidth={GRID_LINE_WIDTH}
                    />
                  );
                })}

                {/* Date rows - clipped at temp column boundary */}
                <G clipPath="url(#dateRowsClip)">
                  {cycleData.map((d, idx) => {
                    const x = LEFT_LABEL_WIDTH + (d.cycleDay - 1) * COLUMN_WIDTH + COLUMN_WIDTH / 2;
                    const dateInfo = formatDate(d.date);
                    
                    return (
                      <React.Fragment key={`dates-${idx}`}>
                        {/* Day */}
                        <SvgText
                          x={x}
                          y={DATE_ROW_HEIGHT / 2 + 3}
                          fontSize={9}
                          fill={FreshFeminine.charcoal}
                          textAnchor="middle"
                        >
                          {dateInfo.day}
                        </SvgText>
                        {/* Weekday */}
                        <SvgText
                          x={x}
                          y={DATE_ROW_HEIGHT + DATE_ROW_HEIGHT / 2 + 3}
                          fontSize={9}
                          fill={FreshFeminine.charcoalLight}
                          textAnchor="middle"
                        >
                          {dateInfo.weekday}
                        </SvgText>
                        {/* Cycle day */}
                        <SvgText
                          x={x}
                          y={DATE_ROW_HEIGHT * 2 + DATE_ROW_HEIGHT / 2 + 3}
                          fontSize={9}
                          fill={FreshFeminine.charcoal}
                          textAnchor="middle"
                          fontWeight="600"
                        >
                          {d.cycleDay}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}
                </G>

                {/* Fluid rows - positioned at top, Watery at top, Sticky at bottom */}
                {FLUID_TYPES.map((fluidType, fluidIdx) => {
                  // Use reduced height (30% smaller)
                  if (FLUID_TYPES.length === 0 || fluidRowsHeight <= 0 || isNaN(fluidRowsHeight) || isNaN(flowRowHeight)) {
                    return null;
                  }
                  const rowHeight = fluidRowsHeight / FLUID_TYPES.length;
                  // Bottom of flow row is where fluid bars should start
                  const flowRowBottom = fluxYStart + fluidRowsHeight + flowRowHeight;
                  
                  return cycleData.map((d) => {
                    // Check if this day matches this fluid type
                    const matches = d.fluid === fluidType;
                    if (!matches) return null;
                    
                    const x = LEFT_LABEL_WIDTH + (d.cycleDay - 1) * COLUMN_WIDTH;
                    // Top of this fluid row (where semicircle should peak)
                    const fluidRowTop = fluxYStart + fluidRowsHeight - (FLUID_TYPES.length - fluidIdx) * rowHeight;
                    // Bar starts from bottom of flow row and extends up to this fluid row
                    const barBottom = flowRowBottom;
                    const barTop = fluidRowTop;
                    const barHeight = barBottom - barTop;
                    const barColor = getFluidColor(d.fluid);
                    
                    // Skip if bar height is invalid
                    if (barHeight <= 0) return null;
                    
                    // Always use semicircle for fluid bars
                    const radius = COLUMN_WIDTH / 2;
                    // createRoundedTopBarPath draws from (y + radius) to (y + height)
                    // We want the bottom at barBottom, so: barBottom = barTop + pathHeight
                    // Therefore: pathHeight = barBottom - barTop = barHeight
                    const pathHeight = barHeight;
                    return (
                      <Path
                        key={`fluid-${fluidType}-${d.cycleDay}`}
                        d={createRoundedTopBarPath(x, barTop, COLUMN_WIDTH, pathHeight)}
                        fill={barColor}
                      />
                    );
                  });
                })}

                {/* Temperature line - grey color, no gradient fill */}
                {tempPathD && (
                  <Path
                    d={tempPathD}
                    fill="none"
                    stroke="#808080"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Temperature data point dots - numbered circle (1,2,3) for temp shift sequence, else plain dot */}
                {tempPoints.map((p, i) => {
                  const num = tempShiftNumberByCycleDay[p.cycleDay];
                  if (num !== undefined) {
                    return (
                      <G key={`temp-dot-${i}`}>
                        <Circle cx={p.x} cy={p.y} r={8} fill={FreshFeminine.fluid6} />
                        <SvgText
                          x={p.x}
                          y={p.y + 4}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize={14}
                          fontWeight="700"
                        >
                          {String(num)}
                        </SvgText>
                      </G>
                    );
                  }
                  return (
                    <Circle
                      key={`temp-dot-${i}`}
                      cx={p.x}
                      cy={p.y}
                      r={3}
                      fill="#808080"
                    />
                  );
                })}

                {/* Questionable temperature dots - same size, lighter grey, not in graph line */}
                {questionableTempPoints.map((p, i) => (
                  <Circle
                    key={`temp-questionable-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={3}
                    fill="#b8b8b8"
                  />
                ))}

                {/* Flow row - positioned right below fluid rows */}
                {cycleData.map((d) => {
                  if (!d.flow) return null;
                  const x = LEFT_LABEL_WIDTH + (d.cycleDay - 1) * COLUMN_WIDTH;
                  const barHeight = getFlowHeight(d.flow, flowRowHeight);
                  // Skip if no height
                  if (barHeight <= 0) return null;
                  
                  // Flow bar starts from bottom of flow row and extends upward
                  const flowRowBottom = fluxYStart + fluidRowsHeight + flowRowHeight;
                  const barBottom = flowRowBottom; // Bottom of bar = bottom of flow row
                  const barTop = flowRowBottom - barHeight; // Top of bar (where semicircle peaks)
                  const flowColor = d.flow === 'Spotting' ? FreshFeminine.flowSpotting : 
                                   d.flow === 'Light' ? FreshFeminine.flowLight :
                                   d.flow === 'Medium' ? FreshFeminine.flowMedium : FreshFeminine.flowDark;
                  // Always use semicircle for flow bars
                  const radius = COLUMN_WIDTH / 2;
                  // createRoundedTopBarPath draws from (y + radius) to (y + height)
                  // We want the bottom at barBottom, so: barBottom = barTop + pathHeight
                  // Therefore: pathHeight = barBottom - barTop = barHeight
                  const pathHeight = barHeight;
                  return (
                    <Path
                      key={`flow-${d.cycleDay}`}
                      d={createRoundedTopBarPath(x, barTop, COLUMN_WIDTH, pathHeight)}
                      fill={flowColor}
                    />
                  );
                })}

                {/* Activity row 1: Fysicals - match icons from data tab */}
                {cycleData.map((d) => {
                  if (!d.sex) return null;
                  const x = LEFT_LABEL_WIDTH + (d.cycleDay - 1) * COLUMN_WIDTH + COLUMN_WIDTH / 2;
                  const activityY = fluxYStart + fluidRowsHeight + flowRowHeight + ACTIVITY_ROW_HEIGHT / 2;
                  const filledColor = FreshFeminine.sageMuted;
                  const outlineColor = FreshFeminine.aqua;
                  
                  // Match the icons from SexRow.tsx
                  if (d.sex === 'Protected') {
                    // Filled circles
                    return (
                      <React.Fragment key={`fysical-${d.cycleDay}`}>
                        <Circle cx={x - 3} cy={activityY} r="6" fill={filledColor} stroke={outlineColor} strokeWidth="1.5" />
                        <Circle cx={x + 3} cy={activityY} r="6" fill={filledColor} stroke={outlineColor} strokeWidth="1.5" />
                      </React.Fragment>
                    );
                  } else if (d.sex === 'Unprotected') {
                    // Outline circles
                    return (
                      <React.Fragment key={`fysical-${d.cycleDay}`}>
                        <Circle cx={x - 3} cy={activityY} r="6" fill="none" stroke={outlineColor} strokeWidth="1.5" />
                        <Circle cx={x + 3} cy={activityY} r="6" fill="none" stroke={outlineColor} strokeWidth="1.5" />
                      </React.Fragment>
                    );
                  } else {
                    // Withdrawal - half-filled (left half of each circle)
                    // Match the path from SexRow.tsx but scaled for radius 6
                    // Left circle: center (x-3, activityY), radius 6
                    // Path: arc from top to left point, then arc to bottom
                    const leftHalfPath1 = `M ${x - 3} ${activityY - 6} A 6 6 0 0 0 ${x - 9} ${activityY} A 6 6 0 0 0 ${x - 3} ${activityY + 6} Z`;
                    // Right circle: center (x+3, activityY), radius 6
                    const leftHalfPath2 = `M ${x + 3} ${activityY - 6} A 6 6 0 0 0 ${x - 3} ${activityY} A 6 6 0 0 0 ${x + 3} ${activityY + 6} Z`;
                    return (
                      <React.Fragment key={`fysical-${d.cycleDay}`}>
                        <Path d={leftHalfPath1} fill={filledColor} />
                        <Circle cx={x - 3} cy={activityY} r="6" fill="none" stroke={outlineColor} strokeWidth="1.5" />
                        <Path d={leftHalfPath2} fill={filledColor} />
                        <Circle cx={x + 3} cy={activityY} r="6" fill="none" stroke={outlineColor} strokeWidth="1.5" />
                      </React.Fragment>
                    );
                  }
                })}

                {/* Activity row 2: Free-form - ensure circle is fully visible */}
                {cycleData.map((d) => {
                  if (!d.notes || !d.notes.trim()) return null;
                  const x = LEFT_LABEL_WIDTH + (d.cycleDay - 1) * COLUMN_WIDTH + COLUMN_WIDTH / 2;
                  const freeFormRowY = fluxYStart + fluidRowsHeight + flowRowHeight + ACTIVITY_ROW_HEIGHT;
                  const activityY = freeFormRowY + ACTIVITY_ROW_HEIGHT / 2;
                  // Use same size as symptom circles (medium size: radius 5)
                  return (
                    <Circle
                      key={`freeform-${d.cycleDay}`}
                      cx={x}
                      cy={activityY}
                      r={5}
                      fill={FreshFeminine.aqua}
                      opacity={0.7}
                      stroke={FreshFeminine.aqua}
                      strokeWidth={1}
                    />
                  );
                })}

                {/* Symptom rows - stacked strips showing intensity (1-3 strips), aligned to bottom */}
                {allSymptoms.map((symptom, symptomIdx) => {
                  const symptomRowY = fluxYStart + fluidRowsHeight + flowRowHeight + (ACTIVITY_ROW_HEIGHT * 2) + (symptomIdx * ACTIVITY_ROW_HEIGHT);
                  return cycleData.map((d) => {
                    const intensity = d.symptoms?.[symptom] || 0;
                    if (intensity === 0) return null;
                    const x = LEFT_LABEL_WIDTH + (d.cycleDay - 1) * COLUMN_WIDTH + COLUMN_WIDTH / 2;
                    const stripWidth = 8 * 1.4 * 1.3; // 40% longer, then 30% wider = 14.56px
                    const stripHeight = 3;
                    const stripGap = 2;
                    const totalHeight = (intensity * stripHeight) + ((intensity - 1) * stripGap);
                    // Align strips to bottom of row
                    const rowBottom = symptomRowY + ACTIVITY_ROW_HEIGHT;
                    const startY = rowBottom - totalHeight;
                    
                    // Render 1-3 stacked strips vertically based on intensity, aligned to bottom
                    return (
                      <React.Fragment key={`symptom-${symptom}-${d.cycleDay}`}>
                        {Array.from({ length: intensity }).map((_, stripIdx) => (
                          <Rect
                            key={`strip-${stripIdx}`}
                            x={x - stripWidth / 2}
                            y={startY + (stripIdx * (stripHeight + stripGap))}
                            width={stripWidth}
                            height={stripHeight}
                            fill={FreshFeminine.aqua}
                            opacity={0.8}
                          />
                        ))}
                      </React.Fragment>
                    );
                  });
                })}

                {/* Scrubber highlight - tint column only, no vertical line */}
                {scrubberX != null && (
                  <Rect
                    x={LEFT_LABEL_WIDTH + (scrubberDay! - 1) * COLUMN_WIDTH}
                    y={0}
                    width={COLUMN_WIDTH}
                    height={dateRowsHeight + dataRowsHeight}
                    fill={FreshFeminine.aqua}
                    opacity={selectedDayForEdit ? 0.15 : 0.1}
                  />
                )}
              </Svg>
            </Pressable>

            {/* Scrubber tooltip - show on light tap, positioned above finger; long-press tooltip or column to edit */}
            {selectedData && scrubberX != null && tapPosition && !isFutureDate(selectedData.date) && (
              <Pressable
                onLongPress={handleTooltipLongPress}
                delayLongPress={300}
                style={[
                  styles.tooltip,
                  (() => {
                    const tooltipWidth = 100;
                    const tooltipHeight = 52;
                    const gapAboveFinger = 28;
                    let left = tapPosition.x - tooltipWidth / 2;
                    let top = tapPosition.y - tooltipHeight - gapAboveFinger;
                    const minLeft = LEFT_LABEL_WIDTH + 8;
                    const maxLeft = totalWidth - RIGHT_AXIS_WIDTH - tooltipWidth - 8;
                    left = Math.min(Math.max(left, minLeft), maxLeft);
                    top = Math.max(8, top);
                    return { left, top };
                  })(),
                ]}
              >
                <Text style={styles.tooltipTitle}>
                  {formatDate(selectedData.date).month} {formatDate(selectedData.date).day}
                </Text>
                <Text style={styles.tooltipText}>Long tap to edit</Text>
              </Pressable>
            )}
              </View>
              </View>
            </GHScrollView>
            {cycleStartDates.length > 1 && !gridCanScroll && (
              <View
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 120 }}
                {...gridForwardPanResponder.panHandlers}
              />
            )}
            </View>
          </View>
        </RNScrollView>
      </View>
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  waterBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  chartTopBar: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTopBarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: FreshFeminine.charcoal,
    ...(Platform.OS === 'web' && { fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' } as any),
  },
  chartTopBarSubTitle: {
    fontSize: 11,
    color: FreshFeminine.charcoalLight,
    marginTop: 2,
    ...(Platform.OS === 'web' && { fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' } as any),
  },
  chartWrapper: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden', // Prevent content from extending beyond
  },
  chartRow: {
    flexDirection: 'row',
  },
  verticalScroll: {
    flex: 1,
    backgroundColor: 'transparent',
    height: '100%',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingVertical: 0,
    paddingBottom: 0,
  },
  chartContainer: {
    position: 'relative',
    minWidth: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
    marginBottom: 0,
    paddingBottom: 0,
  },
  leftLabels: {
    width: LEFT_LABEL_WIDTH,
    height: '100%',
    backgroundColor: 'transparent', // Transparent since parent has white background
  },
  labelRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingRight: 8,
    paddingLeft: 4,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  leftLabelText: {
    fontSize: 10,
    color: FreshFeminine.charcoal,
    fontWeight: '500',
    textAlign: 'right',
  },
  tmSuperscript: {
    fontSize: 9,
    marginTop: -2,
    fontWeight: '500',
    color: FreshFeminine.aqua,
  },
  stickyRightAxis: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: RIGHT_AXIS_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: FreshFeminine.charcoal,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: FreshFeminine.charcoal,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorBody: {
    fontSize: 14,
    color: FreshFeminine.charcoalLight,
    textAlign: 'center',
    paddingHorizontal: SPACING * 2,
  },
  axisLabel: {
    position: 'absolute',
    right: 4,
    fontSize: 11,
    color: FreshFeminine.charcoal,
    fontWeight: '500',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: FreshFeminine.cardGlassBorder,
    shadowColor: FreshFeminine.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: FreshFeminine.charcoal,
    marginBottom: 4,
    textAlign: 'center',
  },
  tooltipText: {
    fontSize: 10,
    color: FreshFeminine.charcoalLight,
    marginTop: 2,
    textAlign: 'center',
  },
});
