import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Ellipse } from 'react-native-svg';
import { FreshFeminine } from '@/src/constants/theme';

const SEX_OPTIONS = ['Protected', 'Unprotected', 'Withdrawal'] as const;

// Interlocking circles icon components
function InterlockingCirclesFilled({ size = 30, color, strokeColor, overlapColor }: { size?: number; color: string; strokeColor?: string; overlapColor?: string }) {
  const stroke = strokeColor || color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Left circle - filled with outer line */}
      <Circle cx="9" cy="12" r="7" fill={color} stroke={stroke} strokeWidth="1.5" />
      {/* Right circle - filled with outer line */}
      <Circle cx="15" cy="12" r="7" fill={color} stroke={stroke} strokeWidth="1.5" />
      {/* Overlap area - aqua ellipse to show intersection */}
      <Ellipse cx="12" cy="12" rx="3" ry="5" fill={overlapColor || color} opacity={0.8} />
      {/* Redraw left circle outline on top to ensure it's fully visible */}
      <Circle cx="9" cy="12" r="7" fill="none" stroke={stroke} strokeWidth="1.5" />
    </Svg>
  );
}

function InterlockingCirclesOutline({ size = 30, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Left circle - white fill with outline to prevent selection color showing through */}
      <Circle cx="9" cy="12" r="7" fill="#FFFFFF" stroke={color} strokeWidth="1.5" />
      {/* Right circle - white fill with outline to prevent selection color showing through */}
      <Circle cx="15" cy="12" r="7" fill="#FFFFFF" stroke={color} strokeWidth="1.5" />
      {/* Redraw left circle outline on top to ensure it's fully visible */}
      <Circle cx="9" cy="12" r="7" fill="none" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
}

function InterlockingCirclesHalf({ size = 30, color, strokeColor }: { size?: number; color: string; strokeColor?: string }) {
  // Path for left half of a circle centered at (9, 12) with radius 7
  // Left semicircle: arc from top-left to bottom-left, then close with line
  const leftHalfPath = "M 9 5 A 7 7 0 0 0 2 12 A 7 7 0 0 0 9 19 Z";
  // Path for left half of a circle centered at (15, 12) with radius 7
  const rightHalfPath = "M 15 5 A 7 7 0 0 0 8 12 A 7 7 0 0 0 15 19 Z";
  const stroke = strokeColor || color;
  
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Left circle - white background first, then half filled (left half) */}
      <Circle cx="9" cy="12" r="7" fill="#FFFFFF" stroke={stroke} strokeWidth="1.5" />
      <Path d={leftHalfPath} fill={color} />
      {/* Right circle - white background first, then half filled (left half) */}
      <Circle cx="15" cy="12" r="7" fill="#FFFFFF" stroke={stroke} strokeWidth="1.5" />
      <Path d={rightHalfPath} fill={color} />
      {/* Redraw left circle outline on top to ensure it's fully visible */}
      <Circle cx="9" cy="12" r="7" fill="none" stroke={stroke} strokeWidth="1.5" />
    </Svg>
  );
}

type SexType = (typeof SEX_OPTIONS)[number];

type SexRowProps = {
  value: SexType | null;
  onSelect: (value: SexType | null) => void;
};

export function SexRow({ value, onSelect }: SexRowProps) {
  const filledColor = FreshFeminine.fluid3; // Lighter aqua for filled areas
  const outlineColor = FreshFeminine.fluid6; // Darker aqua shade for outline - creates contrast
  const overlapColor = FreshFeminine.aqua; // Aqua color for overlap
  
  return (
    <View style={styles.row}>
      {SEX_OPTIONS.map((opt) => {
        const isSelected = value === opt;
        let IconComponent;
        if (opt === 'Protected') {
          IconComponent = <InterlockingCirclesFilled size={30} color={filledColor} strokeColor={outlineColor} overlapColor={overlapColor} />;
        } else if (opt === 'Unprotected') {
          IconComponent = <InterlockingCirclesOutline size={30} color={outlineColor} />;
        } else {
          IconComponent = <InterlockingCirclesHalf size={30} color={filledColor} strokeColor={outlineColor} />;
        }
        
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(isSelected ? null : opt)}
            style={styles.option}
          >
            <View style={[styles.iconRing, isSelected && styles.iconRingSelected]}>
              {IconComponent}
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
  icon: {},
  optionText: {
    fontSize: 11,
    color: FreshFeminine.charcoal,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
});
