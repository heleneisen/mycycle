import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { FreshFeminine, SPACING } from '@/src/constants/theme';

type CardProps = ViewProps & {
  children: React.ReactNode;
};

export function Card({ children, style, ...rest }: CardProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', // Full white for more contrast
    borderRadius: 12,
    padding: SPACING,
    borderWidth: 1,
    borderColor: FreshFeminine.cardGlassBorder,
    shadowColor: FreshFeminine.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 3,
  },
});
