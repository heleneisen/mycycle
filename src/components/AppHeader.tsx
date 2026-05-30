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
        <View style={styles.rightSlot} pointerEvents="box-none">
          {saved && (
            <Text style={styles.savedIndicator} numberOfLines={1}>
              ✓ Saved
            </Text>
          )}
        </View>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    minHeight: 40,
  },
  headerSpacer: {
    height: 16,
    width: '100%',
  },
  centerGroup: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  rightSlot: {
    minWidth: 52,
    alignItems: 'flex-end',
  },
  savedIndicator: {
    fontSize: 12,
    color: FreshFeminine.sage,
    opacity: 0.9,
  },
});
