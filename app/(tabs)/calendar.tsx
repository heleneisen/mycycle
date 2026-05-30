import React from 'react';
import { View } from 'react-native';
import { CalendarScreen } from '@/src/screens/CalendarScreen';

export default function CalendarTab() {
  return (
    <View style={{ flex: 1 }}>
      <CalendarScreen />
    </View>
  );
}
