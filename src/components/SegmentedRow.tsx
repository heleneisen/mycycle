import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FreshFeminine, SPACING } from '@/src/constants/theme';

type SegmentedRowProps<T extends string> = {
  label?: string;
  options: readonly T[];
  value: T | null;
  onSelect: (value: T) => void;
  /** Use Dusty Rose for selected (e.g. Flow markers) */
  accentDustyRose?: boolean;
};

export function SegmentedRow<T extends string>({
  label,
  options,
  value,
  onSelect,
  accentDustyRose,
}: SegmentedRowProps<T>) {
  const selectedBg = accentDustyRose ? FreshFeminine.dustyRose : FreshFeminine.sage;
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {options.map((opt) => {
          const isSelected = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={[
                styles.option,
                isSelected && { backgroundColor: selectedBg, borderColor: selectedBg },
              ]}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: SPACING },
  label: {
    fontSize: 14,
    color: FreshFeminine.charcoal,
    marginBottom: 6,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: FreshFeminine.sage,
    backgroundColor: 'transparent',
  },
  optionSelected: {},
  optionText: {
    fontSize: 12,
    color: FreshFeminine.charcoal,
  },
  optionTextSelected: {
    color: FreshFeminine.warmWhite,
    fontWeight: '600',
  },
});
