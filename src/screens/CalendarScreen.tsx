import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useAppDimensions } from '@/src/hooks/useAppDimensions';
import { useFocusEffect, useRouter } from 'expo-router';
import { FreshFeminine, SPACING } from '@/src/constants/theme';
import { getAllLogs, type DailyLog } from '@/src/storage/db';
import { WatercolorStains } from './LogScreen';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Fluid color mapping
const FLUID_COLORS: Record<string, string> = {
  'Sticky': FreshFeminine.fluid2,
  'Creamy': FreshFeminine.fluid3,
  'Egg white': FreshFeminine.fluid4,
  'Watery': FreshFeminine.fluid5,
};

// Flow color mapping
const FLOW_COLORS: Record<string, string> = {
  'Spotting': FreshFeminine.flowSpotting,
  'Light': FreshFeminine.flowLight,
  'Medium': FreshFeminine.flowMedium,
  'Heavy': FreshFeminine.flowDark,
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isToday(year: number, month: number, day: number): boolean {
  const today = new Date();
  return (
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day
  );
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

type CalendarDay = {
  day: number | null;
  date: string | null;
  log: DailyLog | null;
  isCurrentMonth: boolean;
  isToday: boolean;
};

type MonthData = {
  year: number;
  month: number;
  days: CalendarDay[];
};

export function CalendarScreen() {
  const { width } = useAppDimensions();
  const router = useRouter();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const monthPositions = useRef<Map<string, number>>(new Map());
  const hasScrolledToCurrent = useRef(false);

  useFocusEffect(
    useCallback(() => {
      getAllLogs().then(setLogs);
      hasScrolledToCurrent.current = false;
    }, [])
  );

  const handleMonthLayout = useCallback((year: number, month: number, y: number) => {
    const monthKey = `${year}-${month}`;
    monthPositions.current.set(monthKey, y);
    
    // If this is the current month and we haven't scrolled yet, scroll to it
    if (!hasScrolledToCurrent.current) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      
      if (year === currentYear && month === currentMonth) {
        hasScrolledToCurrent.current = true;
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ 
            y: Math.max(0, y - SPACING - 8), 
            animated: true 
          });
        }, 50);
      }
    }
  }, []);

  const logsMap = useMemo(() => {
    const map = new Map<string, DailyLog>();
    logs.forEach(log => map.set(log.date, log));
    return map;
  }, [logs]);

  const cellSize = useMemo(() => {
    const padding = SPACING * 2;
    const availableWidth = width - padding;
    return Math.floor(availableWidth / 7);
  }, [width]);

  // Generate months to display (12 months: 6 months back, current, 5 months ahead)
  const monthsToDisplay = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const months: MonthData[] = [];

    // Start from 6 months ago
    for (let i = -6; i <= 5; i++) {
      let year = currentYear;
      let month = currentMonth + i;
      
      // Adjust year if month goes out of bounds
      while (month < 0) {
        month += 12;
        year -= 1;
      }
      while (month > 11) {
        month -= 12;
        year += 1;
      }

      const daysInMonth = getDaysInMonth(year, month);
      const firstDay = getFirstDayOfMonth(year, month);
      const days: CalendarDay[] = [];

      // Add empty cells at the start to align with weekday
      for (let i = 0; i < firstDay; i++) {
        days.push({
          day: null,
          date: null,
          log: null,
          isCurrentMonth: false,
          isToday: false,
        });
      }

      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = formatDateKey(year, month, day);
        days.push({
          day,
          date,
          log: logsMap.get(date) || null,
          isCurrentMonth: true,
          isToday: isToday(year, month, day),
        });
      }

      // Fill remaining cells to complete rows
      const remainingCells = 42 - days.length;
      for (let i = 0; i < remainingCells; i++) {
        days.push({
          day: null,
          date: null,
          log: null,
          isCurrentMonth: false,
          isToday: false,
        });
      }

      // Remove empty rows (rows where all cells have day === null)
      const rows: CalendarDay[][] = [];
      for (let i = 0; i < days.length; i += 7) {
        rows.push(days.slice(i, i + 7));
      }
      
      const filteredRows = rows.filter(row => 
        row.some(cell => cell.day !== null)
      );

      months.push({
        year,
        month,
        days: filteredRows.flat(),
      });
    }

    return months;
  }, [logsMap]);

  const handleDayPress = (date: string | null) => {
    if (date) {
      router.push(`/(tabs)/log?date=${date}`);
    }
  };

  const isEmpty = logs.length === 0;

  return (
    <View style={styles.container}>
      <WatercolorStains />

      {isEmpty && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Nothing logged yet. Go to My data to start.
          </Text>
        </View>
      )}
      
      {/* Stacked Months */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {monthsToDisplay.map((monthData, monthIndex) => {
          const { year, month, days } = monthData;
          const monthKey = `${year}-${month}`;
          
          return (
            <View 
              key={monthKey}
              onLayout={(event) => {
                const { y } = event.nativeEvent.layout;
                handleMonthLayout(year, month, y);
              }}
              style={styles.monthContainer}
            >
              {/* Month/Year Header */}
              <View style={styles.monthHeader}>
                <Text style={styles.monthYear}>
                  {MONTHS[month]} {year}
                </Text>
              </View>

              {/* Days of Week Header */}
              <View style={styles.weekdayHeader}>
                {DAYS_OF_WEEK.map(day => (
                  <View key={day} style={[styles.weekdayCell, { width: cellSize }]}>
                    <Text style={styles.weekdayText}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {days.map((calendarDay, index) => {
                  const { day, date, log, isCurrentMonth, isToday } = calendarDay;
                  const hasFlow = log?.flow && log.flow !== 'None' && log.flow.trim() !== '';
                  const hasFluid = log?.fluid && log.fluid !== 'None' && log.fluid.trim() !== '';
                  const flowColor = log?.flow && FLOW_COLORS[log.flow] ? FLOW_COLORS[log.flow] : FreshFeminine.darkMagenta;
                  const fluidColor = log?.fluid && FLUID_COLORS[log.fluid] ? FLUID_COLORS[log.fluid] : FreshFeminine.aqua;

                  return (
                    <Pressable
                      key={`${date}-${monthIndex}-${index}`}
                      onPress={() => handleDayPress(date)}
                      style={[
                        styles.dayCell,
                        { width: cellSize, height: cellSize },
                        isToday && styles.todayCell,
                      ]}
                      disabled={!isCurrentMonth}
                    >
                      {day !== null && (
                        <>
                          <Text
                            style={[
                              styles.dayNumber,
                              !isCurrentMonth && styles.dayNumberInactive,
                            ]}
                          >
                            {day}
                          </Text>
                          {/* Data indicators - bars at bottom */}
                          {(hasFlow || hasFluid) && (
                            <View style={styles.indicators}>
                              {hasFlow && (
                                <View
                                  style={[
                                    styles.flowBar,
                                    { backgroundColor: flowColor },
                                  ]}
                                />
                              )}
                              {hasFluid && (
                                <View
                                  style={[
                                    styles.fluidBar,
                                    { backgroundColor: fluidColor },
                                  ]}
                                />
                              )}
                            </View>
                          )}
                        </>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreshFeminine.warmWhite,
  },
  emptyState: {
    paddingHorizontal: SPACING * 2,
    paddingTop: SPACING + 8,
    paddingBottom: SPACING,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: FreshFeminine.charcoalLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING + 8,
    paddingBottom: SPACING * 2,
  },
  monthContainer: {
    marginBottom: SPACING * 2,
  },
  monthHeader: {
    paddingHorizontal: SPACING,
    paddingBottom: SPACING / 2,
  },
  monthYear: {
    fontSize: 20,
    fontWeight: '600',
    color: FreshFeminine.charcoal,
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingHorizontal: SPACING,
    marginBottom: 4,
  },
  weekdayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    color: FreshFeminine.charcoalLight,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING,
  },
  dayCell: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Glassmorphism
    borderWidth: 0.5,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 4,
    marginVertical: 2,
    marginHorizontal: 0,
  },
  todayCell: {
    backgroundColor: 'rgba(114, 210, 209, 0.2)', // Light aqua background
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: FreshFeminine.charcoal,
  },
  dayNumberInactive: {
    color: FreshFeminine.iconMuted,
    opacity: 0.4,
  },
  todayNumber: {
    fontWeight: '700',
    color: FreshFeminine.aqua,
  },
  indicators: {
    width: '100%',
    flexDirection: 'row',
    gap: 2,
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: 4,
  },
  flowBar: {
    height: 5,
    flex: 1,
    borderRadius: 2.5,
    minWidth: 6,
  },
  fluidBar: {
    height: 5,
    flex: 1,
    borderRadius: 2.5,
    minWidth: 6,
  },
});
