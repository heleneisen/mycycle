import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FreshFeminine, SPACING } from '@/src/constants/theme';

// Component to render a circle with diagonal line for "none"
function NoneIndicator({ isSelected }: { isSelected: boolean }) {
  return (
    <View style={styles.noneContainer}>
      <View style={[styles.noneCircle, isSelected && styles.noneCircleSelected]} />
      <View style={[styles.noneLine, isSelected && styles.noneLineSelected]} />
    </View>
  );
}

/** 0 = none, 1 = Mild, 2 = Moderate, 3 = Severe */
export type Intensity = 0 | 1 | 2 | 3;

type SymptomIntensityRowProps = {
  label: string;
  value: Intensity;
  onValueChange: (value: Intensity) => void;
  showNoneOption?: boolean; // Show "none" option (for main data window)
};

const LEVELS: { value: Intensity; label: string }[] = [
  { value: 0, label: '—' },
  { value: 1, label: '' },
  { value: 2, label: '' },
  { value: 3, label: '' },
];

// Darker colors for better contrast, maintaining graduality
const SAGE_BY_LEVEL: Record<Intensity, string | null> = {
  0: null,
  1: FreshFeminine.fluid4, // Lightest (was sageLight)
  2: FreshFeminine.fluid5, // Medium (was sageMedium)
  3: FreshFeminine.fluid6, // Darkest (was sageDark)
};

// Component to render stacked strips for intensity levels 1-3
function StackedStrips({ intensity, isSelected }: { intensity: Intensity; isSelected: boolean }) {
  if (intensity === 0) {
    return <NoneIndicator isSelected={isSelected} />;
  }
  
  const stripWidth = 12;
  const stripHeight = 2.5;
  const stripGap = 1.5;
  const totalHeight = (intensity * stripHeight) + ((intensity - 1) * stripGap);
  
  return (
    <View style={[styles.stripsContainer, { height: 32, justifyContent: 'center' }]}>
      <View style={{ height: totalHeight }}>
        {Array.from({ length: intensity }).map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.strip,
              {
                width: stripWidth,
                height: stripHeight,
                backgroundColor: SAGE_BY_LEVEL[intensity] || FreshFeminine.fluid4,
                marginBottom: idx < intensity - 1 ? stripGap : 0,
              },
              isSelected && styles.stripSelected,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export function SymptomIntensityRow({ label, value, onValueChange, showNoneOption = false }: SymptomIntensityRowProps) {
  // Filter levels based on whether to show "none" option
  const displayLevels = showNoneOption ? LEVELS : LEVELS.filter(({ value: v }) => v !== 0);
  
  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.levels}>
        {displayLevels.map(({ value: v }) => {
          const isSelected = value === v;
          // In modal (showNoneOption=false), tapping selected option deselects it
          // In main window (showNoneOption=true), tapping "none" sets to 0, tapping others sets to that value
          const handlePress = showNoneOption 
            ? () => onValueChange(v) 
            : () => onValueChange(isSelected ? 0 : v);
          
          // Don't show selection circle for "none" (value 0)
          const showSelectionCircle = isSelected && v !== 0;
          
          return (
            <Pressable
              key={v}
              onPress={handlePress}
              style={styles.option}
            >
              <View style={[styles.iconRing, showSelectionCircle && styles.iconRingSelected]}>
                <StackedStrips intensity={v} isSelected={isSelected} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: FreshFeminine.charcoal,
    flex: 1,
    marginRight: 8,
  },
  levels: { 
    flexDirection: 'row', 
    gap: 2,
    alignItems: 'center',
  },
  option: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRingSelected: {
    backgroundColor: 'rgba(114, 210, 209, 0.2)', // Lighter selection indicator
  },
  stripsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  strip: {
    borderRadius: 1,
  },
  stripSelected: {
    opacity: 1,
  },
  noneContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  noneCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FreshFeminine.charcoalLight,
    position: 'absolute',
  },
  noneCircleSelected: {
    borderColor: FreshFeminine.charcoalLight,
  },
  noneLine: {
    width: 12,
    height: 1,
    backgroundColor: FreshFeminine.charcoalLight,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
  noneLineSelected: {
    backgroundColor: FreshFeminine.charcoalLight,
  },
});
