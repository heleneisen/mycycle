import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { HapticTab } from '@/components/haptic-tab';
import { FreshFeminine } from '@/src/constants/theme';
import { AppHeader } from '@/src/components/AppHeader';
import { SavedIndicatorProvider } from '@/src/contexts/SavedIndicatorContext';
import { AskFemCycleModal } from '@/src/components/AskFemCycleModal';

const TAB_BAR_HEIGHT = 58;
const BUTTON_BOTTOM = TAB_BAR_HEIGHT + 14;

export default function TabLayout() {
  const [chatVisible, setChatVisible] = useState(false);

  return (
    <SavedIndicatorProvider>
      <View style={{ flex: 1 }}>
        <Tabs
          initialRouteName="log"
          screenOptions={{
            tabBarActiveTintColor: FreshFeminine.fluid6,
            tabBarInactiveTintColor: FreshFeminine.charcoalLight,
            headerShown: true,
            headerTitle: () => <AppHeader />,
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: FreshFeminine.warmWhite,
              borderBottomWidth: 1,
              borderBottomColor: FreshFeminine.sage,
              elevation: 0,
              shadowOpacity: 0,
            },
            headerShadowVisible: false,
            tabBarButton: HapticTab,
            tabBarStyle: {
              backgroundColor: FreshFeminine.warmWhite,
              borderTopColor: FreshFeminine.sage,
              paddingBottom: 8,
              height: TAB_BAR_HEIGHT,
            },
            tabBarLabelStyle: { fontWeight: '500' },
          }}
        >
          <Tabs.Screen
            name="calendar"
            options={{
              title: 'Calendar',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="calendar-today" size={size ?? 24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="log"
            options={{
              title: 'My data',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="edit" size={size ?? 24} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="chart"
            options={{
              title: 'Chart',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="bar-chart" size={size ?? 24} color={color} />
              ),
            }}
          />
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen name="explore" options={{ href: null }} />
        </Tabs>

        {/* Floating Ask FemCycle button */}
        <View style={[styles.floatingContainer, { bottom: BUTTON_BOTTOM }]} pointerEvents="box-none">
          <Pressable onPress={() => setChatVisible(true)} style={styles.pillPressable}>
            <LinearGradient
              colors={['#FDEBD8', '#FAD6E6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.pill}
            >
              <View style={styles.sparkleCluster}>
                <MaterialIcons name="auto-awesome" size={15} color={FreshFeminine.flowMedium} />
                <MaterialIcons name="auto-awesome" size={10} color={FreshFeminine.flowLight} style={styles.sparklePurple} />
              </View>
              <Text style={styles.pillLabel}>Ask FemCycle</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <AskFemCycleModal visible={chatVisible} onClose={() => setChatVisible(false)} />
      </View>
    </SavedIndicatorProvider>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    left: 20,
  },
  pillPressable: {
    borderRadius: 999,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(114,210,209,0.45), 0 2px 6px rgba(0,0,0,0.12)' } as any,
      default: {
        shadowColor: '#72D2D1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  pillLabel: {
    color: FreshFeminine.charcoal,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  sparkleCluster: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparklePurple: {
    position: 'absolute',
    bottom: -2,
    right: -4,
  },
});
