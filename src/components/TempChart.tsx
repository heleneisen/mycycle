import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppDimensions } from '@/src/hooks/useAppDimensions';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { FreshFeminine } from '@/src/constants/theme';
import type { DailyLog } from '@/src/storage/db';

const CHART_PADDING = { top: 12, right: 12, bottom: 24, left: 40 };
const TEMP_RANGE_C = 2; // min span for temp axis (e.g. 36–38°C)

type TempChartProps = {
  logs: DailyLog[];
  width?: number;
  height?: number;
};

/** Build smooth cubic Bezier path through points (x,y) in 0–1 range */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) / 3;
    const c0x = p0.x + dx;
    const c1x = p1.x - dx;
    d += ` C ${c0x} ${p0.y} ${c1x} ${p1.y} ${p1.x} ${p1.y}`;
  }
  return d;
}

export function TempChart({
  logs,
  width: propWidth,
  height: propHeight,
}: TempChartProps) {
  const { width: winWidth } = useAppDimensions();
  const width = propWidth ?? winWidth - 32;
  const height = propHeight ?? 220;

  const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  const { pathD, peakPoints, tempMin, tempMax, gridLines } = useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const withTemp = sorted.filter((l) => l.temp != null) as (DailyLog & { temp: number })[];
    if (withTemp.length === 0) {
      return {
        pathD: '',
        peakPoints: [] as { x: number; y: number; index: number }[],
        tempMin: 36,
        tempMax: 38,
        gridLines: { h: 5, v: 5 },
      };
    }

    const temps = withTemp.map((l) => l.temp);
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);
    const span = Math.max(TEMP_RANGE_C, maxT - minT);
    const tempMin = minT - (span - (maxT - minT)) / 2;
    const tempMax = tempMin + span;

    const points = withTemp.map((log, i) => {
      const x = CHART_PADDING.left + (i / Math.max(1, withTemp.length - 1)) * chartWidth;
      const y =
        CHART_PADDING.top +
        chartHeight -
        ((log.temp - tempMin) / (tempMax - tempMin)) * chartHeight;
      return { x, y, log, index: i };
    });

    const pathD = smoothPath(points.map((p) => ({ x: p.x, y: p.y })));

    const peakPoints = points
      .filter((p) => p.log.isPeak)
      .map((p) => ({ x: p.x, y: p.y, index: p.index }));

    const gridLines = { h: 5, v: Math.max(2, withTemp.length) };

    return {
      pathD,
      peakPoints,
      tempMin,
      tempMax,
      gridLines,
    };
  }, [logs, chartWidth, chartHeight]);

  const gridColor = FreshFeminine.gridFaint;

  return (
    <View style={[styles.wrapper, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={FreshFeminine.sage} stopOpacity="0.6" />
            <Stop offset="1" stopColor={FreshFeminine.sage} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Faint grid */}
        {Array.from({ length: gridLines.h }).map((_, i) => {
          const y =
            CHART_PADDING.top + (chartHeight * (i + 1)) / (gridLines.h + 1);
          return (
            <Line
              key={`h-${i}`}
              x1={CHART_PADDING.left}
              y1={y}
              x2={CHART_PADDING.left + chartWidth}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
            />
          );
        })}
        {Array.from({ length: gridLines.v }).map((_, i) => {
          const x =
            CHART_PADDING.left + (chartWidth * (i + 1)) / (gridLines.v + 1);
          return (
            <Line
              key={`v-${i}`}
              x1={x}
              y1={CHART_PADDING.top}
              x2={x}
              y2={CHART_PADDING.top + chartHeight}
              stroke={gridColor}
              strokeWidth={1}
            />
          );
        })}

        {/* Temperature line (Aqua). If adding menstruation/flow bars, use FreshFeminine.darkMagenta. */}
        {pathD ? (
          <Path
            d={pathD}
            fill="none"
            stroke={FreshFeminine.sage}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Peak day markers with soft pink glow (concentric circles) */}
        {peakPoints.map((p, i) => (
          <React.Fragment key={`peak-${i}`}>
            <Circle cx={p.x} cy={p.y} r={12} fill={FreshFeminine.dustyRose} opacity={0.2} />
            <Circle cx={p.x} cy={p.y} r={8} fill={FreshFeminine.dustyRose} opacity={0.35} />
            <Circle cx={p.x} cy={p.y} r={5} fill={FreshFeminine.dustyRose} />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
});
