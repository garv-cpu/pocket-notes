// _layout.tsx
import React, { useEffect, useState } from "react";
import { View, Text, AppState, AppStateStatus, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  PaperProvider,
  MD3LightTheme,
  IconButton,
  Button,
} from "react-native-paper";
import {
  useFonts,
  DancingScript_700Bold,
} from "@expo-google-fonts/dancing-script";
import { useRouter } from "expo-router";
import { ToastProvider, useToast } from "../components/ToastManager";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ShareProvider } from "../components/ShareContext";
import { ShareButton } from "@/components/ShareButton";
import * as ScreenCapture from "expo-screen-capture";

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#FFD700",
    background: "#000000",
    surface: "#1a1a1a",
    text: "#ffffff",
    onSurface: "#ffffff",
  },
};

export default function Layout() {
  const [fontsLoaded] = useFonts({
    DancingScript_700Bold,
  });
  const router = useRouter();
  const { showToast } = useToast();

  const [isLocked, setIsLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Load biometric setting
  useEffect(() => {
    const getBiometricSetting = async () => {
      const storedSetting = await AsyncStorage.getItem("biometricEnabled");
      if (storedSetting) {
        const enabled = JSON.parse(storedSetting);
        setBiometricEnabled(enabled);
        if (enabled) setIsLocked(true);
      }
    };
    getBiometricSetting();
  }, []);

  // Secure flag
  useEffect(() => {
    const applySecureFlag = async () => {
      if (isLocked) {
        await ScreenCapture.preventScreenCaptureAsync();
      } else {
        await ScreenCapture.allowScreenCaptureAsync();
      }
    };
    applySecureFlag();
  }, [isLocked]);

  // Lock on background/return
  useEffect(() => {
    const handleAppStateChange = (next: AppStateStatus) => {
      if (!biometricEnabled) return;

      if (next === "background" || next === "inactive") {
        setIsLocked(true);
      }
      if (next === "active") {
        setIsLocked(true);
      }
    };

    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [biometricEnabled]);

  const authenticateBiometrics = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Pocket Notes",
      fallbackLabel: "Use device password",
      cancelLabel: "Cancel",
    });

    if (result.success) {
      setIsLocked(false);
      showToast("App unlocked");
    } else {
      showToast("Authentication failed.");
    }
  };

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ShareProvider>
        <PaperProvider theme={theme}>
          <ToastProvider>
            <StatusBar style="light" />
            <View style={{ flex: 1 }}>
              {/* Your navigation */}
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: theme.colors.surface },
                  headerTintColor: theme.colors.primary,
                  headerTitle: () => (
                    <Text
                      style={{
                        fontFamily: "DancingScript_700Bold",
                        fontSize: 28,
                        color: theme.colors.primary,
                      }}
                    >
                      Pocket Notes
                    </Text>
                  ),
                  headerTitleAlign: "left",
                  contentStyle: { backgroundColor: theme.colors.background },
                }}
              >
                <Stack.Screen
                  name="index"
                  options={{
                    headerRight: () => (
                      <IconButton
                        icon="cog"
                        size={28}
                        iconColor={theme.colors.primary}
                        onPress={() => router.push("/settings")}
                        style={{ marginRight: 8 }}
                      />
                    ),
                  }}
                />

                <Stack.Screen
                  name="add"
                  options={{
                    animation: "slide_from_bottom",
                    presentation: "card",
                    headerRight: () => <ShareButton />,
                  }}
                />

                <Stack.Screen name="settings" options={{ animation: "none" }} />
                <Stack.Screen name="Insights" options={{ animation: "none" }} />
              </Stack>

              {/* 🔒 Full-screen lock overlay (always above navigation) */}
              {isLocked && (
                <View style={[StyleSheet.absoluteFillObject, styles.lockScreenOverlay]}>
                  <Text style={styles.lockScreenTitle}>Pocket Notes</Text>
                  <Text style={styles.lockScreenMessage}>
                    App Locked. Authenticate to continue.
                  </Text>
                  <Button
                    mode="contained"
                    onPress={authenticateBiometrics}
                    style={[styles.unlockButton, { backgroundColor: theme.colors.primary }]}
                    labelStyle={styles.unlockButtonLabel}
                  >
                    Unlock
                  </Button>
                </View>
              )}
            </View>
          </ToastProvider>
        </PaperProvider>
      </ShareProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  lockScreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000, // ensure it's on top of everything
    elevation: 10000, // Android
  },
  lockScreenTitle: {
    fontFamily: "DancingScript_700Bold",
    fontSize: 48,
    color: "#FFD700",
    marginBottom: 20,
  },
  lockScreenMessage: {
    color: "#ffffff",
    marginBottom: 20,
    fontSize: 16,
  },
  unlockButton: {
    borderRadius: 8,
  },
  unlockButtonLabel: {
    color: "#000",
    fontWeight: "bold",
  },
});
