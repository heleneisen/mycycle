import { Tabs } from 'expo-router';
import React from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { HapticTab } from '@/components/haptic-tab';
import { FreshFeminine } from '@/src/constants/theme';
import { AppHeader } from '@/src/components/AppHeader';
import { SavedIndicatorProvider } from '@/src/contexts/SavedIndicatorContext';

export default function TabLayout() {
  return (
    <SavedIndicatorProvider>
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
          paddingBottom: 14,
        },
        headerShadowVisible: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: FreshFeminine.warmWhite,
          borderTopColor: FreshFeminine.sage,
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
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
    </SavedIndicatorProvider>
  );
}
