import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { AppState, AppStateStatus, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AdBanner from "@/components/AdBanner";
import { fb } from "@/lib/firebase";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

export interface Ad {
  id: string;
  type: "banner-top" | "banner-bottom" | "popunder";
  label: string;
  code: string;
  active: boolean;
}

const BANNER_TOP_H = 80;
const BANNER_BOTTOM_H = 60;
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 menit

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", gestureEnabled: true }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="movie/[id]" options={{ headerShown: false, animation: "slide_from_right", gestureEnabled: true }} />
      <Stack.Screen name="tv/[id]" options={{ headerShown: false, animation: "slide_from_right", gestureEnabled: true }} />
      <Stack.Screen name="player" options={{ headerShown: false, animation: "slide_from_bottom", gestureEnabled: true }} />
      <Stack.Screen name="admin" options={{ headerShown: false, animation: "slide_from_right", gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });
  const [ads, setAds] = useState<Ad[]>([]);
  const appState = useRef(AppState.currentState);

  const fetchAds = useCallback(async () => {
    try {
      const data = await fb.getAds();
      setAds((data as Ad[]) ?? []);
    } catch {}
  }, []);

  // Pertama kali load
  useEffect(() => { fetchAds(); }, [fetchAds]);

  // Auto-refresh setiap 5 menit
  useEffect(() => {
    const timer = setInterval(fetchAds, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchAds]);

  // Refresh saat app aktif kembali dari background
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        fetchAds();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [fetchAds]);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const activeAds = ads.filter(a => a.active);
  const hasBannerTop = activeAds.some(a => a.type === "banner-top");
  const hasBannerBottom = activeAds.some(a => a.type === "banner-bottom");

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["bottom"]}>
                {hasBannerTop && <View style={{ height: BANNER_TOP_H, backgroundColor: "#000" }} />}
                <View style={{ flex: 1 }}>
                  <RootLayoutNav />
                </View>
                {hasBannerBottom && <View style={{ height: BANNER_BOTTOM_H, backgroundColor: "#000" }} />}
                <AdBanner ads={ads} />
              </SafeAreaView>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
