import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useAppDimensions } from '@/src/hooks/useAppDimensions';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Filter, FeGaussianBlur, Path, ClipPath, Ellipse } from 'react-native-svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Card } from '@/src/components/Card';
import { ToggleRow } from '@/src/components/ToggleRow';
import { CheckboxRow } from '@/src/components/CheckboxRow';
import { SegmentedRow } from '@/src/components/SegmentedRow';
import { FluidRow } from '@/src/components/FluidRow';
import { FlowRow } from '@/src/components/FlowRow';
import { SexRow } from '@/src/components/SexRow';
import { SymptomIntensityRow, type Intensity } from '@/src/components/SymptomIntensityRow';
import { FeelingModal } from '@/src/components/FeelingModal';
import { FreshFeminine, SPACING } from '@/src/constants/theme';
import { useSavedIndicator } from '@/src/contexts/SavedIndicatorContext';
import { getLogByDate, getAllLogs, saveDailyLog, type DailyLog } from '@/src/storage/db';
import { AsyncStorage } from 'expo-sqlite/kv-store';

const FLUID_OPTIONS = ['None', 'Sticky', 'Creamy', 'Egg white', 'Watery'] as const;
const FLOW_OPTIONS = ['Spotting', 'Light', 'Medium', 'Heavy'] as const;
const SEX_OPTIONS = ['Protected', 'Unprotected', 'Withdrawal'] as const;

type FluidType = (typeof FLUID_OPTIONS)[number];
type FlowType = (typeof FLOW_OPTIONS)[number];
type SexType = (typeof SEX_OPTIONS)[number];

type SymptomLevels = Record<string, Intensity>;

const SECTION_EXPLANATIONS: Record<string, { title: string; message: string }> = {
  flux: {
    title: 'Flux',
    message:
      'Log your temperature here. Take your temp at the same time every morning, before getting up. Mark Temp shift when you notice a sustained rise – this signals that ovulation has passed.',
  },
  fluids: {
    title: 'Fluids',
    message:
      'Choose the option that best matches your cervical fluid today – from sticky or creamy to egg-white or watery.',
  },
  flow: {
    title: 'Flow',
    message:
      'Track your menstrual bleeding: spotting, light, medium, or heavy. Mark Day 1 when your full flow starts.',
  },
  fysical: {
    title: 'Fysical™',
    message:
      'Optional note on sex: protected, unprotected, or withdrawal – for your own reference.',
  },
  feeling: {
    title: 'Feeling',
    message:
      'Track how you feel today – cramps, mood, fatigue, or add your own symptoms.',
  },
  freeform: {
    title: 'Free-form',
    message:
      'Notes for the day – anything you want to remember.',
  },
};

/** Set to true to show icons next to section titles (Flux, Fluids, Flow, Fysical™, Feeling, Free-form). */
const SHOW_SECTION_ICONS = false;

const SECTION_ICON: Record<keyof typeof SECTION_EXPLANATIONS, { mci?: keyof typeof MaterialCommunityIcons.glyphMap; color: string; custom?: 'interlocking-circles' }> = {
  flux: { mci: 'thermometer', color: FreshFeminine.aqua },
  fluids: { mci: 'water', color: FreshFeminine.aqua },
  flow: { mci: 'chart-bar', color: FreshFeminine.darkMagenta },
  fysical: { custom: 'interlocking-circles', color: FreshFeminine.aqua },
  feeling: { mci: 'stethoscope', color: FreshFeminine.aqua },
  freeform: { mci: 'lightbulb', color: FreshFeminine.aqua },
};

