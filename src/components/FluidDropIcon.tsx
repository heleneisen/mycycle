/**
 * Fluid Drop Icon - Saved for reuse
 * 
 * This component was previously used in FluidRow but has been replaced with WaveIcon.
 * Kept here for potential future reuse.
 */

import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type FluidDropIconProps = {
  size?: number;
  color: string;
  style?: any;
};

export function FluidDropIcon({ size = 26, color, style }: FluidDropIconProps) {
  return (
    <MaterialCommunityIcons
      name="water"
      size={size}
      color={color}
      style={style}
    />
  );
}
