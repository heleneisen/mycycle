import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FreshFeminine, SPACING } from '@/src/constants/theme';

type CheckboxRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Slightly lighter label color (e.g. Peak day, Day 1) */
  labelLight?: boolean;
  /** Disable the checkbox (e.g. until another field is set) */
  disabled?: boolean;
  /** No bottom margin (e.g. when in a row or last in a compact block) */
  noMarginBottom?: boolean;
  /** Use dark magenta color for Flow section */
  accentMagenta?: boolean;
};

export function CheckboxRow({
  label,
  value,
  onValueChange,
  labelLight,
  disabled,
  noMarginBottom,
  accentMagenta,
}: CheckboxRowProps) {
  const checkboxColor = accentMagenta ? FreshFeminine.darkMagenta : FreshFeminine.sage;
  const checkmarkColor = accentMagenta ? FreshFeminine.warmWhite : FreshFeminine.charcoal;
  const borderColor = value ? checkboxColor : FreshFeminine.iconMuted; // Grey when empty, colored when checked
  
  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      style={[styles.row, disabled && styles.rowDisabled, noMarginBottom && styles.rowNoMargin]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <View style={[
        styles.checkbox,
        { borderColor },
        value && [styles.checkboxChecked, { backgroundColor: checkboxColor }]
      ]}>
        {value && (
          <MaterialCommunityIcons
            name="check"
            size={14}
            color={checkmarkColor}
          />
        )}
      </View>
      <Text style={[styles.label, labelLight && styles.labelLight, disabled && styles.labelDisabled]}>
        {label}
      </Text>
    </Pressable>
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
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    // borderColor set dynamically based on checked state
  },
  checkboxChecked: {
    // Color applied dynamically via style prop
  },
  label: {
    fontSize: 11,
    color: FreshFeminine.charcoal,
  },
  labelLight: {
    color: FreshFeminine.charcoalLight,
  },
  labelDisabled: {
    color: FreshFeminine.charcoalLight,
  },
});
