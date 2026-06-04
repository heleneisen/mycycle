import { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import 'react-native-reanimated';

import { FreshFeminine } from '@/src/constants/theme';
import { initDb } from '@/src/storage/db';
import { MAX_PHONE_WIDTH } from '@/src/hooks/useAppDimensions';

const FreshFeminineTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: FreshFeminine.sage,
    background: FreshFeminine.warmWhite,
    card: FreshFeminine.warmWhite,
    text: FreshFeminine.charcoal,
    border: FreshFeminine.sage,
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
    ...MaterialIcons.font,
  });

  useEffect(() => {
    initDb();
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={FreshFeminineTheme}>
      <Head>
        <meta name="theme-color" content="#72D2D1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FemCycle" />
        {Platform.OS === 'web' && (
          <style>{`
            html, body { background-color: #DDD8D0; height: 100%; margin: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
            #root { height: 100%; display: flex; justify-content: center; }
          `}</style>
        )}
      </Head>
      <View style={styles.frame}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
      </View>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  frame: Platform.select({
    web: {
      flex: 1,
      width: '100%',
      maxWidth: MAX_PHONE_WIDTH,
      alignSelf: 'center',
      overflow: 'hidden',
      // subtle shadow so the phone frame lifts off the desktop background
      boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
    } as any,
    default: {
      flex: 1,
    },
  })!,
});