function InterlockingCirclesIcon({ size = 22, color }: { size?: number; color: string }) {
  const outlineColor = FreshFeminine.fluid6; // Darker aqua for outline
  const overlapColor = FreshFeminine.aqua; // Aqua color for overlap
  
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Left circle - white fill with outline (drawn first so right circle doesn't cover its outline) */}
      <Circle cx="9" cy="12" r="7" fill="#FFFFFF" stroke={outlineColor} strokeWidth="1.5" />
      {/* Right circle - white fill with outline */}
      <Circle cx="15" cy="12" r="7" fill="#FFFFFF" stroke={outlineColor} strokeWidth="1.5" />
      {/* Overlap area - aqua ellipse to show intersection */}
      <Ellipse cx="12" cy="12" rx="3" ry="5" fill={overlapColor} opacity={0.8} />
      {/* Redraw left circle outline on top to ensure it's fully visible */}
      <Circle cx="9" cy="12" r="7" fill="none" stroke={outlineColor} strokeWidth="1.5" />
    </Svg>
  );
}

function SectionHeader({
  label,
  sectionKey,
}: {
  label: React.ReactNode;
  sectionKey: keyof typeof SECTION_EXPLANATIONS;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const { title, message } = SECTION_EXPLANATIONS[sectionKey];
  const iconConfig = SECTION_ICON[sectionKey];
  return (
    <>
      <View style={[styles.sectionLabelRow, sectionKey === 'flux' && styles.sectionLabelRowFlux]}>
        <View style={styles.sectionTitleWrap}>
          {SHOW_SECTION_ICONS && (iconConfig.custom === 'interlocking-circles' ? (
            <View style={styles.sectionIcon}>
              <InterlockingCirclesIcon size={22} color={iconConfig.color} />
            </View>
          ) : iconConfig.mci ? (
            <MaterialCommunityIcons name={iconConfig.mci} size={20} color={iconConfig.color} style={styles.sectionIcon} />
          ) : null)}
          <Text style={styles.sectionLabel}>{label}</Text>
        </View>
        <Pressable
          onPress={() => setShowInfo(true)}
          hitSlop={16}
          style={styles.sectionInfoBtn}
        >
          <MaterialCommunityIcons
            name="information-outline"
            size={16}
            color={FreshFeminine.iconMuted}
          />
        </Pressable>
      </View>
      <Modal
        visible={showInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfo(false)}
      >
        <Pressable style={styles.infoBackdrop} onPress={() => setShowInfo(false)}>
          <Pressable style={styles.infoCard} onPress={() => {}}>
            <Text style={styles.infoTitle}>{title}</Text>
            <Text style={styles.infoMessage}>{message}</Text>
            <Pressable style={styles.infoCloseBtn} onPress={() => setShowInfo(false)}>
              <Text style={styles.infoCloseBtnText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function WatercolorStains() {
  const { width, height } = useAppDimensions();
  if (width === 0 || height === 0) return null;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
      <Defs>
        <Filter id="watercolorBlur">
          <FeGaussianBlur in="SourceGraphic" stdDeviation="28" />
        </Filter>
      </Defs>
      {/* Large stain: top-right, soft aqua */}
      <Circle
        cx={width * 0.88}
        cy={height * 0.08}
        r={width * 0.5}
        fill={FreshFeminine.stainAqua}
        filter="url(#watercolorBlur)"
      />
      {/* Stain: mid-left, organic aqua */}
      <Circle
        cx={width * 0.12}
        cy={height * 0.42}
        r={width * 0.45}
        fill={FreshFeminine.stainAqua}
        filter="url(#watercolorBlur)"
      />
      {/* Magenta accent: mid-right */}
      <Circle
        cx={width * 0.78}
        cy={height * 0.55}
        r={width * 0.22}
        fill={FreshFeminine.stainMagenta}
        filter="url(#watercolorBlur)"
      />
    </Svg>
  );
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isToday(iso: string): boolean {
  return iso === todayISO();
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateToCheck = new Date(d);
  dateToCheck.setHours(12, 0, 0, 0);
  
  let prefix = '';
  if (dateToCheck.getTime() === today.getTime()) {
    prefix = 'Today, ';
  } else if (dateToCheck.getTime() === yesterday.getTime()) {
    prefix = 'Yesterday, ';
  }
  
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  const day = d.getDate();
  const month = d.toLocaleDateString(undefined, { month: 'short' });
  return `${prefix}${weekday}, ${day} ${month}`;
}

function cycleDayForDate(logs: DailyLog[], date: string): number | null {
  const dayOneDates = logs
    .filter((l) => l.isCycleDayOne && l.date <= date)
    .map((l) => l.date)
    .sort()
    .reverse();
  const latest = dayOneDates[0];
  if (!latest) return null;
  const a = new Date(latest + 'T12:00:00').getTime();
  const b = new Date(date + 'T12:00:00').getTime();
  const days = Math.round((b - a) / (24 * 60 * 60 * 1000));
  return days + 1;
}

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

/** Finds which cycle number contains the given date. Returns null if not found. */
function cycleNumberForDate(logs: DailyLog[], date: string): number | null {
  const cycleStartDates = getCycleStartDates(logs);
  if (cycleStartDates.length === 0) return null;
  
  // Find the cycle that contains this date (date >= cycleStart and date < nextCycleStart)
  for (let i = 0; i < cycleStartDates.length; i++) {
    const cycleStart = cycleStartDates[i];
    const nextCycleStart = i > 0 ? cycleStartDates[i - 1] : null;
    
    if (date >= cycleStart && (nextCycleStart === null || date < nextCycleStart)) {
      // Cycle number: 1 = earliest, N = latest
      return cycleStartDates.length - i;
    }
  }
  
  // If date is before all cycles, return cycle 1 (oldest)
  if (date < cycleStartDates[cycleStartDates.length - 1]) {
    return 1;
  }
  
  return null;
}

export default function LogScreen() {
  const { width: screenWidth } = useAppDimensions();
  const params = useLocalSearchParams<{ date?: string }>();
  const [selectedDate, setSelectedDate] = useState(() => {
    // Use date from URL params if provided, otherwise default to today
    return params.date || todayISO();
  });
  const [isSwiping, setIsSwiping] = useState(false);
  const translateX = useSharedValue(0);
  const [isCycleDayOne, setIsCycleDayOne] = useState(false);
  const [isPeak, setIsPeak] = useState(false);
  const [temp, setTemp] = useState('');
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [tempQuestionable, setTempQuestionable] = useState(false);
  const [tempShift, setTempShift] = useState(false);
  
  // Temperature validation: 35–46°C (95–115°F)
  const MIN_TEMP_C = 35.0;
  const MAX_TEMP_C = 46.0;
  const MIN_TEMP_F = 95.0;
  const MAX_TEMP_F = 115.0;
  
  const handleTempChange = (text: string) => {
    // Allow empty string, decimal point, and numbers
    if (text === '' || text === '.') {
      setTemp(text);
      return;
    }
    
    const numValue = parseFloat(text);
    if (isNaN(numValue)) {
      return; // Don't update if not a valid number
    }
    
    // Validate based on current unit
    const minTemp = tempUnit === 'C' ? MIN_TEMP_C : MIN_TEMP_F;
    const maxTemp = tempUnit === 'C' ? MAX_TEMP_C : MAX_TEMP_F;
    
    if (numValue >= minTemp && numValue <= maxTemp) {
      setTemp(text);
    } else if (numValue < minTemp) {
      // Allow typing if user is still entering (e.g., typing "3" when min is 35)
      // But prevent if clearly below range
      if (text.length <= String(minTemp).length) {
        setTemp(text);
      }
    }
    // If above max, don't allow
  };
  const [cycleDay, setCycleDay] = useState<number | null>(null);
  const [cycleNumber, setCycleNumber] = useState<number | null>(null);
  const [fluid, setFluid] = useState<FluidType | null>(null);
  const [flow, setFlow] = useState<FlowType | null>(null);
  const [sex, setSex] = useState<SexType | null>(null);
  const [notes, setNotes] = useState('');
  const [symptoms, setSymptoms] = useState<SymptomLevels>({});
  const [customSymptom, setCustomSymptom] = useState('');
  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const { triggerSaved } = useSavedIndicator() ?? { triggerSaved: () => {} };

  const saveEnabledRef = useRef(false);
  const skipNextSavesRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDateDataRef = useRef<{ date: string; log: DailyLog | null } | null>(null);
  const formStateRef = useRef({
    temp: '',
    notes: '',
    tempUnit: 'C' as const,
    tempQuestionable: false,
    tempShift: false,
    fluid: null as FluidType | null,
    flow: null as FlowType | null,
    sex: null as SexType | null,
    isCycleDayOne: false,
    isPeak: false,
    symptoms: {} as SymptomLevels,
    customSymptom: '',
  });

  const setSymptom = (name: string, value: Intensity) => {
    setSymptoms((prev) => ({ ...prev, [name]: value }));
  };
  const getSymptom = (name: string): Intensity => (symptoms[name] ?? 0) as Intensity;

  const applyLogData = useCallback((log: DailyLog | null) => {
    if (log) {
      setIsCycleDayOne(log.isCycleDayOne);
      setIsPeak(log.isPeak);
      setTemp(log.temp != null ? String(log.temp) : '');
      setTempUnit(log.tempUnit);
      setTempQuestionable(log.tempQuestionable);
      setTempShift(log.tempShift);
      setFluid(
        (log.fluid == null || log.fluid === 'None'
          ? null
          : log.fluid === 'Egg White'
            ? 'Egg white'
            : log.fluid) as FluidType | null
      );
      setFlow(
        (log.fluid === 'Spotting' ? 'Spotting' : log.flow) as FlowType | null
      );
      setSex(log.sex as SexType | null);
      setNotes(log.notes ?? '');
      setSymptoms(log.symptoms ?? {});
      setCustomSymptom('');
    } else {
      setIsCycleDayOne(false);
      setIsPeak(false);
      setTemp('');
      setTempUnit('C');
      setTempQuestionable(false);
      setTempShift(false);
      setFluid(null);
      setFlow(null);
      setSex(null);
      setNotes('');
      setSymptoms({});
      setCustomSymptom('');
    }
  }, []);

  const loadLogForDate = useCallback(async (date: string, skipLoadingState = false) => {
    saveEnabledRef.current = false;
    if (!skipLoadingState) {
      setLoading(true);
    }
    const log = await getLogByDate(date);
    
    // If we have pending data for this date, apply it immediately (for smooth transitions)
    if (pendingDateDataRef.current && pendingDateDataRef.current.date === date) {
      applyLogData(pendingDateDataRef.current.log);
      pendingDateDataRef.current = null;
    } else {
      applyLogData(log);
    }
    
    if (!skipLoadingState) {
      setLoading(false);
    }
    saveEnabledRef.current = true;
    skipNextSavesRef.current = 2;
    const allLogs = await getAllLogs();
    setCycleDay(cycleDayForDate(allLogs, date));
    setCycleNumber(cycleNumberForDate(allLogs, date));
  }, [applyLogData]);

  // Update selectedDate when URL params change
  useEffect(() => {
    if (params.date && params.date !== selectedDate) {
      setSelectedDate(params.date);
    }
  }, [params.date]);

  // Save selectedDate to AsyncStorage whenever it changes (for syncing with chart tab)
  useEffect(() => {
    AsyncStorage.setItem('lastViewedDate', selectedDate).catch(() => {
      // Ignore errors
    });
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      // Skip loading state if we're currently swiping to prevent white flash
      loadLogForDate(selectedDate, isSwiping);
    }, [selectedDate, loadLogForDate, isSwiping])
  );

  formStateRef.current = {
    temp,
    notes,
    tempUnit,
    tempQuestionable,
    tempShift,
    fluid,
    flow,
    sex,
    isCycleDayOne,
    isPeak,
    symptoms,
    customSymptom,
  };

  const buildLog = useCallback(
    (state: typeof formStateRef.current): DailyLog => {
      const raw = state.temp.trim();
      const parsed = raw === '' ? NaN : parseFloat(raw);
      let tempNum: number | null = null;
      
      if (raw !== '' && Number.isFinite(parsed)) {
        const rounded = Math.round(parsed * 100) / 100;
        // Validate temperature is within normal human range
        const minTemp = state.tempUnit === 'C' ? MIN_TEMP_C : MIN_TEMP_F;
        const maxTemp = state.tempUnit === 'C' ? MAX_TEMP_C : MAX_TEMP_F;
        
        if (rounded >= minTemp && rounded <= maxTemp) {
          tempNum = rounded;
        } else {
          // Temperature out of range - set to null and show warning
          Alert.alert(
            "This temp isn't in range",
            state.tempUnit === 'C'
              ? 'Enter a temperature between 35–46°C'
              : 'Enter a temperature between 95–115°F'
          );
        }
      }
      
      const symptomsToSave = { ...state.symptoms };
      if (state.customSymptom.trim()) {
        symptomsToSave[state.customSymptom.trim()] = 1;
      }
      return {
        date: selectedDate,
        temp: tempNum,
        tempUnit: state.tempUnit,
        tempQuestionable: state.tempQuestionable,
        tempShift: state.tempShift,
        fluid: state.fluid,
        flow: state.flow,
        sex: state.sex,
        isCycleDayOne: state.isCycleDayOne,
        isPeak: state.isPeak,
        notes: state.notes,
        symptoms: symptomsToSave,
      };
    },
    [selectedDate]
  );

  const onSaved = useCallback(() => {
    triggerSaved();
    getAllLogs().then((logs) => {
      setCycleDay(cycleDayForDate(logs, selectedDate));
      setCycleNumber(cycleNumberForDate(logs, selectedDate));
    });
  }, [selectedDate, triggerSaved]);

  useEffect(() => {
    if (!saveEnabledRef.current || loading) return;
    if (skipNextSavesRef.current > 0) {
      skipNextSavesRef.current--;
      return;
    }
    const log = buildLog(formStateRef.current);
    saveDailyLog(log).then(() => onSaved());
  }, [
    selectedDate,
    tempUnit,
    tempQuestionable,
    tempShift,
    fluid,
    flow,
    sex,
    isCycleDayOne,
    isPeak,
    symptoms,
    customSymptom,
    loading,
    buildLog,
    onSaved,
  ]);

  useEffect(() => {
    if (!saveEnabledRef.current || loading) return;
    if (skipNextSavesRef.current > 0) {
      skipNextSavesRef.current--;
      return;
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      const log = buildLog(formStateRef.current);
      saveDailyLog(log).then(() => onSaved());
    }, 300);
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [selectedDate, temp, notes, loading, buildLog, onSaved]);

  const changeDatePrev = useCallback(async () => {
    const prevDate = addDays(selectedDate, -1);
    // Preload data for the new date
    const log = await getLogByDate(prevDate);
    pendingDateDataRef.current = { date: prevDate, log };
    
    // Continue sliding current content out, then change date and slide new content in seamlessly
    translateX.value = withTiming(screenWidth, { duration: 250 }, (finished) => {
      if (finished) {
        'worklet';
        // Apply preloaded data immediately
        if (pendingDateDataRef.current && pendingDateDataRef.current.date === prevDate) {
          runOnJS(applyLogData)(pendingDateDataRef.current.log);
        }
        // Set new content position immediately on UI thread BEFORE changing date
        translateX.value = -screenWidth;
        // Update date - this will trigger useFocusEffect but data is already applied
        runOnJS(setSelectedDate)(prevDate);
        // Animate new content in
        translateX.value = withTiming(0, { duration: 250 }, () => {
          runOnJS(setIsSwiping)(false);
        });
      }
    });
  }, [selectedDate, screenWidth, translateX, applyLogData]);

  const changeDateNext = useCallback(async () => {
    if (!isToday(selectedDate)) {
      const nextDate = addDays(selectedDate, 1);
      if (nextDate <= todayISO()) {
        // Preload data for the new date
        const log = await getLogByDate(nextDate);
        pendingDateDataRef.current = { date: nextDate, log };
        
        // Continue sliding current content out, then change date and slide new content in seamlessly
        translateX.value = withTiming(-screenWidth, { duration: 250 }, (finished) => {
          if (finished) {
            'worklet';
            // Apply preloaded data immediately
            if (pendingDateDataRef.current && pendingDateDataRef.current.date === nextDate) {
              runOnJS(applyLogData)(pendingDateDataRef.current.log);
            }
            // Set new content position immediately on UI thread BEFORE changing date
            translateX.value = screenWidth;
            // Update date - this will trigger useFocusEffect but data is already applied
            runOnJS(setSelectedDate)(nextDate);
            // Animate new content in
            translateX.value = withTiming(0, { duration: 250 }, () => {
              runOnJS(setIsSwiping)(false);
            });
          }
        });
      } else {
        translateX.value = withTiming(0, { duration: 200 });
        setIsSwiping(false);
      }
    } else {
      translateX.value = withTiming(0, { duration: 200 });
      setIsSwiping(false);
    }
  }, [selectedDate, screenWidth, translateX, applyLogData]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onStart(() => {
      runOnJS(setIsSwiping)(true);
    })
    .onUpdate((event) => {
      // Clamp translation to prevent over-swiping, but allow full screen width when threshold is met
      const swipeThreshold = 60;
      if (Math.abs(event.translationX) > swipeThreshold) {
        // Allow full movement once threshold is met
        translateX.value = event.translationX;
      } else {
        // Clamp during initial swipe
        const maxTranslation = screenWidth * 0.3;
        translateX.value = Math.max(-maxTranslation, Math.min(maxTranslation, event.translationX));
      }
    })
    .onEnd((event) => {
      const swipeThreshold = 60;
      if (Math.abs(event.translationX) > swipeThreshold) {
        // Don't reset translateX here - let the changeDate function handle animation
        if (event.translationX > 0) {
          runOnJS(changeDatePrev)();
        } else {
          runOnJS(changeDateNext)();
        }
      } else {
        translateX.value = withTiming(0, { duration: 200 });
        runOnJS(setIsSwiping)(false);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.waterBackground} pointerEvents="none">
        <LinearGradient
          colors={[FreshFeminine.warmWhite, FreshFeminine.warmWhite]}
          style={StyleSheet.absoluteFillObject}
        />
        <WatercolorStains />
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, animatedStyle]} pointerEvents={isSwiping ? 'box-none' : 'auto'}>
          <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              scrollEnabled={!isSwiping}
              pointerEvents={isSwiping ? 'none' : 'auto'}
            >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              const prevDate = addDays(selectedDate, -1);
              setSelectedDate(prevDate);
            }}
            style={styles.dateNavButton}
            hitSlop={8}
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={FreshFeminine.charcoal} />
          </Pressable>
          <View style={styles.headerLeft}>
            <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
            <Text style={styles.cycleDayText}>
              {cycleNumber != null && cycleDay != null 
                ? `Cycle ${cycleNumber}, day ${cycleDay}` 
                : 'Cycle —, day —'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (!isToday(selectedDate)) {
                const nextDate = addDays(selectedDate, 1);
                if (nextDate <= todayISO()) {
                  setSelectedDate(nextDate);
                }
              }
            }}
            style={[styles.dateNavButton, isToday(selectedDate) && styles.dateNavButtonDisabled]}
            hitSlop={8}
            disabled={isToday(selectedDate)}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={isToday(selectedDate) ? FreshFeminine.iconMuted : FreshFeminine.charcoal}
            />
          </Pressable>
        </View>

        <Card style={styles.card}>
          <SectionHeader label="Flux" sectionKey="flux" />
          <View style={styles.tempRow}>
            <TextInput
              style={styles.tempInput}
              value={temp}
              onChangeText={handleTempChange}
              placeholder="0.00"
              placeholderTextColor={FreshFeminine.sage}
              keyboardType="decimal-pad"
            />
            <View style={styles.unitRow}>
              <Pressable
                onPress={() => {
                  setTempUnit('C');
                  // Validate temp when switching units
                  if (temp) {
                    const numValue = parseFloat(temp);
                    if (!isNaN(numValue)) {
                      // Convert F to C for validation
                      const tempC = tempUnit === 'F' ? (numValue - 32) * (5 / 9) : numValue;
                      if (tempC < MIN_TEMP_C || tempC > MAX_TEMP_C) {
                        setTemp(''); // Clear if out of range
                      }
                    }
                  }
                }}
                style={[styles.unitBtn, tempUnit === 'C' && styles.unitBtnSelected]}
              >
                <Text style={[styles.unitText, tempUnit === 'C' && styles.unitTextSelected]}>
                  °C
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setTempUnit('F');
                  // Validate temp when switching units
                  if (temp) {
                    const numValue = parseFloat(temp);
                    if (!isNaN(numValue)) {
                      // Convert C to F for validation
                      const tempF = tempUnit === 'C' ? (numValue * 9 / 5) + 32 : numValue;
                      if (tempF < MIN_TEMP_F || tempF > MAX_TEMP_F) {
                        setTemp(''); // Clear if out of range
                      }
                    }
                  }
                }}
                style={[styles.unitBtn, tempUnit === 'F' && styles.unitBtnSelected]}
              >
                <Text style={[styles.unitText, tempUnit === 'F' && styles.unitTextSelected]}>
                  °F
                </Text>
              </Pressable>
            </View>
          </View>
          <View style={[styles.toggleBlock, styles.toggleBlockFlux, { backgroundColor: 'rgba(114, 210, 209, 0.07)' }]}>
            <View style={styles.toggleRowPair}>
              <View style={styles.toggleHalf}>
                <CheckboxRow
                  label="Questionable"
                  labelLight
                  value={tempQuestionable}
                  onValueChange={setTempQuestionable}
                  noMarginBottom
                />
              </View>
              <View style={styles.toggleHalfSecond}>
                <CheckboxRow
                  label="Temp shift"
                  labelLight
                  value={tempShift}
                  onValueChange={setTempShift}
                  noMarginBottom
                />
              </View>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <SectionHeader label="Fluids" sectionKey="fluids" />
          <FluidRow value={fluid} onSelect={setFluid} />
          <View style={[styles.toggleBlock, { backgroundColor: 'rgba(114, 210, 209, 0.07)' }]}>
            <CheckboxRow
              label="Peak day"
              labelLight
              value={isPeak}
              onValueChange={setIsPeak}
              noMarginBottom
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <SectionHeader label="Flow" sectionKey="flow" />
          <FlowRow value={flow} onSelect={setFlow} />
          <View style={[styles.toggleBlock, { backgroundColor: 'rgba(139, 0, 139, 0.07)' }]}>
            <CheckboxRow
              label="Day 1"
              labelLight
              value={isCycleDayOne}
              onValueChange={setIsCycleDayOne}
              noMarginBottom
              accentMagenta
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <SectionHeader
            label={
              <Text style={styles.sectionLabel}>Fysical<Text style={styles.tmSuperscript}>™</Text></Text>
            }
            sectionKey="fysical"
          />
          <SexRow value={sex} onSelect={setSex} />
        </Card>

        <Card style={styles.card}>
          <SectionHeader label="Feeling" sectionKey="feeling" />
          {(() => {
            const selected: { name: string; value: Intensity }[] = [];
            Object.entries(symptoms).forEach(([name, value]) => {
              if (value > 0) selected.push({ name, value: value as Intensity });
            });
            const customName = customSymptom.trim();
            if (customName && !selected.some((s) => s.name === customName))
              selected.push({ name: customName, value: 1 });
            return (
              <>
                {selected.map(({ name, value }, index) => (
                  <SymptomIntensityRow
                    key={`${name}-${index}`}
                    label={name}
                    value={value}
                    onValueChange={(v) => setSymptom(name, v)}
                    showNoneOption={true}
                  />
                ))}
                <Pressable
                  style={styles.addFeelingBtn}
                  onPress={() => setShowFeelingModal(true)}
                >
                  <MaterialCommunityIcons name="plus" size={20} color={FreshFeminine.sage} />
                  <Text style={styles.addFeelingLabel}>Add a feeling...</Text>
                </Pressable>
              </>
            );
          })()}
        </Card>

        <FeelingModal
          visible={showFeelingModal}
          onClose={() => setShowFeelingModal(false)}
          symptoms={symptoms}
          setSymptom={setSymptom}
          getSymptom={getSymptom}
          customSymptom={customSymptom}
          setCustomSymptom={setCustomSymptom}
        />

        <Card style={[styles.card, styles.cardLast]}>
          <SectionHeader label="Free-form" sectionKey="freeform" />
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note..."
            placeholderTextColor={FreshFeminine.sage}
            multiline
            numberOfLines={3}
          />
        </Card>

            </ScrollView>
            {isSwiping && (
              <View style={styles.swipeOverlay} pointerEvents="none" />
            )}
          </KeyboardAvoidingView>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', overflow: 'hidden' },
  waterBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: {
    padding: SPACING,
    paddingTop: SPACING + 8,
    paddingHorizontal: SPACING,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  dateNavButton: {
    padding: 4,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNavButtonDisabled: {
    opacity: 0.3,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: FreshFeminine.charcoal,
  },
  cycleDayText: {
    fontSize: 11,
    color: FreshFeminine.charcoalLight,
    marginTop: 2,
  },
  card: { marginBottom: SPACING + 10 },
  cardLast: { marginBottom: 6 },
  toggleBlock: {
    marginTop: 14,
    marginBottom: -SPACING,
    marginLeft: -SPACING,
    marginRight: -SPACING,
    paddingVertical: SPACING / 2,
    paddingHorizontal: SPACING,
    alignItems: 'center', // Center checkboxes
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  toggleBlockFlux: {
    marginTop: 14 + 8, // Extra spacing to match visual spacing between icons and stripe in other boxes
  },
  toggleRowPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // More space between checkboxes
    alignSelf: 'center', // Center the pair
    paddingLeft: 20, // Equal padding on left
    paddingRight: 20, // Equal padding on right
  },
  toggleHalf: {
    minWidth: 0,
    marginLeft: -8, // Move first checkbox a bit to the left
  },
  toggleHalfSecond: {
    minWidth: 0,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  sectionLabelRowFlux: {
    marginBottom: 14,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {},
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: FreshFeminine.charcoal,
  },
  tmSuperscript: {
    fontSize: 12,
    marginTop: -3,
    fontWeight: '600',
    color: FreshFeminine.aqua,
  },
  sectionInfoBtn: {
    padding: 14,
    margin: -10,
  },
  tempRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tempInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: FreshFeminine.sage,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: FreshFeminine.charcoal,
  },
  unitRow: { flexDirection: 'row', gap: 8 },
  unitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FreshFeminine.sage,
  },
  unitBtnSelected: {
    backgroundColor: FreshFeminine.sage,
    borderColor: FreshFeminine.sage,
  },
  unitText: { fontSize: 12, color: FreshFeminine.charcoal },
  unitTextSelected: { color: FreshFeminine.warmWhite, fontWeight: '600' },
  notesInput: {
    borderWidth: 1,
    borderColor: FreshFeminine.sage,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: FreshFeminine.charcoal,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addFeelingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
    padding: 4,
    gap: 6,
  },
  addFeelingLabel: {
    fontSize: 14,
    color: FreshFeminine.sage,
    fontWeight: '500',
  },
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  infoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  infoCard: {
    backgroundColor: FreshFeminine.warmWhite,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: FreshFeminine.charcoal,
    marginBottom: 10,
  },
  infoMessage: {
    fontSize: 14,
    lineHeight: 21,
    color: FreshFeminine.charcoalLight,
    marginBottom: 20,
  },
  infoCloseBtn: {
    alignSelf: 'flex-end',
    backgroundColor: FreshFeminine.sage,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  infoCloseBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
