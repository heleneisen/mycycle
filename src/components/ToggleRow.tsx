import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { FreshFeminine, SPACING } from '@/src/constants/theme';

type ToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Use Dusty Rose when on (e.g. Day 1 marker) */
  accentDustyRose?: boolean;
  /** Slightly lighter label color (e.g. Peak day, Day 1) */
  labelLight?: boolean;
  /** Disable the toggle (e.g. until another field is set) */
  disabled?: boolean;
  /** No bottom margin (e.g. when in a row or last in a compact block) */
  noMarginBottom?: boolean;
  /** Tighter layout for side-by-side (smaller gap, label truncates) */
  compact?: boolean;
  /** Align label to the right (e.g. second toggle in a row, closer to its switch) */
  labelAlignRight?: boolean;
};

export function ToggleRow({
  label,
  value,
  onValueChange,
  accentDustyRose,
  labelLight,
  disabled,
  noMarginBottom,
  compact,
  labelAlignRight,
}: ToggleRowProps) {
  const trackColorOn = accentDustyRose ? FreshFeminine.dustyRose : FreshFeminine.sage;
  return (
    <View style={[styles.row, disabled && styles.rowDisabled, noMarginBottom && styles.rowNoMargin, compact && styles.rowCompact]} pointerEvents={disabled ? 'none' : 'auto'}>
      <Text style={[styles.label, labelLight && styles.labelLight, disabled && styles.labelDisabled, compact && styles.labelCompact, labelAlignRight && styles.labelAlignRight]} numberOfLines={compact ? 2 : 1}>{label}</Text>
      <View style={styles.switchWrap}>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: FreshFeminine.sageMuted, true: trackColorOn }}
          thumbColor={FreshFeminine.warmWhite}
          disabled={disabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: SPACING,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowNoMargin: {
    marginBottom: 0,
  },
  rowCompact: {
    gap: 0,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    color: FreshFeminine.charcoal,
  },
  labelCompact: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: FreshFeminine.charcoalLight,
  },
  labelAlignRight: {
    textAlign: 'right',
  },
  labelLight: {
    color: FreshFeminine.charcoalLight,
  },
  labelDisabled: {
    color: FreshFeminine.charcoalLight,
  },
  switchWrap: {
    transform: [{ scale: 0.7 }],
  },
});
