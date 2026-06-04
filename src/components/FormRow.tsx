import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FreshFeminine } from '@/src/constants/theme';

export const FORM_OPTIONS = ['Closed', 'Midway', 'Open'] as const;
export type FormType = (typeof FORM_OPTIONS)[number];

// Downward-pointing triangle on 24×24 viewBox
// Vertices: top-left (3,5), top-right (21,5), bottom-centre (12,20)
const FULL_TRI = 'M 12 20 L 3 5 L 21 5 Z';
// Bottom half of the triangle (midpoint of each slanted edge at y=12.5)
const HALF_TRI = 'M 12 20 L 7.5 12.5 L 16.5 12.5 Z';

function TriangleIcon({ type, size = 28 }: { type: FormType; size?: number }) {
  const fill   = FreshFeminine.fluid3;
  const stroke = FreshFeminine.fluid6;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {type === 'Closed' && (
        <Path d={FULL_TRI} fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {type === 'Midway' && (
        <>
          <Path d={FULL_TRI} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          <Path d={HALF_TRI} fill={fill} />
        </>
      )}
      {type === 'Open' && (
        <Path d={FULL_TRI} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      )}
    </Svg>
  );
}

type FormRowProps = {
  value: FormType | null;
  onSelect: (value: FormType | null) => void;
};

export function FormRow({ value, onSelect }: FormRowProps) {
  return (
    <View style={styles.row}>
      {FORM_OPTIONS.map((opt) => {
        const isSelected = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(isSelected ? null : opt)}
            style={styles.option}
          >
            <View style={[styles.iconRing, isSelected && styles.iconRingSelected]}>
              <TriangleIcon type={opt} size={28} />
            </View>
            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]} numberOfLines={1}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  iconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconRingSelected: {
    backgroundColor: 'rgba(114, 210, 209, 0.25)',
  },
  optionText: {
    fontSize: 11,
    color: FreshFeminine.charcoal,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
});
