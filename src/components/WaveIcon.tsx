import React from 'react';
import Svg, { Path } from 'react-native-svg';

type WaveIconProps = {
  waveCount: 1 | 2 | 3 | 4;
  size?: number;
  color: string;
};

/**
 * WaveIcon - Displays stacked waves (1-4) for fluid types
 * 
 * @param waveCount - Number of waves to display (1-4)
 * @param size - Icon size (default: 26)
 * @param color - Wave color (aqua)
 */
export function WaveIcon({ waveCount, size = 26, color }: WaveIconProps) {
  const viewBox = '0 0 24 24';
  const width = size;
  const height = size;
  
  // Wave path: perfectly symmetrical wave with two curves (two peaks)
  // Matches the reference pattern exactly - symmetrical double hump
  const wavePath = (y: number): string => {
    const startX = 3;
    const endX = 21;
    const width = endX - startX;
    const amplitude = 2.5;
    
    // Perfectly symmetrical: divide into 6 equal segments for smooth curves
    const segment = width / 6;
    const peak1X = startX + segment * 1.5;  // First peak at 1/4
    const valleyX = startX + segment * 3;   // Valley at center
    const peak2X = startX + segment * 4.5;  // Second peak at 3/4
    
    // Start to first peak - smooth rise
    const cp1x1 = startX + segment * 0.5;
    const cp1y1 = y - amplitude;
    const cp2x1 = peak1X - segment * 0.3;
    const cp2y1 = y - amplitude;
    
    // First peak to valley - smooth fall
    const cp1x2 = peak1X + segment * 0.3;
    const cp1y2 = y;
    const cp2x2 = valleyX - segment * 0.3;
    const cp2y2 = y;
    
    // Valley to second peak - smooth rise (mirror of first peak)
    const cp1x3 = valleyX + segment * 0.3;
    const cp1y3 = y - amplitude;
    const cp2x3 = peak2X - segment * 0.3;
    const cp2y3 = y - amplitude;
    
    // Second peak to end - smooth fall (mirror of start)
    const cp1x4 = peak2X + segment * 0.3;
    const cp1y4 = y;
    const cp2x4 = endX - segment * 0.5;
    const cp2y4 = y;
    
    return `M ${startX} ${y} C ${cp1x1} ${cp1y1} ${cp2x1} ${cp2y1} ${peak1X} ${y} C ${cp1x2} ${cp1y2} ${cp2x2} ${cp2y2} ${valleyX} ${y} C ${cp1x3} ${cp1y3} ${cp2x3} ${cp2y3} ${peak2X} ${y} C ${cp1x4} ${cp1y4} ${cp2x4} ${cp2y4} ${endX} ${y}`;
  };
  
  // Calculate wave positions based on count
  // Waves are stacked vertically with equal spacing, centered in the viewBox
  const waves: number[] = [];
  const totalHeight = 12; // Available height for waves
  const waveSpacing = totalHeight / (waveCount + 1);
  const baseY = 12; // Center vertically in 24x24 viewBox
  
  // Equal spacing between waves, centered vertically
  for (let i = 0; i < waveCount; i++) {
    const y = baseY - (totalHeight / 2) + (waveSpacing * (i + 1));
    waves.push(y);
  }
  
  return (
    <Svg width={width} height={height} viewBox={viewBox}>
      {waves.map((y, index) => (
        <Path
          key={index}
          d={wavePath(y)}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
