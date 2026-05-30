import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FreshFeminine } from '@/src/constants/theme';

const FLOW_OPTIONS = ['Spotting', 'Light', 'Medium', 'Heavy'] as const;

const DROPS: Record<(typeof FLOW_OPTIONS)[number], number> = {
  Spotting: 1,
  Light: 2,
  Medium: 3,
  Heavy: 4,
};

const FLOW_SHADE_ORDER = [
  FreshFeminine.flowSpotting,
  FreshFeminine.flowLight,
  FreshFeminine.flowMedium,
  FreshFeminine.flowDark,
] as const;

type FlowType = (typeof FLOW_OPTIONS)[number];

type FlowRowProps = {
  value: FlowType | null;
  onSelect: (value: FlowType | null) => void;
};

export function FlowRow({ value, onSelect }: FlowRowProps) {
  return (
    <View style={styles.row}>
      {FLOW_OPTIONS.map((opt) => {
        const isSelected = value === opt;
        const dropCount = DROPS[opt];
        const shadeIndex = FLOW_OPTIONS.indexOf(opt);
        const frontDropLeft = 9 + (dropCount - 1) * 3; // keeps the overlapped cluster centered in the 40px ring
        const dropColors = Array.from({ length: dropCount }, (_, i) => {
          const idx = Math.max(0, shadeIndex - i);
          return FLOW_SHADE_ORDER[idx];
        });
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(isSelected ? null : opt)}
            style={styles.option}
          >
            <View style={[
              styles.dropsWrap,
              isSelected && styles.dropsRingSelected,
            ]}>
              <View style={styles.drops}>
                {dropColors.map((dropColor, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dropLayer,
                      { left: frontDropLeft - i * 6, zIndex: dropCount - i },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="water"
                      size={26}
                      color={dropColor}
                    />
                  </View>
                ))}
              </View>
            </View>
            <Text
              style={[styles.optionText, isSelected && styles.optionTextSelected]}
              numberOfLines={1}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingLeft: 0 }, // Increased gap to stretch, start from left edge
  option: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dropsWrap: {
    marginBottom: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropsRingSelected: {
    backgroundColor: 'rgba(139, 0, 139, 0.08)',
  },
  drops: {
    width: 44,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dropLayer: {
    position: 'absolute',
    top: 1,
  },
  optionText: {
    fontSize: 11,
    color: FreshFeminine.charcoal,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
});
