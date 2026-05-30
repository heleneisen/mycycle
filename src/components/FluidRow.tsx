import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FreshFeminine } from '@/src/constants/theme';

const FLUID_OPTIONS = ['Sticky', 'Creamy', 'Egg white', 'Watery'] as const;

// Gradual colors with good contrast - keep Sticky light, make others progressively darker
const FLUID_COLORS = [
  FreshFeminine.fluid2, // Sticky - lighter but still visible
  FreshFeminine.fluid4, // Creamy - darker
  FreshFeminine.fluid5, // Egg white - darker
  FreshFeminine.fluid6, // Watery - darkest
] as const;
const TINY_DROP_SIZE = [10, 10, 10, 10] as const;
const TINY_DROP_OPACITY = [0.45, 0.6, 0.75, 0.95] as const;

type FluidType = (typeof FLUID_OPTIONS)[number];

type FluidRowProps = {
  value: FluidType | null;
  onSelect: (value: FluidType | null) => void;
};

export function FluidRow({ value, onSelect }: FluidRowProps) {
  return (
    <View style={styles.row}>
      {FLUID_OPTIONS.map((opt, index) => {
        const isSelected = value === opt;
        const fillColor = FLUID_COLORS[index];
        const iconColor = fillColor;
        const tinyDropSize = TINY_DROP_SIZE[index];
        const tinyDropOpacity = TINY_DROP_OPACITY[index];
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(isSelected ? null : opt)}
            style={styles.option}
          >
            <View style={[styles.iconRing, isSelected && styles.iconRingSelected]}>
              <View style={styles.dropWrap}>
                <MaterialCommunityIcons
                  name="water"
                  size={26}
                  color={iconColor}
                  style={styles.icon}
                />
                <MaterialCommunityIcons
                  name="water"
                  size={tinyDropSize}
                  color={iconColor}
                  style={[styles.tinyDrop, { opacity: tinyDropOpacity }]}
                />
              </View>
            </View>
            <Text
              style={[styles.optionText, isSelected && styles.optionTextSelected]}
              numberOfLines={2}
              textAlign="center"
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
  row: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 12, // Increased gap to stretch across row
    paddingLeft: 0, // Start from left edge to align with checkbox
  },
  option: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    alignItems: 'center',
  },
  iconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconRingSelected: {
    backgroundColor: 'rgba(114, 210, 209, 0.2)', // Lighter selection indicator
  },
  dropWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {},
  tinyDrop: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  optionText: {
    fontSize: 11,
    color: FreshFeminine.charcoal,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
});
