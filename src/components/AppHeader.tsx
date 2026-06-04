import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { FreshFeminine } from '@/src/constants/theme';
import { useSavedIndicator } from '@/src/contexts/SavedIndicatorContext';

export function AppHeader() {
  const { saved } = useSavedIndicator() ?? { saved: false };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.sideSlot} />
        <View style={styles.centerGroup} pointerEvents="none">
          <View style={styles.logoWrap}>
            <MaterialCommunityIcons
              name="heart"
              size={32}
              color={FreshFeminine.sageDark}
              style={styles.heart}
            />
            <MaterialCommunityIcons
              name="water"
              size={14}
              color={FreshFeminine.sageLight}
              style={styles.drop}
            />
          </View>
          <Text style={styles.title}>FemCycle</Text>
        </View>
        <View style={styles.sideSlot} pointerEvents="box-none">
          {saved && (
            <Text style={styles.savedIndicator} numberOfLines={1}>
              ✓ Saved
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingVertical: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  sideSlot: {
    flex: 1,
    alignItems: 'flex-end',
  },
  centerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    position: 'absolute',
    opacity: 0.95,
  },
  drop: {
    opacity: 0.95,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: FreshFeminine.charcoal,
  },
  savedIndicator: {
    fontSize: 12,
    color: FreshFeminine.sage,
    opacity: 0.9,
  },
});
